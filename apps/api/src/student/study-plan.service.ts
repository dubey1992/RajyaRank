import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { PlanItemView, StudyPlanDay, WeakTopic } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';

const DEFAULT_HORIZON_DAYS = 14;
const DEFAULT_LESSON_MINUTES = 20;

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

/**
 * The persisted, trackable study plan — replaces the dashboard's previous
 * ad-hoc "next 5 incomplete lessons" query with a real entity: day-by-day
 * items with completion state and history. One ACTIVE plan per student;
 * regenerating abandons the old plan rather than deleting it, so "planned vs.
 * actually done" stays queryable forever.
 */
@Injectable()
export class StudyPlanService {
  constructor(private readonly prisma: PrismaService) {}

  private studentId(p: Principal): string {
    if (p.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');
    return p.userId;
  }

  async today(p: Principal): Promise<StudyPlanDay> {
    const studentId = this.studentId(p);
    const plan = await this.activeOrGenerate(studentId);
    return this.dayView(plan.id, startOfDay(new Date()));
  }

  async week(p: Principal): Promise<StudyPlanDay[]> {
    const studentId = this.studentId(p);
    const plan = await this.activeOrGenerate(studentId);
    const today = startOfDay(new Date());
    const days: StudyPlanDay[] = [];
    for (let i = 0; i < 7; i++) days.push(await this.dayView(plan.id, addDays(today, i)));
    return days;
  }

  async markItem(p: Principal, itemId: string, status: 'DONE' | 'SKIPPED'): Promise<PlanItemView> {
    const studentId = this.studentId(p);
    const item = await this.prisma.planItem.findUnique({ where: { id: itemId }, include: { plan: true } });
    if (!item || item.plan.studentId !== studentId) throw AppError.notFound('Plan item not found.');
    await this.prisma.planItem.update({
      where: { id: itemId },
      data: { status, completedAt: status === 'DONE' ? new Date() : null },
    });
    const day = await this.dayView(item.planId, item.scheduledFor);
    const view = day.items.find((i) => i.id === itemId);
    if (!view) throw AppError.notFound('Plan item not found.');
    return view;
  }

  /** Moves a PENDING item to a new date: creates a fresh PENDING item there
   *  (linked back via rescheduledFromId) and marks the source RESCHEDULED —
   *  keeps the source as real history rather than mutating it in place. */
  async reschedule(p: Principal, itemId: string, toDate: string): Promise<PlanItemView> {
    const studentId = this.studentId(p);
    const item = await this.prisma.planItem.findUnique({ where: { id: itemId }, include: { plan: true } });
    if (!item || item.plan.studentId !== studentId) throw AppError.notFound('Plan item not found.');
    if (item.status !== 'PENDING') throw AppError.conflict('Only a pending item can be rescheduled.');

    const scheduledFor = startOfDay(new Date(toDate));
    const created = await this.prisma.$transaction(async (tx) => {
      const next = await tx.planItem.create({
        data: {
          planId: item.planId,
          scheduledFor,
          sequence: 0,
          lessonId: item.lessonId,
          topicId: item.topicId,
          kind: item.kind,
          estimatedMinutes: item.estimatedMinutes,
          rescheduledFromId: item.id,
        },
      });
      await tx.planItem.update({ where: { id: item.id }, data: { status: 'RESCHEDULED' } });
      return next;
    });
    const day = await this.dayView(item.planId, scheduledFor);
    const view = day.items.find((i) => i.id === created.id);
    if (!view) throw AppError.notFound('Plan item not found.');
    return view;
  }

  /** Manual regenerate — abandons the current plan and builds a fresh one
   *  from the student's latest goals/progress/weak-topics. Also the trigger
   *  used right after a goal edit, so a changed goal reflects immediately. */
  async regenerate(p: Principal): Promise<StudyPlanDay> {
    const studentId = this.studentId(p);
    await this.generate(studentId);
    return this.today(p);
  }

  /** Deterministic weak-area recommendations (§13.3): per-topic accuracy
   *  across the student's submitted attempts, weakest first, with a
   *  subject-level fallback for questions that were never linked to a topic
   *  (e.g. bulk-CSV-imported ones) — otherwise those answers would silently
   *  vanish from weak-area analysis instead of surfacing at a coarser
   *  grain. Pure aggregation, no ML. This is the public read endpoint; plan
   *  generation uses the narrower `weakTopicsForStudent()` below instead
   *  (see its own doc comment for why). */
  async weakTopics(p: Principal): Promise<WeakTopic[]> {
    return this.weakGroupsForStudent(this.studentId(p));
  }

  /** Topic-only aggregation (no subject fallback) — used exclusively by
   *  `generate()` to pick a topic for a WEAK_TOPIC_DRILL plan item.
   *  PlanItem.topicId always names a real Topic elsewhere in this app (it's
   *  looked up via `prisma.topic.findMany` in `dayView()`), so a subject id
   *  can never be substituted in here — that's what makes this a separate,
   *  narrower method from the public-facing `weakGroupsForStudent()` rather
   *  than the same list filtered by `kind === 'topic'`. */
  private async weakTopicsForStudent(studentId: string): Promise<{ topicId: string; nameHi: string; nameEn: string; correct: number; total: number; accuracy: number }[]> {
    const attempts = await this.prisma.attempt.findMany({
      where: { studentId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] } },
      select: { id: true },
    });
    if (!attempts.length) return [];

