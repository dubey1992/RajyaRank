import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Principal } from '@rajyarank/auth';
import type { AttemptResult, SaveAnswer, StartAttemptResponse, StudentTestListItem } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { isResponseCorrect } from '../question-bank/answer-shape';

const FULL_VERSION_INCLUDE = Prisma.validator<Prisma.TestVersionDefaultArgs>()({
  include: {
    test: { select: { orgId: true } },
    sections: {
      orderBy: { sequence: 'asc' },
      include: {
        questions: {
          orderBy: { sequence: 'asc' },
          include: { questionVersion: { include: { question: { include: { subject: true } } } } },
        },
      },
    },
  },
});
type FullVersion = Prisma.TestVersionGetPayload<typeof FULL_VERSION_INCLUDE>;

@Injectable()
export class StudentTestsService {
  constructor(private readonly prisma: PrismaService) {}

  private studentId(p: Principal): string {
    if (p.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');
    return p.userId;
  }

  /** A test's owning institute (Test.orgId, set from the creator's org at
   *  creation time) determines who can see/attempt it once published: an
   *  org-owned test is "assigned" to that institute's own enrolled students
   *  only, never to unaffiliated students or a different institute's — the
   *  same tenant-isolation rule already applied to institute course pricing
   *  (courses.service.ts's qualifiesForInstitute). A platform-owned test
   *  (orgId null, e.g. Content Admin's own tests) stays visible to everyone,
   *  same as a platform-owned course. */
  private orgScopeFilter(p: Principal) {
    return p.orgId ? { OR: [{ orgId: null }, { orgId: p.orgId }] } : { orgId: null };
  }

  async listTests(p: Principal): Promise<StudentTestListItem[]> {
    const studentId = this.studentId(p);
    const tests = await this.prisma.testVersion.findMany({
      where: { status: 'PUBLISHED', test: this.orgScopeFilter(p) },
      include: {
        test: { select: { titleHi: true, titleEn: true, type: true, examId: true } },
        sections: { select: { _count: { select: { questions: true } } } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });

    // Single-attempt policy (see startAttempt()): once completed, a test can
    // never be restarted, so the list needs to know which ones already have a
    // finished attempt to show "View results" instead of "Start test".
    const completedAttempts = await this.prisma.attempt.findMany({
      where: {
        studentId,
        testVersionId: { in: tests.map((tv) => tv.id) },
        status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] },
      },
      orderBy: { submittedAt: 'desc' },
      select: { id: true, testVersionId: true },
    });
    const completedByVersion = new Map<string, string>();
    for (const a of completedAttempts) {
      if (!completedByVersion.has(a.testVersionId)) completedByVersion.set(a.testVersionId, a.id);
    }

    return tests.map((tv) => ({
      testVersionId: tv.id,
      titleHi: tv.test.titleHi,
      titleEn: tv.test.titleEn,
      type: tv.test.type,
      durationMinutes: tv.durationMinutes,
      questionCount: tv.sections.reduce((n, s) => n + s._count.questions, 0),
      completedAttemptId: completedByVersion.get(tv.id) ?? null,
    }));
  }

  async startAttempt(p: Principal, testVersionId: string): Promise<StartAttemptResponse> {
    const studentId = this.studentId(p);
    const tv = await this.loadFullVersion(testVersionId);
    if (tv.status !== 'PUBLISHED') throw AppError.notFound('Test is not available.');
    // Same tenant-isolation rule as listTests() — not just hidden from the
    // list, actually unattemptable by a student outside the owning institute
    // (or with no institute at all), even if they already have the id.
    if (tv.test.orgId && tv.test.orgId !== p.orgId) throw AppError.notFound('Test is not available.');

    const now = Date.now();
    if (tv.availableFrom && tv.availableFrom.getTime() > now) throw AppError.conflict('Test has not opened yet.');
    if (tv.availableTo && tv.availableTo.getTime() < now) throw AppError.conflict('Test window has closed.');

    const attempt = await this.resolveAttempt(studentId, testVersionId, tv, now);

    const sections = tv.sections.map((s) => ({
      id: s.id,
      nameHi: s.nameHi,
      nameEn: s.nameEn,
      questions: maybeShuffle(s.questions, tv.randomizeQuestions).map((tq) => ({
        questionVersionId: tq.questionVersionId,
        type: tq.questionVersion.type,
        textHi: tq.questionVersion.textHi,
        textEn: tq.questionVersion.textEn,
        // options WITHOUT correctAnswer/explanation — never leaked before release
        options: sanitizeOptions(tq.questionVersion.options, tv.randomizeOptions),
        marks: tq.marks ?? tq.questionVersion.marks,
        negativeMarks: tv.negativeMarking ? (tq.negativeMarks ?? tq.questionVersion.negativeMarks) : 0,
      })),
    }));

    return { attemptId: attempt.id, expiresAt: attempt.expiresAt.toISOString(), durationMinutes: tv.durationMinutes, sections };
  }

  async saveAnswer(p: Principal, attemptId: string, questionVersionId: string, dto: SaveAnswer) {
    const studentId = this.studentId(p);
    const attempt = await this.prisma.attempt.findFirst({ where: { id: attemptId, studentId } });
    if (!attempt) throw AppError.notFound('Attempt not found.');
    if (attempt.status !== 'IN_PROGRESS') throw AppError.conflict('Attempt already submitted.');
    if (attempt.expiresAt.getTime() < Date.now()) throw AppError.conflict('Time is up.');

    await this.prisma.attemptAnswer.upsert({
      where: { attemptId_questionVersionId: { attemptId, questionVersionId } },
      update: { response: dto.response as object, markedForReview: dto.markedForReview ?? false, sequenceNo: dto.sequenceNo },
      create: { attemptId, questionVersionId, response: dto.response as object, markedForReview: dto.markedForReview ?? false, sequenceNo: dto.sequenceNo },
    });
    return { saved: true };
  }

  async submit(p: Principal, attemptId: string): Promise<AttemptResult> {
    const studentId = this.studentId(p);
    const attempt = await this.prisma.attempt.findFirst({ where: { id: attemptId, studentId } });
    if (!attempt) throw AppError.notFound('Attempt not found.');
    if (attempt.status !== 'IN_PROGRESS') return this.result(p, attemptId);

    const tv = await this.loadFullVersion(attempt.testVersionId);
    const answers = await this.prisma.attemptAnswer.findMany({ where: { attemptId } });
    const answerByQ = new Map(answers.map((a) => [a.questionVersionId, a]));

    let score = 0;
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    const perAnswerUpdates: { id: string; isCorrect: boolean; awarded: number }[] = [];

    for (const section of tv.sections) {
      for (const tq of section.questions) {
        const qv = tq.questionVersion;
        const marks = tq.marks ?? qv.marks;
        const neg = tv.negativeMarking ? (tq.negativeMarks ?? qv.negativeMarks) : 0;
        const ans = answerByQ.get(qv.id);
        const responded = ans && ans.response !== null && ans.response !== undefined;
        if (!responded) {
          unanswered += 1;
          continue;
        }
        const ok = isResponseCorrect(qv.type, qv.correctAnswer, ans!.response);
        const awarded = ok ? marks : -neg;
        score += awarded;
        if (ok) correct += 1;
        else incorrect += 1;
        perAnswerUpdates.push({ id: ans!.id, isCorrect: ok, awarded });
      }
    }

    const answeredTotal = correct + incorrect;
    const accuracy = answeredTotal ? Math.round((correct / answeredTotal) * 100) : 0;
    const autoSubmitted = attempt.expiresAt.getTime() < Date.now();

    await this.prisma.$transaction([
      this.prisma.attempt.update({
        where: { id: attemptId },
        data: {
          status: autoSubmitted ? 'AUTO_SUBMITTED' : 'SUBMITTED',
          submittedAt: new Date(),
          score,
          correctCount: correct,
          incorrectCount: incorrect,
          unansweredCount: unanswered,
          accuracy,
        },
      }),
      ...perAnswerUpdates.map((u) =>
        this.prisma.attemptAnswer.update({ where: { id: u.id }, data: { isCorrect: u.isCorrect, awarded: u.awarded } }),
      ),
    ]);

    return this.result(p, attemptId);
  }

  async result(p: Principal, attemptId: string): Promise<AttemptResult> {
    const studentId = this.studentId(p);
    const attempt = await this.prisma.attempt.findFirst({ where: { id: attemptId, studentId } });
    if (!attempt) throw AppError.notFound('Attempt not found.');
    const tv = await this.loadFullVersion(attempt.testVersionId);
    const released = this.isReleased(tv.resultRelease, tv.availableTo, attempt.status);

    // subject-wise analysis
    const answers = await this.prisma.attemptAnswer.findMany({ where: { attemptId } });
    const answerByQ = new Map(answers.map((a) => [a.questionVersionId, a]));
    const bySubject = new Map<string, { correct: number; total: number }>();
    const questions: NonNullable<AttemptResult['questions']> = [];

    for (const section of tv.sections) {
      for (const tq of section.questions) {
        const qv = tq.questionVersion;
        const subject = qv.question.subject.nameEn;
        const agg = bySubject.get(subject) ?? { correct: 0, total: 0 };
        agg.total += 1;
        const ans = answerByQ.get(qv.id);
        if (ans?.isCorrect) agg.correct += 1;
        bySubject.set(subject, agg);
        if (released) {
          questions.push({
            questionVersionId: qv.id,
            type: qv.type,
            textHi: qv.textHi,
            textEn: qv.textEn,
            // Same deterministic shuffle as startAttempt() showed, so the
            // review's option order matches what the student actually saw.
            options: sanitizeOptions(qv.options, tv.randomizeOptions),
            response: ans?.response ?? null,
            isCorrect: ans?.isCorrect ?? null,
            awarded: ans?.awarded ?? null,
            correctAnswer: qv.correctAnswer,
            explanationHi: qv.explanationHi,
            explanationEn: qv.explanationEn,
          });
        }
      }
    }

    // Rank + percentile across all submitted attempts for this test version.
    const submitted = attempt.status !== 'IN_PROGRESS';
    const myScore = attempt.score ?? 0;
    let rank: number | null = null;
    let percentile: number | null = null;
    let totalAttempts = 0;
    if (submitted) {
      const peers = await this.prisma.attempt.findMany({
        where: { testVersionId: attempt.testVersionId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] } },
        select: { score: true },
      });
      totalAttempts = peers.length;
      const higher = peers.filter((pr) => (pr.score ?? 0) > myScore).length;
      const lower = peers.filter((pr) => (pr.score ?? 0) < myScore).length;
      rank = higher + 1;
      percentile = totalAttempts > 1 ? Math.round((lower / totalAttempts) * 100) : null;
    }

