import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Principal } from '@rajyarank/auth';
import type { RegisterOrganization } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InvitationsService } from '../invitations/invitations.service';
import { AppError } from '../common/errors/app-error';

// Avoids visually ambiguous characters (0/O, 1/I/L) since staff read this
// aloud/type it in manually when sharing it with an institute.
const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateAccessCode(): string {
  const bytes = randomBytes(8);
  let out = '';
  for (const b of bytes) out += ACCESS_CODE_ALPHABET[b % ACCESS_CODE_ALPHABET.length];
  return out;
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invitations: InvitationsService,
  ) {}

  async list() {
    const orgs = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        head: { select: { displayName: true, email: true, phone: true } },
        _count: { select: { members: true } },
        // All Academic Heads attached to the org (an institution can have many).
        members: {
          where: { roles: { some: { role: { key: 'ACADEMIC_HEAD' } } }, deletedAt: null },
          select: { id: true, displayName: true, email: true, phone: true, status: true },
        },
      },
    });
    // Not-yet-accepted head invites, one query for every org at once rather
    // than N+1 per row.
    const pendingInvites = await this.prisma.staffInvitation.findMany({
      where: { roleKey: 'ACADEMIC_HEAD', orgId: { in: orgs.map((o) => o.id) }, status: { in: ['PENDING', 'EXPIRED'] } },
      select: { id: true, orgId: true, email: true, fullName: true },
    });
    return orgs.map((o) => {
      const heads = o.members.map((m) => ({ id: m.id, name: m.displayName, email: m.email, phone: m.phone, status: m.status }));
      return {
        id: o.id,
        name: o.name,
        code: o.code,
        accessCode: o.accessCode,
        status: o.status,
        headName: o.head?.displayName ?? heads[0]?.name ?? null,
        headEmail: o.head?.email ?? heads[0]?.email ?? null,
        headPhone: o.head?.phone ?? heads[0]?.phone ?? null,
        heads,
        pendingHeadInvites: pendingInvites.filter((i) => i.orgId === o.id).map((i) => ({ id: i.id, email: i.email, fullName: i.fullName })),
        memberCount: o._count.members,
        createdAt: o.createdAt.toISOString(),
      };
    });
  }

  /** Invite an additional Academic Head into an existing institution. */
  async inviteHead(actor: Principal, orgId: string, dto: { fullName: string; email: string; phone: string }, ctx: { ip?: string; ua?: string }) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw AppError.notFound('Institution not found.');
    const invite = await this.invitations.create(
      actor,
      { fullName: dto.fullName, email: dto.email, phone: dto.phone, roleKey: 'ACADEMIC_HEAD', assignments: [], orgId },
      ctx,
    );
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'org.head_invited',
      targetType: 'Organization',
      targetId: orgId,
      result: 'SUCCESS',
      after: { email: dto.email.toLowerCase() },
    });
    return { invitationId: invite.id };
  }

  /** Resend a head invitation — org.manage (e.g. Super Admin) doesn't hold
   *  user.invite, so it can't use the generic staff-invitations resend route
   *  even for a head invite it sent itself. Scoped to org + ACADEMIC_HEAD so
   *  an org.manage holder can't resend an arbitrary invitation by id. */
  async resendHeadInvite(actor: Principal, orgId: string, invitationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw AppError.notFound('Institution not found.');
    const invite = await this.prisma.staffInvitation.findUnique({ where: { id: invitationId } });
    if (!invite || invite.orgId !== orgId || invite.roleKey !== 'ACADEMIC_HEAD') {
      throw AppError.notFound('Invitation not found.');
    }
    const result = await this.invitations.resend(actor, invitationId);
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'org.head_invite_resent',
      targetType: 'Organization',
      targetId: orgId,
      result: 'SUCCESS',
      after: { email: invite.email },
    });
    return result;
  }

  /** Same org/role scoping as resendHeadInvite, but completes the invite
   *  immediately with an admin-chosen password instead of re-emailing a
   *  token. Non-production only — see InvitationsService.adminSetPasswordAndAccept. */
  async setHeadInvitePassword(actor: Principal, orgId: string, invitationId: string, password: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw AppError.notFound('Institution not found.');
    const invite = await this.prisma.staffInvitation.findUnique({ where: { id: invitationId } });
    if (!invite || invite.orgId !== orgId || invite.roleKey !== 'ACADEMIC_HEAD') {
      throw AppError.notFound('Invitation not found.');
    }
    const result = await this.invitations.adminSetPasswordAndAccept(actor, invitationId, password);
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'org.head_invite_password_set',
      targetType: 'Organization',
      targetId: orgId,
      result: 'SUCCESS',
      after: { email: invite.email },
    });
    return result;
  }

  /** Activate / deactivate (suspend) an institution. */
  async setStatus(actor: Principal, orgId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw AppError.notFound('Institution not found.');
    await this.prisma.organization.update({ where: { id: orgId }, data: { status } });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'org.status_change',
      targetType: 'Organization',
      targetId: orgId,
      result: 'SUCCESS',
      after: { status },
    });
    return { id: orgId, status };
  }

  /** Issue (or rotate) the institute's price-redemption code. Not a secret —
   *  shared with the institute to hand to students, like a coupon code. */
  async regenerateAccessCode(actor: Principal, orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw AppError.notFound('Institution not found.');
    let code = generateAccessCode();
    // Astronomically unlikely, but guard the unique constraint anyway.
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await this.prisma.organization.findUnique({ where: { accessCode: code } });
      if (!clash) break;
      code = generateAccessCode();
    }
    await this.prisma.organization.update({ where: { id: orgId }, data: { accessCode: code } });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'org.access_code_rotated',
      targetType: 'Organization',
      targetId: orgId,
      result: 'SUCCESS',
    });
    return { id: orgId, accessCode: code };
  }

  /** Self-serve referral stats for the calling Head's own institution —
   *  how many signups their ?ref=<accessCode> link actually attributed, and
   *  how many of those converted to a real paid entitlement. "Converted"
   *  means an ACTIVE entitlement with accessType PAID specifically (not
   *  TRIAL/SCHOLARSHIP/COUPON/ADMIN_GRANTED, and not REFUNDED/REVOKED/
   *  EXPIRED) — the clearest signal that a referral led to standing revenue. */
  async getReferralStats(actor: Principal) {
    if (!actor.orgId) throw AppError.conflict('You are not linked to an institution.');
    const org = await this.prisma.organization.findUnique({ where: { id: actor.orgId }, select: { accessCode: true } });
    const [totalReferredSignups, convertedSignups] = await Promise.all([
      this.prisma.user.count({ where: { referredByOrgId: actor.orgId, deletedAt: null } }),
      this.prisma.user.count({
        where: {
          referredByOrgId: actor.orgId,
          deletedAt: null,
          entitlements: { some: { accessType: 'PAID', status: 'ACTIVE' } },
        },
      }),
    ]);
    return { accessCode: org?.accessCode ?? null, totalReferredSignups, convertedSignups };
  }

  /** Delete an institution: detach members/courses, drop pending invites, remove the org. */
  async remove(actor: Principal, orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw AppError.notFound('Institution not found.');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { orgId }, data: { orgId: null } });
      await tx.course.updateMany({ where: { orgId }, data: { orgId: null } });
      await tx.staffAssignment.deleteMany({ where: { orgId } });
      await tx.staffInvitation.deleteMany({ where: { orgId } });
      await tx.organization.update({ where: { id: orgId }, data: { headUserId: null } });
      await tx.organization.delete({ where: { id: orgId } });
    });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'org.deleted',
      targetType: 'Organization',
      targetId: orgId,
      result: 'SUCCESS',
      after: { code: org.code },
    });
    return { ok: true };
  }

  /** Super Admin's read-only "View Institute" page — an oversight summary
   *  (KYC/subscription status, course-status breakdown, student/staff
   *  counts), not a full impersonation of the Academic Head's own dashboard.
   *  Deliberately doesn't expose per-student/per-course detail or any
   *  action — course.manage/user.manage stay off Super Admin's permission
   *  set (see packages/auth/src/permissions.ts), this only reads counts. */
  async getDetail(actor: Principal, orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw AppError.notFound('Institution not found.');

    const [linkedAccount, subscription, courseCounts, studentCount, staffCount] = await Promise.all([
      this.prisma.instituteLinkedAccount.findUnique({ where: { orgId } }),
      this.prisma.organizationSubscription.findUnique({ where: { orgId }, include: { plan: true } }),
      this.prisma.course.groupBy({ by: ['status'], where: { orgId, deletedAt: null }, _count: { status: true } }),
      this.prisma.user.count({ where: { orgId, kind: 'STUDENT', deletedAt: null } }),
      this.prisma.user.count({ where: { orgId, kind: 'STAFF', deletedAt: null } }),
    ]);

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'organizations.detail_viewed',
      targetType: 'Organization',
      targetId: orgId,
      result: 'SUCCESS',
    });

    return {
      id: org.id,
      name: org.name,
      code: org.code,
      status: org.status,
      createdAt: org.createdAt.toISOString(),
      kyc: linkedAccount ? { status: linkedAccount.kycStatus, payoutsEnabled: linkedAccount.payoutsEnabled } : null,
      subscription: subscription
        ? { planNameEn: subscription.plan.nameEn, status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null }
        : null,
      courseCountsByStatus: Object.fromEntries(courseCounts.map((c) => [c.status, c._count.status])),
      studentCount,
      staffCount,
    };
  }

  /** Super Admin registers an institution and invites its head (ACADEMIC_HEAD). */
  async register(actor: Principal, dto: RegisterOrganization, ctx: { ip?: string; ua?: string }) {
    const existing = await this.prisma.organization.findUnique({ where: { code: dto.code } });
    if (existing) throw AppError.conflict('An institution with this code already exists.');
    const org = await this.prisma.organization.create({
      data: { name: dto.name, code: dto.code, createdBy: actor.userId },
    });
    let invite: { id: string };
    try {
      invite = await this.invitations.create(
        actor,
        { fullName: dto.headFullName, email: dto.headEmail, phone: dto.headPhone, roleKey: 'ACADEMIC_HEAD', assignments: [], orgId: org.id },
        ctx,
      );
    } catch (e) {
      // The invite step can fail on validation we can't check up front (e.g.
      // duplicate email/phone) — don't leave a headless, orphaned institution
      // behind when that happens. Registering an institution is all-or-nothing.
      await this.prisma.organization.delete({ where: { id: org.id } });
      throw e;
    }
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'org.register',
      targetType: 'Organization',
      targetId: org.id,
      result: 'SUCCESS',
      after: { code: dto.code, headEmail: dto.headEmail.toLowerCase() },
    });
    return { id: org.id, code: org.code, invitationId: invite.id };
  }
}
