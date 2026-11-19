import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type {
  BulkImportResult,
  PersonalQuizAttemptResult,
  PersonalQuizDetail,
  PersonalQuizInput,
  PersonalQuizQuestionInput,
  PersonalQuizView,
  SubmitPersonalQuizAttempt,
} from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { isResponseCorrect, validateAnswerShape } from '../question-bank/answer-shape';
import { StudyPlanService } from './study-plan.service';

/** Deterministic text-template parser — no AI. Splits on lines starting
 *  "Q:" (a "---" separator line is accepted but optional/ignored), then
 *  reads "A) text" / "B) text" option lines, an "Answer: A" or
 *  "Answer: A,C" line (comma-separated keys -> MULTIPLE_CHOICE, one key ->
 *  SINGLE_CHOICE — True/False is just a 2-option SINGLE_CHOICE in this
 *  format, no separate type guessing), and an optional "Explanation: ..."
 *  line. Returns one PersonalQuizQuestionInput per well-formed block;
 *  malformed blocks are reported, not silently dropped, so the student
 *  knows exactly which question(s) to fix and resubmit. */
export function parseQuestionBlocks(raw: string): { questions: PersonalQuizQuestionInput[]; errors: { block: number; message: string }[] } {
  const lines = raw.split('\n');
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (/^Q:/i.test(line.trim())) {
      if (current.length) blocks.push(current);
      current = [line];
    } else if (line.trim() === '---') {
      continue;
    } else if (current.length) {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  const questions: PersonalQuizQuestionInput[] = [];
  const errors: { block: number; message: string }[] = [];
  blocks.forEach((blockLines, i) => {
    const text = blockLines[0]!.replace(/^Q:/i, '').trim();
    if (!text) { errors.push({ block: i + 1, message: 'Empty question text.' }); return; }

    const options: { key: string; text: string }[] = [];
    let correctKeys: string[] = [];
    let explanation: string | undefined;
    for (const line of blockLines.slice(1)) {
      const opt = line.trim().match(/^([A-Za-z0-9]+)\)\s*(.+)$/);
      const ans = line.trim().match(/^Answer:\s*(.+)$/i);
      const exp = line.trim().match(/^Explanation:\s*(.+)$/i);
      if (opt) options.push({ key: opt[1]!, text: opt[2]!.trim() });
      else if (ans) correctKeys = ans[1]!.split(',').map((k) => k.trim().toUpperCase()).filter(Boolean);
      else if (exp) explanation = exp[1]!.trim();
    }

    if (options.length < 2) { errors.push({ block: i + 1, message: `"${text.slice(0, 40)}" needs at least two "A) option" lines.` }); return; }
    if (!correctKeys.length) { errors.push({ block: i + 1, message: `"${text.slice(0, 40)}" is missing an "Answer:" line.` }); return; }
    const optionKeys = new Set(options.map((o) => o.key.toUpperCase()));
    if (!correctKeys.every((k) => optionKeys.has(k))) { errors.push({ block: i + 1, message: `"${text.slice(0, 40)}"'s Answer key isn't among its own options.` }); return; }

    questions.push({
      type: correctKeys.length > 1 ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE',
      text,
      options,
      correctAnswer: correctKeys,
      explanation,
    });
  });

  return { questions, errors };
}

/**
 * Student-authored practice quizzes — the personal-practice-test half of the
 * independent-study-plan feature. Deliberately its own flat tables
 * (PersonalQuiz/PersonalQuizQuestion/PersonalQuizAttempt), never touching
 * Question/QuestionVersion/Test/TestVersion/Attempt or their staff-approval
 * workflow — see schema.prisma's own comment on PersonalQuiz. Scoring reuses
 * question-bank/answer-shape.ts's pure functions unmodified.
 */