    // Pass/fail against the configured passing score (% of maxScore).
    const passingScore = tv.passingScore ?? null;
    const passed =
      passingScore != null && attempt.maxScore > 0 && submitted
        ? (myScore / attempt.maxScore) * 100 >= passingScore
        : null;

    return {
      status: attempt.status,
      score: attempt.score ?? 0,
      maxScore: attempt.maxScore,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      unansweredCount: attempt.unansweredCount,
      accuracy: attempt.accuracy ?? 0,
      released,
      passingScore,
      passed,
      rank,
      percentile,
      totalAttempts,
      subjectAnalysis: [...bySubject.entries()].map(([subject, v]) => ({ subject, correct: v.correct, total: v.total })),
      questions: released ? questions : undefined,
    };
  }

  /** Resolve (resume-or-create) the attempt to serve, atomically enough that
   *  two concurrent start calls for the same student+test — e.g. React
   *  StrictMode's double-effect in dev, a double-click, or a duplicate tab —
   *  can never both create a fresh attempt. Without Serializable isolation,
   *  two transactions can each read "no active/completed attempt yet" before
   *  either commits its INSERT, producing two IN_PROGRESS rows — one of
   *  which then silently bypasses the single-attempt policy the next time the
   *  student opens the test. On a serialization failure we simply retry once:
   *  the losing transaction's INSERT can just re-read the winner's now-committed
   *  row and resume it. */
  private async resolveAttempt(studentId: string, testVersionId: string, tv: FullVersion, now: number, retried = false): Promise<{ id: string; expiresAt: Date }> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const active = await tx.attempt.findFirst({
            where: { studentId, testVersionId, status: 'IN_PROGRESS', expiresAt: { gt: new Date() } },
          });
          if (active) return active;

          // Single-attempt policy: once a test has been submitted, it can
          // never be restarted — the student can only view their result from
          // here on. This takes priority over (and effectively supersedes)
          // attemptLimit, which only bounded *retries* under the old
          // multi-attempt model.
          const completed = await tx.attempt.findFirst({
            where: { studentId, testVersionId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] } },
          });
          if (completed) throw AppError.conflict('You have already completed this test — it cannot be retaken.');
          if (tv.attemptLimit) {
            const used = await tx.attempt.count({ where: { studentId, testVersionId } });
            if (used >= tv.attemptLimit) throw AppError.conflict('Attempt limit reached.');
          }
          return tx.attempt.create({
            data: {
              studentId,
              testVersionId,
              status: 'IN_PROGRESS',
              expiresAt: new Date(now + tv.durationMinutes * 60_000),
              maxScore: this.computeMaxScore(tv),
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      if (!retried && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') {
        return this.resolveAttempt(studentId, testVersionId, tv, now, true);
      }
      throw e;
    }
  }

  private isReleased(policy: string, availableTo: Date | null, status: string): boolean {
    if (status === 'IN_PROGRESS') return false;
    if (policy === 'IMMEDIATE') return true;
    if (policy === 'AFTER_WINDOW') return availableTo ? availableTo.getTime() < Date.now() : true;
    return false; // MANUAL
  }

  private computeMaxScore(tv: FullVersion): number {
    let total = 0;
    for (const s of tv.sections) for (const tq of s.questions) total += tq.marks ?? tq.questionVersion.marks;
    return total;
  }

  private async loadFullVersion(testVersionId: string): Promise<FullVersion> {
    const tv = await this.prisma.testVersion.findUnique({ where: { id: testVersionId }, ...FULL_VERSION_INCLUDE });
    if (!tv) throw AppError.notFound('Test not found.');
    return tv;
  }
}

function maybeShuffle<T>(arr: T[], shuffle: boolean): T[] {
  if (!shuffle) return arr;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(((i + 1) * hashByIndex(i)) % (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
// Deterministic pseudo-shuffle offset (avoids Math.random per env constraints in workers/tests).
function hashByIndex(i: number): number {
  const x = Math.sin(i + 1) * 10000;
  return Math.abs(x - Math.floor(x));
}

function sanitizeOptions(options: unknown, shuffle: boolean): { key: string; hi?: string; en?: string }[] {
  const opts = Array.isArray(options) ? (options as { key: string; hi?: string; en?: string }[]) : [];
  const mapped = opts.map((o) => ({ key: o.key, hi: o.hi, en: o.en }));
  return maybeShuffle(mapped, shuffle);
}
