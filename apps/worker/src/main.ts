/**
 * RajyaRank background worker.
 *
 * Consumes the API's outbound queues (Redis lists) and runs scheduled
 * maintenance. Kept dependency-light for Phase 1; can be migrated to BullMQ
 * when retry/backoff/DLQ semantics are needed at scale.
 *
 * Queues:
 *   rr:queue:email → deliver via SMTP (mailhog in dev)
 *   rr:queue:sms   → deliver via SMS gateway (logged in dev)
 * Scheduled:
 *   expire stale staff invitations; purge expired login sessions.
 */
import Redis from 'ioredis';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

// The worker is a separate process; it reads only the few vars it needs
// directly from the environment (no cross-package source coupling).
const env = {
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  SMTP_HOST: process.env.SMTP_HOST ?? 'localhost',
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 1025),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'RajyaRank <no-reply@rajyarank.dev>',
  SMS_PROVIDER: process.env.SMS_PROVIDER ?? 'log',
  SMS_API_KEY: process.env.SMS_API_KEY ?? '',
  MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID ?? '',
  MSG91_SENDER_ID: process.env.MSG91_SENDER_ID ?? '',
};
const redis = new Redis(env.REDIS_URL);
const prisma = new PrismaClient();

const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

const EMAIL_QUEUE = 'rr:queue:email';
const SMS_QUEUE = 'rr:queue:sms';

let running = true;

async function consumeLoop() {
  const blocking = new Redis(env.REDIS_URL); // dedicated connection for BRPOP
  while (running) {
    try {
      const popped = await blocking.brpop(EMAIL_QUEUE, SMS_QUEUE, 5);
      if (!popped) continue;
      const [queue, payload] = popped;
      if (queue === EMAIL_QUEUE) await handleEmail(payload);
      else if (queue === SMS_QUEUE) await handleSms(payload);
    } catch (err) {
      console.error('[worker] consume error', err);
      await sleep(1000);
    }
  }
  await blocking.quit();
}

async function handleEmail(raw: string) {
  const job = JSON.parse(raw) as {
    to: string;
    subject: string;
    html: string;
    attachments?: { filename: string; contentBase64: string; contentType?: string }[];
  };
  await mailer.sendMail({
    from: env.EMAIL_FROM,
    to: job.to,
    subject: job.subject,
    html: job.html,
    attachments: job.attachments?.map((a) => ({ filename: a.filename, content: a.contentBase64, encoding: 'base64' as const, contentType: a.contentType })),
  });
  console.log(`[worker] email sent → ${job.to}`);
}

async function handleSms(raw: string) {
  const job = JSON.parse(raw) as { phone: string; text: string };
  const mobile = `91${job.phone.replace(/\D/g, '').slice(-10)}`;

  // Real gateway: MSG91 v5 flow API (India DLT). The referenced template must
  // define a `body` variable that carries the message/OTP text. Falls back to
  // logging when not configured (dev / SMS_PROVIDER=log).
  if (env.SMS_PROVIDER === 'msg91' && env.SMS_API_KEY && env.MSG91_TEMPLATE_ID) {
    try {
      const res = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: { authkey: env.SMS_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          template_id: env.MSG91_TEMPLATE_ID,
          ...(env.MSG91_SENDER_ID ? { sender: env.MSG91_SENDER_ID } : {}),
          recipients: [{ mobiles: mobile, body: job.text }],
        }),
      });
      if (!res.ok) console.error(`[worker] MSG91 send failed: HTTP ${res.status}`);
      else console.log(`[worker] sms sent via MSG91 → ••••${mobile.slice(-4)}`);
    } catch (err) {
      console.error('[worker] MSG91 error', err);
    }
    return;
  }

  console.log(`[worker] sms (log) → ••••${mobile.slice(-4)}: ${job.text}`);
}

