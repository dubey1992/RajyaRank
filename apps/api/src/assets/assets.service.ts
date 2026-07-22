import { Injectable } from '@nestjs/common';
import { ASSET_LIMITS, type UploadIntent, type UploadIntentResponse, type CreateEmbedAsset } from '@rajyarank/contracts';
import type { Principal } from '@rajyarank/auth';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { AuditService } from '../audit/audit.service';
import { AssetScanService } from './asset-scan.service';
import { AppError } from '../common/errors/app-error';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly audit: AuditService,
    private readonly scanner: AssetScanService,
  ) {}

  /** Validate the request, create the asset row, and return a presigned PUT URL. */
  async createIntent(principal: Principal, dto: UploadIntent): Promise<UploadIntentResponse> {
    const limit = ASSET_LIMITS[dto.assetType];
    if (!(limit.mime as readonly string[]).includes(dto.mimeType)) {
      throw AppError.conflict(`Unsupported MIME type for ${dto.assetType}: ${dto.mimeType}`);
    }
    if (dto.sizeBytes > limit.maxBytes) {
      throw AppError.conflict(`File exceeds the maximum size for ${dto.assetType}.`);
    }

    const safeName = dto.fileName.replace(/[^\w.-]+/g, '_').slice(0, 120);
    const asset = await this.prisma.mediaAsset.create({
      data: {
        ownerUserId: principal.userId,
        assetType: dto.assetType,
        status: 'UPLOADING',
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
      },
    });
    const storageKey = `uploads/${asset.id}/${safeName}`;
    await this.prisma.mediaAsset.update({ where: { id: asset.id }, data: { storageKey } });

    const uploadUrl = await this.s3.presignPut(storageKey, dto.mimeType, 900);
    return { assetId: asset.id, uploadUrl, storageKey, expiresInSeconds: 900 };
  }

  /**
   * Called after the client PUTs the file. Runs the malware/validity scan
   * synchronously and flips to READY or QUARANTINED. No transcoding worker
   * exists yet to progress a video past an intermediate PROCESSING state, so
   * video assets go straight to READY like every other asset type — revisit
   * once a transcoding pipeline lands and can own that transition.
   */
  async complete(principal: Principal, assetId: string, checksum?: string) {
    const asset = await this.requireOwned(principal, assetId);

    // Malware / validity scan hook — quarantine on failure (§25).
    const scan = await this.scanner.scan({ assetType: asset.assetType, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes });
    if (scan.verdict === 'INFECTED') {
      await this.prisma.mediaAsset.update({ where: { id: asset.id }, data: { status: 'QUARANTINED' } });
      await this.audit.record({
        actorUserId: principal.userId,
        action: 'asset.quarantined',
        targetType: 'MediaAsset',
        targetId: asset.id,
        result: 'FAILED',
        after: { detail: scan.detail ?? null },
      });
      throw AppError.conflict('Upload failed a security scan and was quarantined.');
    }

    const updated = await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { status: 'READY', checksum: checksum ?? null },
    });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'asset.upload_complete',
      targetType: 'MediaAsset',
      targetId: asset.id,
      result: 'SUCCESS',
      after: { status: 'READY' },
    });
    return { id: updated.id, status: updated.status };
  }

  /**
   * Free-preview-only video source: a MediaAsset backed by an external embed URL
   * instead of S3. No presign, no scan, no separate complete step — ready synchronously.
   * Paid-content enforcement happens where the asset is attached to a lesson version
   * (content-workflow.service.ts attachAsset), not here.
   */
  async createEmbedAsset(principal: Principal, dto: CreateEmbedAsset) {
    const asset = await this.prisma.mediaAsset.create({
      data: {
        ownerUserId: principal.userId,
        assetType: dto.assetType,
        provider: 'embed',
        embedUrl: dto.embedUrl,
        status: 'READY',
        mimeType: 'text/uri-list',
      },
    });
    await this.audit.record({
      actorUserId: principal.userId,
      action: 'asset.embed_created',
      targetType: 'MediaAsset',
      targetId: asset.id,
      result: 'SUCCESS',
      after: { embedUrl: dto.embedUrl },
    });
    return { id: asset.id, status: asset.status };
  }

  async status(principal: Principal, assetId: string) {
    const asset = await this.requireOwned(principal, assetId);
    return { id: asset.id, status: asset.status, assetType: asset.assetType };
  }

  /** The staff member's own reusable asset library — lets the content
   *  wizard offer "use existing" instead of forcing a fresh upload every
   *  time. Scoped to READY + owner-only: assets carry no org/tenant field
   *  today, so cross-staff sharing isn't safe to expose yet. */
  async listMine(principal: Principal, assetType?: 'VIDEO' | 'AUDIO' | 'IMAGE' | 'DOCUMENT') {
    return this.prisma.mediaAsset.findMany({
      where: { ownerUserId: principal.userId, status: 'READY', ...(assetType ? { assetType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, assetType: true, mimeType: true, sizeBytes: true, storageKey: true, embedUrl: true, createdAt: true },
    });
  }

  private async requireOwned(principal: Principal, assetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw AppError.notFound('Asset not found.');
    if (asset.ownerUserId !== principal.userId) {
      throw AppError.permissionDenied('You do not own this asset.');
    }
    return asset;
  }
}