@Injectable()
export class PersonalQuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studyPlan: StudyPlanService,
  ) {}

  private studentId(p: Principal): string {
    if (p.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');
    return p.userId;
  }

  async list(p: Principal): Promise<PersonalQuizView[]> {
    const studentId = this.studentId(p);
    const quizzes = await this.prisma.personalQuiz.findMany({
      where: { studentId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { questions: { select: { id: true } }, attempts: { where: { submittedAt: { not: null } }, select: { score: true, maxScore: true } } },
    });
    return quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      customTopicId: q.customTopicId,
      questionCount: q.questions.length,
      bestScore: q.attempts.length ? Math.max(...q.attempts.map((a) => (a.maxScore > 0 ? (a.score ?? 0) / a.maxScore : 0))) * 100 : null,
      createdAt: q.createdAt.toISOString(),
    }));
  }

  async create(p: Principal, dto: PersonalQuizInput): Promise<PersonalQuizView> {
    const studentId = this.studentId(p);
    if (dto.customTopicId) {
      const topic = await this.prisma.customTopic.findFirst({ where: { id: dto.customTopicId, studentId, deletedAt: null } });
      if (!topic) throw AppError.notFound('Topic not found.');
    }
    const quiz = await this.prisma.personalQuiz.create({
      data: { studentId, title: dto.title, customTopicId: dto.customTopicId ?? null },
    });
    return { id: quiz.id, title: quiz.title, customTopicId: quiz.customTopicId, questionCount: 0, bestScore: null, createdAt: quiz.createdAt.toISOString() };
  }

  private async requireOwnedQuiz(studentId: string, quizId: string) {
    const quiz = await this.prisma.personalQuiz.findFirst({ where: { id: quizId, studentId, deletedAt: null } });
    if (!quiz) throw AppError.notFound('Quiz not found.');
    return quiz;
  }

  /** Owner-only detail view — includes correctAnswer/explanation, since this
   *  is the quiz EDITOR, not the take-quiz screen (see startAttempt's view,
   *  which deliberately strips both so a student can't read answers off the
   *  network tab mid-attempt). */
  async detail(p: Principal, quizId: string): Promise<PersonalQuizDetail> {
    const studentId = this.studentId(p);
    const quiz = await this.requireOwnedQuiz(studentId, quizId);
    const questions = await this.prisma.personalQuizQuestion.findMany({ where: { quizId }, orderBy: { sequence: 'asc' } });
    const attempts = await this.prisma.personalQuizAttempt.findMany({ where: { quizId, submittedAt: { not: null } }, select: { score: true, maxScore: true } });
    return {
      id: quiz.id,
      title: quiz.title,
      customTopicId: quiz.customTopicId,
      questionCount: questions.length,
      bestScore: attempts.length ? Math.max(...attempts.map((a) => (a.maxScore > 0 ? (a.score ?? 0) / a.maxScore : 0))) * 100 : null,
      createdAt: quiz.createdAt.toISOString(),
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options as { key: string; text: string }[],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        sequence: q.sequence,
        generatedByAi: q.generatedByAi,
      })),
    };
  }

  async addQuestion(p: Principal, quizId: string, dto: PersonalQuizQuestionInput) {
    const studentId = this.studentId(p);
    await this.requireOwnedQuiz(studentId, quizId);
    // Same shape-validation a staff-authored question goes through — a
    // student's quiz question gets no looser a check than the real bank.
    validateAnswerShape(dto.type, dto.options, dto.correctAnswer);
    const count = await this.prisma.personalQuizQuestion.count({ where: { quizId } });
    return this.prisma.personalQuizQuestion.create({
      data: {
        quizId,
        type: dto.type,
        text: dto.text,
        options: dto.options,
        correctAnswer: dto.correctAnswer as object,
        explanation: dto.explanation ?? null,
        sequence: count,
      },
    });
  }

  /** Bulk import from a pasted or uploaded (client reads the .txt file,
   *  sends its text) block of questions — see parseQuestionBlocks' own doc
   *  comment for the template. Each parsed question still goes through
   *  validateAnswerShape() individually before anything is written — the
   *  parser's own options/correctAnswer cross-check is a first pass, not a
   *  substitute for the real shape guard every other question-creation path
   *  already goes through. */
  async bulkImportQuestions(p: Principal, quizId: string, text: string): Promise<BulkImportResult> {
    const studentId = this.studentId(p);
    await this.requireOwnedQuiz(studentId, quizId);
    const { questions, errors } = parseQuestionBlocks(text);

    const startCount = await this.prisma.personalQuizQuestion.count({ where: { quizId } });
    const rows: { quizId: string; type: PersonalQuizQuestionInput['type']; text: string; options: object; correctAnswer: object; explanation: string | null; sequence: number }[] = [];
    questions.forEach((q, i) => {
      try {
        validateAnswerShape(q.type, q.options, q.correctAnswer);
        rows.push({ quizId, type: q.type, text: q.text, options: q.options, correctAnswer: q.correctAnswer as object, explanation: q.explanation ?? null, sequence: startCount + rows.length });
      } catch (e) {
        errors.push({ block: i + 1, message: e instanceof Error ? e.message : 'Invalid question.' });
      }
    });

    if (rows.length) await this.prisma.personalQuizQuestion.createMany({ data: rows });
    return { imported: rows.length, errors };
  }

  async deleteQuestion(p: Principal, quizId: string, questionId: string) {
    const studentId = this.studentId(p);
    await this.requireOwnedQuiz(studentId, quizId);
    const q = await this.prisma.personalQuizQuestion.findFirst({ where: { id: questionId, quizId } });
    if (!q) throw AppError.notFound('Question not found.');
    await this.prisma.personalQuizQuestion.delete({ where: { id: questionId } });
    return { deleted: true };
  }

  async deleteQuiz(p: Principal, quizId: string) {
    const studentId = this.studentId(p);
    await this.requireOwnedQuiz(studentId, quizId);
    await this.prisma.personalQuiz.update({ where: { id: quizId }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  /** Take-quiz view — no correctAnswer/explanation, matching the real test
   *  runner's own non-leaking contract. Needs at least one question. */
  async startAttempt(p: Principal, quizId: string) {
    const studentId = this.studentId(p);
    await this.requireOwnedQuiz(studentId, quizId);
    const questions = await this.prisma.personalQuizQuestion.findMany({ where: { quizId }, orderBy: { sequence: 'asc' } });
    if (!questions.length) throw AppError.conflict('Add at least one question before taking this quiz.');
    const attempt = await this.prisma.personalQuizAttempt.create({
      data: { quizId, studentId, maxScore: questions.length },
    });
    return {
      attemptId: attempt.id,
      questions: questions.map((q) => ({ id: q.id, type: q.type, text: q.text, options: q.options as { key: string; text: string }[], sequence: q.sequence, generatedByAi: q.generatedByAi })),
    };
  }

  /** Scores immediately on submit — one point per question, no negative
   *  marking (informal self-made content, unlike the real Test model). */
  async submitAttempt(p: Principal, attemptId: string, dto: SubmitPersonalQuizAttempt): Promise<PersonalQuizAttemptResult> {
    const studentId = this.studentId(p);
    const attempt = await this.prisma.personalQuizAttempt.findFirst({ where: { id: attemptId, studentId } });
    if (!attempt) throw AppError.notFound('Attempt not found.');
    if (attempt.submittedAt) throw AppError.conflict('This attempt was already submitted.');

    const questions = await this.prisma.personalQuizQuestion.findMany({ where: { quizId: attempt.quizId } });
    let score = 0;
    const breakdown: PersonalQuizAttemptResult['breakdown'] = [];
    for (const q of questions) {
      const response = dto.answers[q.id];
      const ok = isResponseCorrect(q.type, q.correctAnswer, response);
      if (ok) score += 1;
      breakdown.push({ questionId: q.id, correct: ok, explanation: q.explanation });
    }

    const updated = await this.prisma.personalQuizAttempt.update({
      where: { id: attemptId },
      data: { answers: dto.answers as object, score, submittedAt: new Date() },
    });

    // Revision linking: a wrong answer on a topic-linked quiz auto-adds a
    // follow-up study slot for that topic — see StudyPlanService's own
    // scheduleRevision() doc comment. No-op for an un-linked quiz or a
    // perfect score.
    let revisionScheduledFor: string | null = null;
    const quiz = await this.prisma.personalQuiz.findUnique({ where: { id: attempt.quizId }, select: { customTopicId: true } });
    if (quiz?.customTopicId && breakdown.some((b) => !b.correct)) {
      revisionScheduledFor = await this.studyPlan.scheduleRevision(studentId, quiz.customTopicId);
    }

    return { id: updated.id, quizId: updated.quizId, score, maxScore: updated.maxScore, submittedAt: updated.submittedAt!.toISOString(), breakdown, revisionScheduledFor };
  }
}