async function scheduledSweeps() {
  const now = new Date();
  const expired = await prisma.staffInvitation.updateMany({
    where: { status: 'PENDING', expiresAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });
  const sessions = await prisma.loginSession.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });
  if (expired.count || sessions.count) {
    console.log(`[worker] swept ${expired.count} invitations, ${sessions.count} sessions`);
  }
}

/** Minimal branded shell duplicated from the API's renderEmailLayout — the
 *  worker is a standalone process with no dependency on apps/api's source,
 *  so this one template is kept small rather than pulling in a shared
 *  package for a single engagement email. Keep in sync with
 *  apps/api/src/notifications/email-templates/layout.ts if the brand changes. */
function entitlementExpiringHtml(locale: 'hi' | 'en', productTitleHi: string, productTitleEn: string, daysLeft: number): { subject: string; html: string } {
  const hi = locale === 'hi';
  const product = hi ? productTitleHi : productTitleEn;
  const heading = hi ? 'आपकी पहुंच जल्द समाप्त हो रही है' : 'Your access is expiring soon';
  const subject = hi ? 'RajyaRank — पहुंच जल्द समाप्त हो रही है' : 'RajyaRank — your access is expiring soon';
  const body = hi
    ? `<strong>${product}</strong> तक आपकी पहुंच ${daysLeft} दिनों में समाप्त हो जाएगी। बिना रुकावट के जारी रखने के लिए अभी नवीनीकरण करें।`
    : `Your access to <strong>${product}</strong> expires in ${daysLeft} day(s). Renew now to keep learning without interruption.`;
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;padding:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#0B2F4F;padding:20px 28px;"><span style="font-size:20px;font-weight:900;color:#ffffff;">Rajya<span style="color:#F97316;">Rank</span></span></td></tr>
<tr><td style="padding:32px 28px;"><h1 style="margin:0 0 16px;font-size:19px;font-weight:900;color:#0B2F4F;">${heading}</h1><p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">${body}</p></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html };
}

/** Students whose entitlement expires within 3 days, notified at most once
 *  per entitlement (Redis SETNX dedupe survives worker restarts, unlike an
 *  in-memory set). No current-affairs digest sweep exists — that would need a
 *  per-student "already sent today" content selection this platform doesn't
 *  have a subscription model for yet. */
async function sweepEntitlementExpiry() {
  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 86_400_000);
  const expiring = await prisma.entitlement.findMany({
    where: { status: 'ACTIVE', endsAt: { gt: now, lte: soon } },
    include: { user: { select: { id: true, email: true, locale: true } }, product: { select: { titleHi: true, titleEn: true } } },
  });
  let notified = 0;
  for (const e of expiring) {
    if (!e.user.email || !e.endsAt) continue;
    const claimed = await redis.set(`rr:notified:expiry:${e.id}`, '1', 'EX', 4 * 86_400, 'NX');
    if (!claimed) continue;
    const pref = await prisma.notificationPreference.findUnique({ where: { userId: e.user.id } });
    if (pref?.mutedCategories?.includes('EXPIRY') || pref?.emailEnabled === false) continue;
    const locale: 'hi' | 'en' = e.user.locale === 'en' ? 'en' : 'hi';
    const daysLeft = Math.max(1, Math.round((e.endsAt.getTime() - now.getTime()) / 86_400_000));
    const { subject, html } = entitlementExpiringHtml(locale, e.product.titleHi, e.product.titleEn, daysLeft);
    await mailer.sendMail({ from: env.EMAIL_FROM, to: e.user.email, subject, html });
    await prisma.notification.create({
      data: {
        userId: e.user.id,
        category: 'EXPIRY',
        titleHi: 'आपकी पहुंच जल्द समाप्त हो रही है',
        titleEn: 'Your access is expiring soon',
        bodyHi: `${e.product.titleHi} जल्द समाप्त होगी।`,
        bodyEn: `${e.product.titleEn} is expiring soon.`,
      },
    });
    notified++;
  }
  if (notified) console.log(`[worker] entitlement-expiry notified ${notified} student(s)`);
}

