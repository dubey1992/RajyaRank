import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationService } from '../notifications/notification.service';
import { EntitlementService } from '../payments/entitlement.service';

/** T-minus-15-minutes live-class reminder. Lives in the API (not
 *  apps/worker) specifically so it can call NotificationService.emit()
 *  directly — the one call site that already does in-app + email + SMS +
 *  push (VAPID/FCM) in one shot, honouring each student's own
 *  NotificationPreference. apps/worker's sweeps only ever reach email + an
 *  in-app row (see sweepTrialReminders), because they run in a separate
 *  process with no NestJS DI container to reuse that service from — and
 *  push is the channel that actually matters for a 15-minute-out alert, so
 *  duplicating half of NotificationService by hand in the worker would be
 *  the wrong trade for this one case.
 *
 *  A 60-second polling interval, mirroring apps/worker's own
 *  sweepTrialReminders() structure (Redis SETNX dedup per class so a
 *  multi-instance API deployment never double-sends) — not a reason to
 *  introduce a job queue; see the Live Classes plan's own reasoning. */
@Injectable()
export class LiveClassReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('LiveClassReminders');
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationService,
    private readonly entitlements: EntitlementService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.sweep(), 60_000);
    void this.sweep();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async sweep() {
    const now = new Date();
    const soon = new Date(now.getTime() + 15 * 60_000);
    const classes = await this.prisma.liveClass.findMany({
      where: { status: 'SCHEDULED', deletedAt: null, startsAt: { gt: now, lte: soon } },
      include: { course: { select: { titleHi: true, titleEn: true, examId: true } } },
    });

    for (const lc of classes) {
      const claimed = await this.redis.client.set(`rr:live:reminder:${lc.id}`, '1', 'EX', 3600, 'NX');
      if (!claimed) continue;

      // Same two-tier access this feature gates joining on (direct course
      // entitlement, or a Pro/Plus subscription covering the course's exam)
      // — a bulk query here rather than looping EntitlementService's
      // single-course check, since we need every entitled user at once.
      const entitledUserIds = await this.entitlements.entitledUserIdsForCourse(lc.courseId, lc.course.examId);

      let notified = 0;
      for (const userId of entitledUserIds) {
        await this.notifications.emit({
          userId,
          category: 'LIVE_CLASS',
          titleHi: 'आपकी लाइव क्लास 15 मिनट में शुरू हो रही है',
          titleEn: 'Your live class starts in 15 minutes',
          bodyHi: `${lc.titleHi} — ${lc.course.titleHi}`,
          bodyEn: `${lc.titleEn} — ${lc.course.titleEn}`,
          data: { liveClassId: lc.id },
        });
        notified++;
      }
      if (notified) this.logger.log(`Reminded ${notified} student(s) for live class ${lc.id}`);
    }
  }
}
