import type { PrismaClient } from '@prisma/client';
import { AppError } from './errors/app-error';
import { isSubscriptionUsable } from './subscription-status.util';

/** Throws if `orgId`'s institution has no usable subscription, or is already
 *  at its plan's active-student cap. The single gate every path that adds a
 *  student to an institution's roster must go through — staff enrollment
 *  (StudentsService.enroll), student self-serve join-by-access-code
 *  (StudentService.joinInstitution), and Super Admin link-independent-student
 *  (StudentsService.linkToInstitution) — so a trial's student cap can't be
 *  routed around by picking whichever path happens to skip the check. Callers
 *  must only call this when the action genuinely grows the roster (a student
 *  already enrolled here doesn't consume a new seat on a re-submit). */
export async function assertCanAddStudent(prisma: PrismaClient, orgId: string): Promise<void> {
  const subscription = await prisma.organizationSubscription.findUnique({ where: { orgId }, include: { plan: true } });
  if (!subscription || !isSubscriptionUsable(subscription.status, subscription.currentPeriodEnd)) {
    throw AppError.conflict("This institution's subscription is not active.");
  }
  const activeCount = await prisma.user.count({ where: { kind: 'STUDENT', orgId, status: 'ACTIVE' } });
  if (activeCount >= subscription.plan.maxActiveStudents) {
    throw AppError.conflict(
      `This institution's plan allows up to ${subscription.plan.maxActiveStudents} active students. Contact RajyaRank to upgrade the plan.`,
    );
  }
}