/** Same duplicated-shell convention as entitlementExpiringHtml above. */
function planBehindHtml(locale: 'hi' | 'en', missedCount: number): { subject: string; html: string } {
  const hi = locale === 'hi';
  const heading = hi ? 'आपकी स्टडी प्लान अपडेट हुई' : 'Your study plan was refreshed';
  const subject = hi ? 'RajyaRank — स्टडी प्लान अपडेट' : 'RajyaRank — study plan refreshed';
  const body = hi
    ? `आप हाल के दिनों में अपनी योजना से पीछे रह गए (${missedCount} आइटम छूटे), इसलिए हमने आपकी योजना को नए सिरे से तैयार किया है। ऐप खोलकर देखें।`
    : `You fell behind your recent plan (${missedCount} item(s) missed), so we've refreshed it for you. Open the app to see your updated plan.`;
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;padding:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#0B2F4F;padding:20px 28px;"><span style="font-size:20px;font-weight:900;color:#ffffff;">Rajya<span style="color:#F97316;">Rank</span></span></td></tr>
<tr><td style="padding:32px 28px;"><h1 style="margin:0 0 16px;font-size:19px;font-weight:900;color:#0B2F4F;">${heading}</h1><p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">${body}</p></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html };
}

/** Duplicates the plain course-sequence bin-packing from
 *  StudyPlanService.generate() (apps/api/src/student/study-plan.service.ts) —
 *  deliberately WITHOUT weak-topic interleaving, matching this worker's
 *  established "small duplicated logic, no api-src import" convention. A
 *  student's manual "Regenerate plan" button (API-side) still gets the full
 *  weak-topic-aware version; this is only the automatic nightly catch-up. */
async function regenerateSimplePlan(studentId: string) {
  const DEFAULT_HORIZON_DAYS = 14;
  const DEFAULT_LESSON_MINUTES = 20;
  const profile = await prisma.studentProfile.findUnique({ where: { userId: studentId } });
  const dailyMinutesGoal = profile?.dailyStudyMinutes ?? 120;
  const targetExamId = profile?.targetExamId ?? null;
  const targetDate = profile?.targetDate ?? null;

  let horizonDays = DEFAULT_HORIZON_DAYS;
  if (targetDate) {
    const daysUntilTarget = Math.max(1, Math.ceil((targetDate.getTime() - Date.now()) / 86_400_000));
    horizonDays = Math.min(horizonDays, daysUntilTarget);
  }

  await prisma.studyPlan.updateMany({ where: { studentId, status: 'ACTIVE' }, data: { status: 'ABANDONED' } });
  const plan = await prisma.studyPlan.create({ data: { studentId, targetExamId, dailyMinutesGoal, targetDate, status: 'ACTIVE' } });

  const lessons = targetExamId
    ? await prisma.lesson.findMany({
        where: { deletedAt: null, currentVersion: { status: 'PUBLISHED' }, topic: { chapter: { subject: { course: { examId: targetExamId } } } } },
        orderBy: { sequence: 'asc' },
        include: { currentVersion: { select: { estimatedMinutes: true } } },
        take: 300,
      })
    : [];
  const completed = await prisma.lessonProgress.findMany({ where: { studentId, status: 'COMPLETED' }, select: { lessonId: true } });
  const completedIds = new Set(completed.map((c) => c.lessonId));
  const remaining = lessons.filter((l) => !completedIds.has(l.id));

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const rows: { planId: string; scheduledFor: Date; sequence: number; lessonId: string; kind: 'LESSON'; estimatedMinutes: number }[] = [];
  let dayIndex = 0;
  let minutesUsedToday = 0;
  let sequence = 0;
  for (const lesson of remaining) {
    const estimatedMinutes = lesson.currentVersion?.estimatedMinutes ?? DEFAULT_LESSON_MINUTES;
    if (minutesUsedToday > 0 && minutesUsedToday + estimatedMinutes > dailyMinutesGoal) {
      dayIndex += 1;
      minutesUsedToday = 0;
      sequence = 0;
      if (dayIndex >= horizonDays) break;
    }
    const scheduledFor = new Date(today);
    scheduledFor.setUTCDate(scheduledFor.getUTCDate() + dayIndex);
    rows.push({ planId: plan.id, scheduledFor, sequence: sequence++, lessonId: lesson.id, kind: 'LESSON', estimatedMinutes });
    minutesUsedToday += estimatedMinutes;
  }
  if (rows.length) await prisma.planItem.createMany({ data: rows });
}

