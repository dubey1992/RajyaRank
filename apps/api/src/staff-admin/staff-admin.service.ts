import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { AssignmentInput, StaffDetail, StaffListItem } from '@rajyarank/contracts';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthorizationService } from '../authz/authorization.service';
import { SessionService } from '../auth/session.service';
import { NotifierService } from '../notifications/notifier.service';
import { NotificationService } from '../notifications/notification.service';
import { staffForcedPasswordResetEmail, staffAccountStatusChangedEmail } from '../notifications/email-templates/staff';
import { AppError } from '../common/errors/app-error';

@Injectable()
export class StaffAdminService {
  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationService,
    private readonly sessions: SessionService,
    private readonly notifier: NotifierService,
    private readonly notifications: NotificationService,
  ) {}

  async list(actor: Principal, search?: string): Promise<StaffListItem[]> {
    const orgFilter = actor.isSuperAdmin ? {} : { orgId: actor.orgId ?? '__none__' };
    const [users, invitations] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          kind: 'STAFF',
          deletedAt: null,
          // Tenant isolation: an org-scoped actor sees only their institution's staff.
          ...orgFilter,
          ...(search
            ? { OR: [{ email: { contains: search, mode: 'insensitive' } }, { displayName: { contains: search, mode: 'insensitive' } }] }
            : {}),
        },
        include: { roles: { include: { role: true } }, staffProfile: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      // Not-yet-accepted invites — no User row exists for these yet, so they'd
      // otherwise vanish from the list entirely between "invitation sent" and
      // the invitee actually setting up their account.
      this.prisma.staffInvitation.findMany({
        where: {
          status: 'PENDING',
          expiresAt: { gt: new Date() },
          ...orgFilter,
          ...(search ? { email: { contains: search, mode: 'insensitive' } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    // Batch-resolve which org each listed user's institution considers its
    // primary (accepted) Academic Head, so that row's status/revoke controls
    // can be hidden — disabling the org's own head from its own staff screen
    // would orphan the institution.
    const orgIds = [...new Set(users.map((u) => u.orgId).filter((id): id is string => !!id))];
    const orgs = orgIds.length
      ? await this.prisma.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, headUserId: true } })
      : [];
    const headUserIdByOrg = new Map(orgs.map((o) => [o.id, o.headUserId]));

    const userRows: StaffListItem[] = users.map((u) => ({
      id: u.id,
      fullName: u.staffProfile?.fullName ?? u.displayName ?? '',
      email: u.email ?? '',
      phone: u.phone,
      roleKeys: u.roles.map((r) => r.role.key) as StaffListItem['roleKeys'],
      status: u.status,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      isPrimaryHead: !!u.orgId && headUserIdByOrg.get(u.orgId) === u.id,
    }));
    const invitationRows: StaffListItem[] = invitations.map((inv) => ({
      id: inv.id,
      fullName: inv.fullName,
      email: inv.email,
      phone: inv.phone,
      roleKeys: [inv.roleKey] as StaffListItem['roleKeys'],
      status: 'INVITED',
      lastLoginAt: null,
    }));
    return [...invitationRows, ...userRows];
  }

  async getOne(actor: Principal, id: string): Promise<StaffDetail> {
    const u = await this.prisma.user.findFirst({
      where: {
        id,
        kind: 'STAFF',
        deletedAt: null,
        ...(actor.isSuperAdmin ? {} : { orgId: actor.orgId ?? '__none__' }),
      },
      include: {
        roles: { include: { role: true } },
        staffProfile: true,
        assignments: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!u) throw AppError.notFound('Staff member not found.');
    return {
      id: u.id,
      fullName: u.staffProfile?.fullName ?? u.displayName ?? '',
      email: u.email ?? '',
      phone: u.phone,
      roleKeys: u.roles.map((r) => r.role.key) as StaffDetail['roleKeys'],
      status: u.status,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      assignments: u.assignments.map((a) => ({
        id: a.id,
        scope: a.scope,
        stateId: a.stateId,
        examId: a.examId,
        courseId: a.courseId,
        subjectId: a.subjectId,
        batchId: a.batchId,
      })),
    };
  }

  async patchStatus(actor: Principal, id: string, status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED', reason?: string) {
    const user = await this.requireStaff(id);
    await this.prisma.user.update({ where: { id }, data: { status } });
    await this.authz.invalidate(id);
    if (status !== 'ACTIVE') await this.sessions.revokeAll(id);
    if (status === 'ACTIVE' || status === 'SUSPENDED') {
      await this.notifications.emit({
        userId: id,
        category: 'SECURITY',
        titleHi: status === 'SUSPENDED' ? 'खाता निलंबित' : 'खाता पुनः सक्रिय',
        titleEn: status === 'SUSPENDED' ? 'Account suspended' : 'Account reactivated',
        bodyHi: status === 'SUSPENDED' ? 'आपका खाता निलंबित कर दिया गया है।' : 'आपका खाता पुनः सक्रिय कर दिया गया है।',
        bodyEn: status === 'SUSPENDED' ? 'Your account has been suspended.' : 'Your account has been reactivated.',
        email: (locale) => staffAccountStatusChangedEmail(locale, status),
      });
    }
    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roleKeys.join(','),
      action: 'staff.status_change',
      targetType: 'User',
      targetId: id,
      result: 'SUCCESS',
      before: { status: user.status },
      after: { status, reason: reason ?? null },
    });
    return { id, status };
  }

  async setAssignments(actor: Principal, id: string, assignments: AssignmentInput[]) {
    await this.requireStaff(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.staffAssignment.updateMany({ where: { userId: id, deletedAt: null }, data: { deletedAt: new Date() } });
      if (assignments.length) {
        await tx.staffAssignment.createMany({
          data: assignments.map((a) => ({
            userId: id,
            scope: a.scope,
            stateId: a.stateId ?? null,
            examId: a.examId ?? null,
            courseId: a.courseId ?? null,
            subjectId: a.subjectId ?? null,
            batchId: a.batchId ?? null,
            createdBy: actor.userId,
          })),
        });
      }
    });
    await this.authz.invalidate(id);
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'staff.assignment_change',
      targetType: 'User',
      targetId: id,
      result: 'SUCCESS',
      after: { count: assignments.length },
    });
    return { id, assignments: assignments.length };
  }

  async forcePasswordReset(actor: Principal, id: string) {
    const user = await this.requireStaff(id);
    await this.sessions.revokeAll(id);
    const { subject, html } = staffForcedPasswordResetEmail('en', `${this.env.ADMIN_PUBLIC_URL}/admin/login`);
    await this.notifier.sendEmail({ to: user.email ?? '', subject, html, locale: 'en' });
    await this.audit.record({ actorUserId: actor.userId, action: 'staff.force_password_reset', targetType: 'User', targetId: id, result: 'SUCCESS' });
    return { id };
  }

  async revokeSessions(actor: Principal, id: string) {
    await this.requireStaff(id);
    await this.sessions.revokeAll(id);
    await this.authz.invalidate(id);
    await this.audit.record({ actorUserId: actor.userId, action: 'staff.revoke_sessions', targetType: 'User', targetId: id, result: 'SUCCESS' });
    return { id };
  }

  async roles() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { key: 'asc' },
    });
  }

  async permissions() {
    return this.prisma.permission.findMany({ orderBy: { code: 'asc' } });
  }

  /** Super Admin's Permission Matrix write path — the one place RolePermission
   *  rows (the live authorization source of truth, see AuthorizationService)
   *  actually change. SUPER_ADMIN and STUDENT are locked server-side, not just
   *  hidden in the UI: SUPER_ADMIN to prevent editing your own access away from
   *  the very screen that controls it, STUDENT because it has no admin nav and
   *  holds no permissions by design. */
  async updateRolePermissions(actor: Principal, roleId: string, permissionCodes: string[]) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw AppError.notFound('Role not found.');
    if (role.key === 'SUPER_ADMIN' || role.key === 'STUDENT') {
      throw AppError.permissionDenied(`The ${role.key} role's permissions cannot be edited from this screen.`);
    }

    const before = role.permissions.map((rp) => rp.permission.code).sort();
    const after = [...new Set(permissionCodes)].sort();

    const permissions = await this.prisma.permission.findMany({ where: { code: { in: after } } });
    const foundCodes = new Set(permissions.map((p) => p.code));
    const unknown = after.filter((c) => !foundCodes.has(c));
    if (unknown.length) throw AppError.conflict(`Unknown permission code(s): ${unknown.join(', ')}`);

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId, permission: { code: { notIn: after } } } }),
      ...permissions.map((p) =>
        this.prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId: p.id } },
          update: {},
          create: { roleId, permissionId: p.id },
        }),
      ),
    ]);
    await this.authz.invalidateRole(roleId);
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'role.permissions_updated',
      targetType: 'Role',
      targetId: roleId,
      result: 'SUCCESS',
      before: { permissionCodes: before },
      after: { permissionCodes: after },
    });
    return { id: roleId, key: role.key, permissionCodes: after };
  }

  async auditEvents(action?: string, orgId?: string) {
    // Institution filter: restrict to actions performed by members of that org.
    let actorIds: string[] | undefined;
    if (orgId) {
      const members = await this.prisma.user.findMany({ where: { orgId }, select: { id: true } });
      actorIds = members.map((u) => u.id);
    }
    const events = await this.prisma.auditLog.findMany({
      where: {
        ...(action ? { action: { contains: action } } : {}),
        ...(actorIds ? { actorUserId: { in: actorIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return events.map((e) => ({
      id: e.id,
      actorUserId: e.actorUserId,
      actorRole: e.actorRole,
      action: e.action,
      targetType: e.targetType,
      targetId: e.targetId,
      result: e.result,
      reasonCode: e.reasonCode,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  private async requireStaff(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, kind: 'STAFF', deletedAt: null } });
    if (!user) throw AppError.notFound('Staff member not found.');
    return user;
  }
}
