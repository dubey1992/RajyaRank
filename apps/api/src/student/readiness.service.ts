import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { ReadinessView } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { computeStreakWeek } from './student.service';

const RETENTION_WINDOW_DAYS = 14;
const WEIGHTS = { conceptMastery: 0.35, syllabusCoverage: 0.2, revisionRetention: 0.2, testEfficiency: 0.15, consistency: 0.1 };

/**
 * Exam Readiness OS Phase 1 — a single, transparent, weighted composite score
 * computed live on every read (no cron/sweep infra exists in this codebase to
 * cache it against, and the volume here is cheap). Deliberately conservative
 * math throughout (plain ratios, no EMA/decay curves) so every number is
 * exactly reproducible in the student-facing explainer modal.
 */
@Injectable()
export class ReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  private studentId(p: Principal): string {
    if (p.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');
    return p.userId;
  }

  async readiness(p: Principal): Promise<ReadinessView> {
    const userId = this.studentId(p);
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile?.targetExamId) return { available: false, reason: 'ONBOARDING_INCOMPLETE' };
    const examId = profile.targetExamId;

    const concepts = await this.prisma.concept.findMany({ where: { examId }, select: { id: true } });
    if (concepts.length === 0) return { available: false, reason: 'NO_CONCEPTS_AUTHORED' };
    const conceptIds = concepts.map((c) => c.id);

    const masteries = await this.prisma.studentConceptMastery.findMany({
      where: { studentId: userId, conceptId: { in: conceptIds } },
    });
    const touchedByMastery = new Set(masteries.filter((m) => m.attemptsCount > 0).map((m) => m.conceptId));

    // "Touched via a lesson" — any LessonProgress row for a lesson linked to
    // the concept, even without a test attempt yet (matches the prototype's
    // own "studied and assessed" framing for syllabus coverage).
    const lessonLinks = await this.prisma.lessonConcept.findMany({ where: { conceptId: { in: conceptIds } } });
    const lessonIds = [...new Set(lessonLinks.map((l) => l.lessonId))];
    const progressRows = lessonIds.length
      ? await this.prisma.lessonProgress.findMany({ where: { studentId: userId, lessonId: { in: lessonIds } } })
      : [];
    const touchedLessonIds = new Set(progressRows.map((pr) => pr.lessonId));
    const touchedByLesson = new Set(lessonLinks.filter((l) => touchedLessonIds.has(l.lessonId)).map((l) => l.conceptId));

    const touchedConceptIds = new Set([...touchedByMastery, ...touchedByLesson]);

    // Concept mastery (35%) — plain correct/attempts ratio, averaged only over
    // concepts actually attempted (an untouched concept isn't counted as 0,
    // which would otherwise punish a student for content they haven't reached yet).
    const attemptedMasteries = masteries.filter((m) => m.attemptsCount > 0);
    const conceptMastery = attemptedMasteries.length
      ? Math.round((attemptedMasteries.reduce((sum, m) => sum + m.correctCount / m.attemptsCount, 0) / attemptedMasteries.length) * 100)
      : 0;

    // Syllabus coverage (20%) — touched / total concepts for this exam.
    const syllabusCoverage = Math.round((touchedConceptIds.size / conceptIds.length) * 100);

    // Revision retention (20%) — % of touched concepts practiced within the
    // last RETENTION_WINDOW_DAYS. Deliberately a plain recency ratio, not an
    // exponential decay curve — the latter isn't reproducible for a screen
    // whose whole point is showing the reader its own math.
    //
    // "Practiced" must count BOTH signals a concept can be touched by — a test
    // attempt (StudentConceptMastery.lastPracticedAt) or a lesson visit
    // (LessonProgress.lastAccessedAt) — otherwise a concept only ever studied
    // via lessons (never tested) can never count as "recently revisited" even
    // if it was opened five minutes ago, silently dragging this dimension down
    // for students who haven't taken a test yet.
    const cutoff = new Date(Date.now() - RETENTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const lastPracticedByConcept = new Map<string, Date>();
    for (const m of attemptedMasteries) if (m.lastPracticedAt) lastPracticedByConcept.set(m.conceptId, m.lastPracticedAt);
    const lastAccessedByLesson = new Map(progressRows.map((pr) => [pr.lessonId, pr.lastAccessedAt]));
    for (const link of lessonLinks) {
      const accessedAt = lastAccessedByLesson.get(link.lessonId);
      if (!accessedAt) continue;
      const current = lastPracticedByConcept.get(link.conceptId);
      if (!current || accessedAt > current) lastPracticedByConcept.set(link.conceptId, accessedAt);
    }
    const recentlyPracticed = [...touchedConceptIds].filter((id) => {
      const last = lastPracticedByConcept.get(id);
      return last && last >= cutoff;
    }).length;
    const revisionRetention = touchedConceptIds.size ? Math.round((recentlyPracticed / touchedConceptIds.size) * 100) : 0;

    // Test efficiency (15%) — same average-score-percent math as the
    // dashboard's avgTestScorePercent, but exam-scoped: dashboard's own
    // version is intentionally global (all activity) and must stay unchanged.
    const examAttempts = await this.prisma.attempt.findMany({
      where: {
        studentId: userId,
        status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] },
        maxScore: { gt: 0 },
        testVersion: { test: { examId } },
      },
      select: { score: true, maxScore: true },
    });
    const testEfficiency = examAttempts.length
      ? Math.round((examAttempts.reduce((s, a) => s + ((a.score ?? 0) / a.maxScore) * 100, 0) / examAttempts.length))
      : 0;

    // Consistency (10%) — reuses dashboard's exact streak-week definition.
    const allProgress = await this.prisma.lessonProgress.findMany({ where: { studentId: userId }, select: { lastAccessedAt: true } });
    const streakWeek = computeStreakWeek(allProgress);
    const consistency = Math.round((streakWeek.filter(Boolean).length / 7) * 100);

    const score = Math.round(
      conceptMastery * WEIGHTS.conceptMastery +
        syllabusCoverage * WEIGHTS.syllabusCoverage +
        revisionRetention * WEIGHTS.revisionRetention +
        testEfficiency * WEIGHTS.testEfficiency +
        consistency * WEIGHTS.consistency,
    );

    return {
      available: true,
      score,
      breakdown: { conceptMastery, syllabusCoverage, revisionRetention, testEfficiency, consistency },
    };
  }
}