/** Marks stale PENDING items MISSED, and — when a student has fallen
 *  meaningfully behind (>50% of the last 3 days' items missed) — auto-
 *  regenerates their plan + sends a DAILY_PLAN reminder. Redis SETNX-per-
 *  plan-per-day dedupe means this only actually acts once per calendar day
 *  even though the interval ticks hourly, and survives worker restarts. */
async function sweepStudyPlans() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayKey = today.toISOString().slice(0, 10);

  const activePlans = await prisma.studyPlan.findMany({ where: { status: 'ACTIVE' } });
  let regenerated = 0;
  for (const plan of activePlans) {
    const claimed = await redis.set(`rr:planswept:${plan.id}:${todayKey}`, '1', 'EX', 2 * 86_400, 'NX');
    if (!claimed) continue;

    await prisma.planItem.updateMany({
      where: { planId: plan.id, status: 'PENDING', scheduledFor: { lt: today } },
      data: { status: 'MISSED' },
    });

    const windowStart = new Date(today.getTime() - 3 * 86_400_000);
    const recent = await prisma.planItem.findMany({ where: { planId: plan.id, scheduledFor: { gte: windowStart, lt: today } }, select: { status: true } });
    if (!recent.length) continue;
    const missedCount = recent.filter((i) => i.status === 'MISSED').length;
    if (missedCount / recent.length <= 0.5) continue;

    await regenerateSimplePlan(plan.studentId);
    regenerated++;

    const student = await prisma.user.findUnique({ where: { id: plan.studentId }, select: { email: true, locale: true } });
    if (!student?.email) continue;
    const pref = await prisma.notificationPreference.findUnique({ where: { userId: plan.studentId } });
    if (pref?.mutedCategories?.includes('DAILY_PLAN') || pref?.emailEnabled === false) continue;
    const locale: 'hi' | 'en' = student.locale === 'en' ? 'en' : 'hi';
    const { subject, html } = planBehindHtml(locale, missedCount);
    await mailer.sendMail({ from: env.EMAIL_FROM, to: student.email, subject, html });
    await prisma.notification.create({
      data: {
        userId: plan.studentId,
        category: 'DAILY_PLAN',
        titleHi: 'आपकी स्टडी प्लान अपडेट हुई',
        titleEn: 'Your study plan was updated',
        bodyHi: 'आप पीछे थे, इसलिए हमने आपकी योजना अपडेट कर दी है।',
        bodyEn: "You'd fallen behind, so we've refreshed your plan.",
      },
    });
  }
  if (regenerated) console.log(`[worker] auto-replanned ${regenerated} study plan(s)`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('[worker] started');
  const sweepTimer = setInterval(() => void scheduledSweeps(), 60_000);
  const expiryTimer = setInterval(() => void sweepEntitlementExpiry(), 3_600_000);
  const planTimer = setInterval(() => void sweepStudyPlans(), 3_600_000);
  void sweepEntitlementExpiry();
  void sweepStudyPlans();
  const shutdown = async () => {
    running = false;
    clearInterval(sweepTimer);
    clearInterval(expiryTimer);
    clearInterval(planTimer);
    await Promise.allSettled([redis.quit(), prisma.$disconnect()]);
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  await consumeLoop();
}

void main();