    const answers = await this.prisma.attemptAnswer.findMany({
      where: { attemptId: { in: attempts.map((a) => a.id) } },
      select: { questionVersionId: true, isCorrect: true },
    });
    if (!answers.length) return [];

    const qvIds = [...new Set(answers.map((a) => a.questionVersionId))];
    const qvs = await this.prisma.questionVersion.findMany({
      where: { id: { in: qvIds } },
      select: { id: true, question: { select: { topicId: true } } },
    });
    const topicByQv = new Map(qvs.map((q) => [q.id, q.question.topicId] as const));

    const agg = new Map<string, { correct: number; total: number }>();
    for (const a of answers) {
      const topicId = topicByQv.get(a.questionVersionId);
      if (!topicId) continue;
      const g = agg.get(topicId) ?? { correct: 0, total: 0 };
      g.total += 1;
      if (a.isCorrect) g.correct += 1;
      agg.set(topicId, g);
    }
    const topicIds = [...agg.keys()];
    if (!topicIds.length) return [];

    const topics = await this.prisma.topic.findMany({
      where: { id: { in: topicIds } },
      select: { id: true, nameHi: true, nameEn: true },
    });
    const byId = new Map(topics.map((t) => [t.id, t]));

    return topicIds
      .map((id) => {
        const g = agg.get(id)!;
        const t = byId.get(id);
        return {
          topicId: id,
          nameHi: t?.nameHi ?? '',
          nameEn: t?.nameEn ?? '',
          correct: g.correct,
          total: g.total,
          accuracy: g.total ? Math.round((g.correct / g.total) * 100) : 0,
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);
  }

  /** Public-facing weak-area list: topic-level accuracy where the question
   *  has a topic, PLUS a subject-level fallback (`kind: 'subject'`) for
   *  questions that don't — see weakTopics()'s doc comment. */
  private async weakGroupsForStudent(studentId: string): Promise<WeakTopic[]> {
    const attempts = await this.prisma.attempt.findMany({
      where: { studentId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] } },
      select: { id: true },
    });
    if (!attempts.length) return [];

    const answers = await this.prisma.attemptAnswer.findMany({
      where: { attemptId: { in: attempts.map((a) => a.id) } },
      select: { questionVersionId: true, isCorrect: true },
    });
    if (!answers.length) return [];

    const qvIds = [...new Set(answers.map((a) => a.questionVersionId))];
    const qvs = await this.prisma.questionVersion.findMany({
      where: { id: { in: qvIds } },
      select: { id: true, question: { select: { topicId: true, subjectId: true } } },
    });
    const groupByQv = new Map(
      qvs.map((q) => [
        q.id,
        q.question.topicId ? ({ kind: 'topic', id: q.question.topicId } as const) : ({ kind: 'subject', id: q.question.subjectId } as const),
      ]),
    );

