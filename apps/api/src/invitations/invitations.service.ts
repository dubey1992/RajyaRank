import { Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { AcceptInvitation, CreateInvitation, InvitationPreview } from '@rajyarank/contracts';
import type { Principal, RoleKey } from '@rajyarank/auth';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotifierService } from '../notifications/notifier.service';
import { NotificationService } from '../notifications/notification.service';
import { staffInvitedEmail, staffInviteResentEmail, staffInviteAcceptedEmail, staffInviteRevokedEmail } from '../notifications/email-templates/staff';
import { randomToken, sha256 } from '../common/crypto.util';
import { AppError } from '../common/errors/app-error';

interface AssignmentPayload {
  scope: 'ORG' | 'STATE' | 'EXAM' | 'COURSE' | 'SUBJECT' | 'BATCH';
  stateId?: string;
  examId?: string;
  courseId?: string;
  subjectId?: string;
  batchId?: string;
}

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifier: NotifierService,
    private readonly notifications: NotificationService,
  ) {}

  async create(actor: Principal, dto: CreateInvitation, ctx: { ip?: string; ua?: string }) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findFirst({ where: { email, kind: 'STAFF', deletedAt: null } });
    if (existing) throw AppError.conflict('A staff account with this email already exists.');
    // Was only checking the User table above — a second (or fifth) invite to
    // the same not-yet-accepted email created a new StaffInvitation every
    // time with no error, since there was no account yet to collide with.
    const existingInvite = await this.prisma.staffInvitation.findFirst({
      where: { email, status: 'PENDING', expiresAt: { gt: new Date() } },
    });
    if (existingInvite) throw AppError.conflict('An invitation has already been sent to this email. Use "Resend" on that invitation instead.');
    // Same collision check for phone — mirrors the email check above (the DB's
    // @@unique([kind, phone]) is the final backstop, this just gives a clean
    // message instead of a raw constraint error).
    const existingPhone = await this.prisma.user.findFirst({ where: { phone: dto.phone, kind: 'STAFF', deletedAt: null } });
    if (existingPhone) throw AppError.conflict('A staff account with this phone number already exists.');
    const existingPhoneInvite = await this.prisma.staffInvitation.findFirst({
      where: { phone: dto.phone, status: 'PENDING', expiresAt: { gt: new Date() } },
    });
    if (existingPhoneInvite) throw AppError.conflict('An invitation has already been sent to this phone number.');

    // Tenant rules: Super Admin may target any org (or none); an Institution
    // Head can only invite into their own org, may invite a co-Head for that
    // same institution (an org can have more than one Academic Head), but can
    // never mint a Super Admin.
    let orgId = actor.isSuperAdmin ? dto.orgId : actor.orgId;
    if (!actor.isSuperAdmin) {
      if (!actor.orgId) throw AppError.permissionDenied('You are not attached to an institution.');
      if (dto.roleKey === 'SUPER_ADMIN') {
        throw AppError.permissionDenied('You cannot invite that role.');
      }
      orgId = actor.orgId;
    }

    const rawToken = randomToken();
    const hours = dto.expiresInHours ?? this.env.INVITATION_TTL_HOURS;
    const invitation = await this.prisma.staffInvitation.create({
      data: {
        email,
        phone: dto.phone,
        fullName: dto.fullName,
        roleKey: dto.roleKey,
        orgId: orgId ?? null,
        assignments: dto.assignments as unknown as object,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + hours * 3_600_000),
        invitedBy: actor.userId,
      },
    });

    await this.sendInviteEmail(email, dto.fullName, dto.roleKey, rawToken, false);
    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roleKeys.join(','),
      action: 'staff.invite',
      targetType: 'StaffInvitation',
      targetId: invitation.id,
      result: 'SUCCESS',
      after: { email, roleKey: dto.roleKey },
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
    return { id: invitation.id };
  }

  async preview(token: string): Promise<InvitationPreview> {
    const inv = await this.liveInvitationByToken(token);
    return {
      fullName: inv.fullName,
      email: inv.email,
      roleKey: inv.roleKey as InvitationPreview['roleKey'],
      expiresAt: inv.expiresAt.toISOString(),
    };
  }

  async accept(dto: AcceptInvitation): Promise<{ userId: string; mfaSetupRequired: boolean }> {
    const inv = await this.liveInvitationByToken(dto.token);
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const role = await this.prisma.role.findUniqueOrThrow({ where: { key: inv.roleKey } });
    const assignments = (inv.assignments as unknown as AssignmentPayload[]) ?? [];
    const highRiskRole = inv.roleKey === 'SUPER_ADMIN' || inv.roleKey === 'CONTENT_ADMIN' || inv.roleKey === 'ACADEMIC_HEAD';

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          kind: 'STAFF',
          status: 'ACTIVE',
          email: inv.email,
          emailVerified: true,
          phone: inv.phone,
          passwordHash,
          displayName: inv.fullName,
          orgId: inv.orgId ?? null,
          staffProfile: { create: { fullName: inv.fullName, workEmail: inv.email, invitedBy: inv.invitedBy } },
          roles: { create: { roleId: role.id, createdBy: inv.invitedBy } },
        },
      });
      // Bind the user to their institution via an ORG-scope assignment (+ any
      // captured finer-grained assignments, all stamped with the org).
      const rows = assignments.map((a) => ({
        userId: created.id,
        scope: a.scope,
        orgId: inv.orgId ?? null,
        stateId: a.stateId ?? null,
        examId: a.examId ?? null,
        courseId: a.courseId ?? null,
        subjectId: a.subjectId ?? null,
        batchId: a.batchId ?? null,
        createdBy: inv.invitedBy,
      }));
      if (inv.orgId) rows.push({ userId: created.id, scope: 'ORG', orgId: inv.orgId, stateId: null, examId: null, courseId: null, subjectId: null, batchId: null, createdBy: inv.invitedBy });
      if (rows.length) await tx.staffAssignment.createMany({ data: rows });
      // The first accepted Head becomes the org's designated primary contact
      // (Organization.headUserId — used for billing/KYC contact fallback and
      // the admin org listing's display name). An org can have more than one
      // Academic Head; only fill this in if nobody holds it yet, so inviting
      // a co-Head doesn't silently reassign the primary contact away from
      // whoever's already there.
      if (inv.roleKey === 'ACADEMIC_HEAD' && inv.orgId) {
        await tx.organization.updateMany({ where: { id: inv.orgId, headUserId: null }, data: { headUserId: created.id } });
      }
      await tx.staffInvitation.update({
        where: { id: inv.id },
        data: { status: 'ACCEPTED', acceptedUserId: created.id },
      });
      return created;
    });

    await this.audit.record({
      actorUserId: user.id,
      action: 'staff.invite.accept',
      targetType: 'User',
      targetId: user.id,
      result: 'SUCCESS',
      after: { roleKey: inv.roleKey, assignments: assignments.length },
    });
    await this.notifications.emit({
      userId: user.id,
      category: 'SECURITY',
      titleHi: 'RajyaRank में आपका स्वागत है',
      titleEn: 'Welcome to RajyaRank',
      bodyHi: 'आपका खाता सफलतापूर्वक सेट हो गया है।',
      bodyEn: 'Your account has been set up successfully.',
      email: (locale) => staffInviteAcceptedEmail(locale, inv.fullName, `${this.env.ADMIN_PUBLIC_URL}/admin/login`),
    });
    return { userId: user.id, mfaSetupRequired: highRiskRole };
  }

  async resend(actor: Principal, id: string) {
    const inv = await this.prisma.staffInvitation.findUnique({ where: { id } });
    if (!inv || inv.status !== 'PENDING') throw AppError.notFound('Invitation not found.');
    const rawToken = randomToken();
    await this.prisma.staffInvitation.update({
      where: { id },
      data: {
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + this.env.INVITATION_TTL_HOURS * 3_600_000),
      },
    });
    await this.sendInviteEmail(inv.email, inv.fullName, inv.roleKey as RoleKey, rawToken, true);
    await this.audit.record({ actorUserId: actor.userId, action: 'staff.invite.resend', targetType: 'StaffInvitation', targetId: id, result: 'SUCCESS' });
    return { id };
  }

  async revoke(actor: Principal, id: string) {
    const inv = await this.prisma.staffInvitation.findUnique({ where: { id } });
    if (!inv || inv.status !== 'PENDING') throw AppError.notFound('Invitation not found.');
    await this.prisma.staffInvitation.update({ where: { id }, data: { status: 'REVOKED', revokedAt: new Date() } });
    const { subject, html } = staffInviteRevokedEmail('en', inv.fullName);
    await this.notifier.sendEmail({ to: inv.email, subject, html, locale: 'en' });
    await this.audit.record({ actorUserId: actor.userId, action: 'staff.invite.revoke', targetType: 'StaffInvitation', targetId: id, result: 'SUCCESS' });
    return { id };
  }

  private async liveInvitationByToken(token: string) {
    const inv = await this.prisma.staffInvitation.findUnique({ where: { tokenHash: sha256(token) } });
    if (!inv || inv.status === 'REVOKED' || inv.status === 'ACCEPTED') throw AppError.invitationInvalid();
    if (inv.status === 'EXPIRED' || inv.expiresAt.getTime() < Date.now()) {
      if (inv.status === 'PENDING') {
        await this.prisma.staffInvitation.update({ where: { id: inv.id }, data: { status: 'EXPIRED' } });
      }
      throw AppError.invitationExpired();
    }
    return inv;
  }

  private async sendInviteEmail(email: string, name: string, roleKey: string, rawToken: string, isResend: boolean) {
    const link = `${this.env.ADMIN_PUBLIC_URL}/invitations/${rawToken}`;
    const { subject, html } = isResend ? staffInviteResentEmail('en', name, roleKey, link) : staffInvitedEmail('en', name, roleKey, link);
    await this.notifier.sendEmail({ to: email, subject, html, locale: 'en' });
  }
}
