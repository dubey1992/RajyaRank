import { Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Principal } from '@rajyarank/auth';
import type { EnrollStudent, StudentListItem } from '@rajyarank/contracts';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthorizationService } from '../authz/authorization.service';
import { SessionService } from '../auth/session.service';
import { NotifierService } from '../notifications/notifier.service';
import { NotificationService } from '../notifications/notification.service';
import { studentAccountStatusChangedEmail, studentForcedPasswordResetEmail } from '../notifications/email-templates/auth';
import { AppError } from '../common/errors/app-error';

/**
 * Institution-scoped student roster. An Institution Head enrolls students
 * into their org with email+password login set up directly (no self-serve
 * step for the student). Super Admin sees all students.
 */
@Injectable()
export class StudentsService {
  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationService,
    private readonly sessions: SessionService,
    private readonly notifier: NotifierService,
    private readonly notifications: NotificationService,
  ) {}

  private orgScoped(actor: Principal): boolean {
    return !actor.isSuperAdmin && !!actor.orgId;
  }

  async list(actor: Principal, search?: string): Promise<StudentListItem[]> {
    const students = await this.prisma.user.findMany({
      where: {
        kind: 'STUDENT',
        deletedAt: null,
        ...(this.orgScoped(actor) ? { orgId: actor.orgId } : {}),
        ...(search
          ? { OR: [{ phone: { contains: search } }, { displayName: { contains: search, mode: 'insensitive' } }] }
          : {}),
      },
      include: { studentProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return students.map((u) => ({
      id: u.id,
      fullName: u.studentProfile?.fullName ?? u.displayName ?? '',
      phone: u.phone ?? '',
      email: u.email,
      status: u.status,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    }));
  }

  async enroll(actor: Principal, dto: EnrollStudent): Promise<StudentListItem> {
    const orgId = actor.orgId ?? null;
    if (!actor.isSuperAdmin && !orgId) throw AppError.permissionDenied('You are not attached to an institution.');

    const existing = await this.prisma.user.findFirst({
      where: { kind: 'STUDENT', phone: dto.phone },
      include: { studentProfile: true },
    });
    if (existing && existing.orgId && existing.orgId !== orgId) {
      throw AppError.conflict('This student is already enrolled in another institution.');
    }

    // Guard against silently renaming a different real person who happens to
    // share this phone number — only treat it as "the same student" (and
    // proceed to update them) when the name matches or none was set yet.
    const existingName = existing?.studentProfile?.fullName ?? existing?.displayName ?? null;
    if (existing && existingName && existingName.trim().toLowerCase() !== dto.fullName.trim().toLowerCase()) {
      throw AppError.conflict(
        `This mobile number is already registered to a different student ("${existingName}"). Please double-check the number.`,
      );
    }

    const email = dto.email.toLowerCase();
    const emailTaken = await this.prisma.user.findFirst({
      where: { kind: 'STUDENT', email, deletedAt: null, id: existing ? { not: existing.id } : undefined },
    });
    if (emailTaken) throw AppError.conflict('A student account with this email already exists.');
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const wasUnaffiliatedReattach = !!existing && !existing.orgId;
    const studentRole = await this.prisma.role.findUniqueOrThrow({ where: { key: 'STUDENT' } });
    // Head-enrolled students skip the generic self-serve onboarding form (state
    // / target exam / qualification / daily minutes) — their institution has
    // already vouched for them, same trust rationale as emailVerified below.
    // Without this they'd land on /onboarding right after their first login
    // (looking like login silently failed) instead of their dashboard; they
    // can still set study goals later from Account Settings.
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            orgId,
            displayName: existing.displayName ?? dto.fullName,
            studentProfile: {
              upsert: {
                create: { fullName: dto.fullName, onboardedAt: new Date() },
                update: { fullName: dto.fullName, onboardedAt: new Date() },
              },
            },
            // Head-attested — same trust rationale as staff invite-accept setting emailVerified: true.
            email,
            emailVerified: true,
            passwordHash,
          },
          include: { studentProfile: true },
        })
      : await this.prisma.user.create({
          data: {
            kind: 'STUDENT',
            status: 'ACTIVE',
            phone: dto.phone,
            orgId,
            displayName: dto.fullName,
            studentProfile: { create: { fullName: dto.fullName, onboardedAt: new Date() } },
            roles: { create: { roleId: studentRole.id } },
            email,
            emailVerified: true,
            passwordHash,
          },
          include: { studentProfile: true },
        });

    await this.audit.record({
      actorUserId: actor.userId,
      action: 'student.enroll',
      targetType: 'User',
      targetId: user.id,
      result: 'SUCCESS',
      after: { orgId, loginMethod: 'email_password', reattachedExistingAccount: wasUnaffiliatedReattach },
    });
    return {
      id: user.id,
      fullName: user.studentProfile?.fullName ?? dto.fullName,
      phone: user.phone ?? dto.phone,
      email: user.email,
      status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      reattached: wasUnaffiliatedReattach,
    };
  }

  async patchStatus(actor: Principal, id: string, status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED', reason?: string) {
    const student = await this.requireStudent(actor, id);
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
        email: (locale) => studentAccountStatusChangedEmail(locale, status),
      });
    }
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'student.status_change',
      targetType: 'User',
      targetId: id,
      result: 'SUCCESS',
      before: { status: student.status },
      after: { status, reason: reason ?? null },
    });
    return { id, status };
  }

  async forcePasswordReset(actor: Principal, id: string) {
    const student = await this.requireStudent(actor, id);
    if (!student.email) throw AppError.conflict('This student has no email & password login set up.');
    await this.sessions.revokeAll(id);
    const { subject, html } = studentForcedPasswordResetEmail('en', `${this.env.WEB_PUBLIC_URL}/en/forgot-password`);
    await this.notifier.sendEmail({ to: student.email, subject, html, locale: 'en' });
    await this.audit.record({ actorUserId: actor.userId, action: 'student.force_password_reset', targetType: 'User', targetId: id, result: 'SUCCESS' });
    return { id };
  }

  async revokeSessions(actor: Principal, id: string) {
    await this.requireStudent(actor, id);
    await this.sessions.revokeAll(id);
    await this.authz.invalidate(id);
    await this.audit.record({ actorUserId: actor.userId, action: 'student.revoke_sessions', targetType: 'User', targetId: id, result: 'SUCCESS' });
    return { id };
  }

  private async requireStudent(actor: Principal, id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        kind: 'STUDENT',
        deletedAt: null,
        ...(this.orgScoped(actor) ? { orgId: actor.orgId } : {}),
      },
    });
    if (!user) throw AppError.notFound('Student not found.');
    return user;
  }
}