    const agg = new Map<string, { kind: 'topic' | 'subject'; id: string; correct: number; total: number }>();
    for (const a of answers) {
      const group = groupByQv.get(a.questionVersionId);
      if (!group) continue;
      const key = `${group.kind}:${group.id}`;
      const g = agg.get(key) ?? { kind: group.kind, id: group.id, correct: 0, total: 0 };
      g.total += 1;
      if (a.isCorrect) g.correct += 1;
      agg.set(key, g);
    }
    if (!agg.size) return [];

    const groups = [...agg.values()];
    const topicIds = groups.filter((g) => g.kind === 'topic').map((g) => g.id);
    const subjectIds = groups.filter((g) => g.kind === 'subject').map((g) => g.id);
    const [topics, subjects] = await Promise.all([
      topicIds.length ? this.prisma.topic.findMany({ where: { id: { in: topicIds } }, select: { id: true, nameHi: true, nameEn: true } }) : Promise.resolve([]),
      subjectIds.length ? this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, nameHi: true, nameEn: true } }) : Promise.resolve([]),
    ]);
    const topicById = new Map(topics.map((t) => [t.id, t]));
    const subjectById = new Map(subjects.map((s) => [s.id, s]));

    return groups
      .map((g) => {
        const meta = g.kind === 'topic' ? topicById.get(g.id) : subjectById.get(g.id);
        return {
          id: g.id,
          kind: g.kind,
          nameHi: meta?.nameHi ?? '',
          nameEn: meta?.nameEn ?? '',
          correct: g.correct,
          total: g.total,
          accuracy: g.total ? Math.round((g.correct / g.total) * 100) : 0,
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);
  }

  private async activeOrGenerate(studentId: string) {
    const existing = await this.prisma.studyPlan.findFirst({ where: { studentId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
    if (existing) return existing;
    return this.generate(studentId);
  }

  /** Fills each day's `dailyMinutesGoal` budget with not-yet-completed lessons
   *  in course-sequence order for the student's target exam, interleaving a
   *  WEAK_TOPIC_DRILL for the single weakest topic every ~3rd lesson slot
   *  (roughly 20% of the daily budget) rather than appending drills at the
   *  end — computed once at generation time, not re-scored per day, to avoid
   *  thrashing. The remainder rolls to the next day; horizon caps at the
   *  target date when it's sooner. */
  async generate(studentId: string, opts?: { horizonDays?: number }): Promise<{ id: string }> {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId: studentId } });
    const dailyMinutesGoal = profile?.dailyStudyMinutes ?? 120;
    const targetExamId = profile?.targetExamId ?? null;
    const targetDate = profile?.targetDate ?? null;

    let horizonDays = opts?.horizonDays ?? DEFAULT_HORIZON_DAYS;
    if (targetDate) {
      const daysUntilTarget = Math.max(1, Math.ceil((targetDate.getTime() - Date.now()) / 86_400_000));
      horizonDays = Math.min(horizonDays, daysUntilTarget);
    }

    await this.prisma.studyPlan.updateMany({ where: { studentId, status: 'ACTIVE' }, data: { status: 'ABANDONED' } });
    const plan = await this.prisma.studyPlan.create({
      data: { studentId, targetExamId, dailyMinutesGoal, targetDate, status: 'ACTIVE' },
    });

    const [lessons, weakTopics] = await Promise.all([
      targetExamId
        ? this.prisma.lesson.findMany({
            where: { deletedAt: null, currentVersion: { status: 'PUBLISHED' }, topic: { chapter: { subject: { course: { examId: targetExamId } } } } },
            orderBy: { sequence: 'asc' },
            include: { currentVersion: { select: { estimatedMinutes: true } } },
            take: 300,
          })
        : Promise.resolve([]),
      this.weakTopicsForStudent(studentId),
    ]);
    const completed = await this.prisma.lessonProgress.findMany({ where: { studentId, status: 'COMPLETED' }, select: { lessonId: true } });
    const completedIds = new Set(completed.map((c) => c.lessonId));
    const remaining = lessons.filter((l) => !completedIds.has(l.id));
    const topWeakTopic = weakTopics[0] ?? null;
    const drillMinutes = Math.max(10, Math.round(dailyMinutesGoal * 0.2));

    const today = startOfDay(new Date());
    const rows: { planId: string; scheduledFor: Date; sequence: number; lessonId: string | null; topicId: string | null; kind: 'LESSON' | 'WEAK_TOPIC_DRILL'; estimatedMinutes: number }[] = [];
    let dayIndex = 0;
    let minutesUsedToday = 0;
    let sequence = 0;
    let lessonsSinceDrill = 0;
    for (const lesson of remaining) {
      const estimatedMinutes = lesson.currentVersion?.estimatedMinutes ?? DEFAULT_LESSON_MINUTES;
      if (minutesUsedToday > 0 && minutesUsedToday + estimatedMinutes > dailyMinutesGoal) {
        dayIndex += 1;
        minutesUsedToday = 0;
        sequence = 0;
        lessonsSinceDrill = 0;
        if (dayIndex >= horizonDays) break; // remainder picked up on the next regeneration
      }
      if (topWeakTopic && lessonsSinceDrill >= 3 && minutesUsedToday + drillMinutes <= dailyMinutesGoal) {
        rows.push({ planId: plan.id, scheduledFor: addDays(today, dayIndex), sequence: sequence++, lessonId: null, topicId: topWeakTopic.topicId, kind: 'WEAK_TOPIC_DRILL', estimatedMinutes: drillMinutes });
        minutesUsedToday += drillMinutes;
        lessonsSinceDrill = 0;
      }
      rows.push({ planId: plan.id, scheduledFor: addDays(today, dayIndex), sequence: sequence++, lessonId: lesson.id, topicId: null, kind: 'LESSON', estimatedMinutes });
      minutesUsedToday += estimatedMinutes;
      lessonsSinceDrill += 1;
    }
    if (rows.length) await this.prisma.planItem.createMany({ data: rows });
    return plan;
  }

  private async dayView(planId: string, date: Date): Promise<StudyPlanDay> {
    const items = await this.prisma.planItem.findMany({
      where: { planId, scheduledFor: date },
      orderBy: { sequence: 'asc' },
    });
    const lessonIds = items.map((i) => i.lessonId).filter((id): id is string => !!id);
    const topicIds = items.map((i) => i.topicId).filter((id): id is string => !!id);
    const [lessonTitles, topicNames] = await Promise.all([
      lessonIds.length
        ? this.prisma.lesson.findMany({ where: { id: { in: lessonIds } }, select: { id: true, freePreview: true, currentVersion: { select: { titleHi: true, titleEn: true } } } })
        : Promise.resolve([]),
      topicIds.length ? this.prisma.topic.findMany({ where: { id: { in: topicIds } } }) : Promise.resolve([]),
    ]);
    const lessonById = new Map(lessonTitles.map((l) => [l.id, l]));
    const topicById = new Map(topicNames.map((t) => [t.id, t]));

    return {
      date: date.toISOString().slice(0, 10),
      items: items.map((i) => {
        const lesson = i.lessonId ? lessonById.get(i.lessonId) : undefined;
        const topic = i.topicId ? topicById.get(i.topicId) : undefined;
        return {
          id: i.id,
          kind: i.kind,
          status: i.status,
          titleHi: lesson?.currentVersion?.titleHi ?? topic?.nameHi ?? '',
          titleEn: lesson?.currentVersion?.titleEn ?? topic?.nameEn ?? '',
          lessonId: i.lessonId,
          topicId: i.topicId,
          estimatedMinutes: i.estimatedMinutes,
          freePreview: lesson?.freePreview ?? false,
        };
      }),
    };
  }
}
