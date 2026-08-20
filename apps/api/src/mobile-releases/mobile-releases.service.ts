import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import {
  MOBILE_APP_RELEASE_LIMITS,
  type CreateMobileReleaseIntent,
  type MobileReleaseUploadIntentResponse,
  type MobileAppReleaseView,
  type MobileAppLatestReleaseView,
  type MobileAppPlatform,
} from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';

@Injectable()
export class MobileReleasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly audit: AuditService,
  ) {}

  /** Validate the request, create the DRAFT row, and return a presigned PUT URL
   *  — same two-step upload pattern as AssetsService.createIntent. */
  async createUploadIntent(principal: Principal, dto: CreateMobileReleaseIntent): Promise<MobileReleaseUploadIntentResponse> {
    const limit = MOBILE_APP_RELEASE_LIMITS[dto.platform];
    if (!(limit.mime as readonly string[]).includes(dto.mimeType)) {
      throw AppError.conflict(`Unsupported file type for ${dto.platform}: ${dto.mimeType}`);
    }
    if (dto.sizeBytes > limit.maxBytes) {
      throw AppError.conflict(`File exceeds the maximum size for ${dto.platform}.`);
    }
    const existing = await this.prisma.mobileAppRelease.findUnique({
      where: { platform_versionCode: { platform: dto.platform, versionCode: dto.versionCode } },
    });
    if (existing) throw AppError.conflict(`Version code ${dto.versionCode} already exists for ${dto.platform}.`);

    const release = await this.prisma.mobileAppRelease.create({
      data: {
        platform: dto.platform,
        versionName: dto.versionName,
        versionCode: dto.versionCode,
        releaseNotesHi: dto.releaseNotesHi ?? null,
        releaseNotesEn: dto.releaseNotesEn ?? null,
        sizeBytes: dto.sizeBytes,
        status: 'UPLOADING',
        createdBy: principal.userId,
      },
    });
    const safeName = dto.fileName.replace(/[^\w.-]+/g, '_').slice(0, 120);
    const storageKey = `app-releases/${release.id}/${safeName}`;
    await this.prisma.mobileAppRelease.update({ where: { id: release.id }, data: { storageKey } });

    const uploadUrl = await this.s3.presignPut(storageKey, dto.mimeType, 900);
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'mobile_release.upload_started',
      targetType: 'MobileAppRelease',
      targetId: release.id,
      result: 'SUCCESS',
      after: { platform: dto.platform, versionName: dto.versionName, versionCode: dto.versionCode },
    });
    return { releaseId: release.id, uploadUrl, expiresInSeconds: 900 };
  }

  /** Called after the client PUTs the file — confirms the upload finished
   *  before the release becomes eligible to publish. */
  async complete(principal: Principal, id: string): Promise<MobileAppReleaseView> {
    const release = await this.require(id);
    if (release.status !== 'UPLOADING') {
      throw AppError.conflict('This release is not awaiting an upload.');
    }
    const updated = await this.prisma.mobileAppRelease.update({ where: { id }, data: { status: 'READY' } });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'mobile_release.upload_complete',
      targetType: 'MobileAppRelease',
      targetId: id,
      result: 'SUCCESS',
    });
    return toView(updated);
  }

  /** At most one PUBLISHED release per platform — publishing this one
   *  supersedes (archives, doesn't delete) whatever was previously published,
   *  same "supersede, don't overwrite" approach as StudyPlan's ACTIVE row. */
  async publish(principal: Principal, id: string): Promise<MobileAppReleaseView> {
    const release = await this.require(id);
    if (release.status !== 'READY') {
      throw AppError.conflict('Only a fully-uploaded release can be published.');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.mobileAppRelease.updateMany({
        where: { platform: release.platform, status: 'PUBLISHED' },
        data: { status: 'ARCHIVED' },
      });
      return tx.mobileAppRelease.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
    });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'mobile_release.published',
      targetType: 'MobileAppRelease',
      targetId: id,
      result: 'SUCCESS',
      after: { platform: release.platform, versionName: release.versionName, versionCode: release.versionCode },
    });
    return toView(updated);
  }

  /** Withdraws a release (READY or PUBLISHED) without deleting its history. */
  async archive(principal: Principal, id: string): Promise<MobileAppReleaseView> {
    const release = await this.require(id);
    if (release.status !== 'READY' && release.status !== 'PUBLISHED') {
      throw AppError.conflict('This release cannot be archived from its current state.');
    }
    const updated = await this.prisma.mobileAppRelease.update({ where: { id }, data: { status: 'ARCHIVED' } });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'mobile_release.archived',
      targetType: 'MobileAppRelease',
      targetId: id,
      result: 'SUCCESS',
    });
    return toView(updated);
  }

  async list(): Promise<MobileAppReleaseView[]> {
    const rows = await this.prisma.mobileAppRelease.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    return rows.map(toView);
  }

  /** Public: the marketing page's download button. Never a permanent public
   *  S3 URL — a fresh short-lived presigned GET is minted on every request,
   *  matching how every other protected asset in this codebase is served. */
  async latestPublished(platform: MobileAppPlatform): Promise<MobileAppLatestReleaseView | null> {
    const release = await this.prisma.mobileAppRelease.findFirst({
      where: { platform, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
    });
    if (!release || !release.storageKey) return null;
    const downloadUrl = await this.s3.presignGet(release.storageKey, 600);
    return {
      versionName: release.versionName,
      releaseNotesHi: release.releaseNotesHi,
      releaseNotesEn: release.releaseNotesEn,
      sizeBytes: release.sizeBytes,
      publishedAt: (release.publishedAt ?? release.createdAt).toISOString(),
      downloadUrl,
    };
  }

  private async require(id: string) {
    const release = await this.prisma.mobileAppRelease.findUnique({ where: { id } });
    if (!release) throw AppError.notFound('Release not found.');
    return release;
  }
}

function toView(r: {
  id: string;
  platform: string;
  versionName: string;
  versionCode: number;
  releaseNotesHi: string | null;
  releaseNotesEn: string | null;
  sizeBytes: number;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
}): MobileAppReleaseView {
  return {
    id: r.id,
    platform: r.platform as MobileAppReleaseView['platform'],
    versionName: r.versionName,
    versionCode: r.versionCode,
    releaseNotesHi: r.releaseNotesHi,
    releaseNotesEn: r.releaseNotesEn,
    sizeBytes: r.sizeBytes,
    status: r.status as MobileAppReleaseView['status'],
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}
