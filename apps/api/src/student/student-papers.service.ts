import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type {
  CreateStudentPaper,
  PyqPaperDownload,
  StudentPaperAttemptResult,
  StudentPaperView,
  SubmitStudentPaperAttempt,
} from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { AssetsService } from '../assets/assets.service';
import { S3Service } from '../s3/s3.service';

/** Parses a lenient free-text answer key ("1:A, 2:C, 3:B" or one per line,
 *  "1) A" / "1. A" / "1 - A" all accepted) into { [questionNumber]: key }.
 *  Unparseable lines are silently skipped rather than rejecting the whole
 *  paste — a student typo in one line shouldn't block the other 49. */
export function parseAnswerKeyText(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = raw.split(/[,\n]/);
  for (const part of parts) {
    const m = part.trim().match(/^(\d+)\s*[:.)-]?\s*([A-Za-z0-9]+)$/);
    if (m) out[m[1]!] = m[2]!.toUpperCase();
  }
  return out;
}

/**
 * Student-uploaded previous-year papers — deliberately separate from
 * PreviousYearPaper/staff/pyq-papers: no exam-catalog requirement, no
 * approval workflow, see StudentPaper's own schema.prisma comment. Reuses
 * AssetsService's upload-intent/complete methods unmodified (same ones
 * staff/assets already calls) — only the controller route differs.
 */
@Injectable()
export class StudentPapersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetsService,
    private readonly s3: S3Service,
  ) {}

  private studentId(p: Principal): string {
    if (p.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');
    return p.userId;
  }

  /** The explicit count if the student set one, else derived from the
   *  answer key's own length — so the answer sheet always knows how many
   *  slots to render as long as EITHER was ever provided. */
  private effectiveQuestionCount(paper: { questionCount: number | null; answerKey: unknown }): number | null {
    if (paper.questionCount) return paper.questionCount;
    const key = paper.answerKey as Record<string, string> | null;
    return key && Object.keys(key).length ? Object.keys(key).length : null;
  }

  createUploadIntent(p: Principal, dto: { fileName: string; mimeType: string; sizeBytes: number }) {
    this.studentId(p); // just the account-kind check; AssetsService scopes by principal.userId itself
    return this.assets.createIntent(p, { assetType: 'DOCUMENT', ...dto });
  }

  completeUpload(p: Principal, assetId: string, checksum?: string) {
    this.studentId(p);
    return this.assets.complete(p, assetId, checksum);
  }

  async list(p: Principal): Promise<StudentPaperView[]> {
    const studentId = this.studentId(p);
    const papers = await this.prisma.studentPaper.findMany({
      where: { studentId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { attempts: { where: { score: { not: null } }, select: { score: true, maxScore: true } } },
    });
    return papers.map((pap) => ({
      id: pap.id,
      title: pap.title,
      year: pap.year,
      questionCount: this.effectiveQuestionCount(pap),
      hasAnswerKey: !!pap.answerKey && Object.keys(pap.answerKey as object).length > 0,
      assetId: pap.assetId,
      bestScore: pap.attempts.length
        ? Math.max(...pap.attempts.map((a) => (a.maxScore! > 0 ? (a.score! / a.maxScore!) * 100 : 0)))
        : null,
      createdAt: pap.createdAt.toISOString(),
    }));
  }

  async create(p: Principal, dto: CreateStudentPaper): Promise<StudentPaperView> {
    const studentId = this.studentId(p);
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: dto.assetId } });
    if (!asset || asset.ownerUserId !== studentId) throw AppError.notFound('Uploaded file not found.');
    if (asset.status !== 'READY') throw AppError.conflict('Upload is not ready yet.');

    const answerKey = dto.answerKeyText ? parseAnswerKeyText(dto.answerKeyText) : null;
    const paper = await this.prisma.studentPaper.create({
      data: {
        studentId,
        title: dto.title,
        examId: dto.examId ?? null,
        year: dto.year ?? null,
        questionCount: dto.questionCount ?? null,
        assetId: dto.assetId,
        answerKey: answerKey && Object.keys(answerKey).length ? answerKey : undefined,
      },
    });
    return {
      id: paper.id,
      title: paper.title,
      year: paper.year,
      questionCount: this.effectiveQuestionCount(paper),
      hasAnswerKey: !!paper.answerKey,
      assetId: paper.assetId,
      bestScore: null,
      createdAt: paper.createdAt.toISOString(),
    };
  }

  private async requireOwnedPaper(studentId: string, paperId: string) {
    const paper = await this.prisma.studentPaper.findFirst({ where: { id: paperId, studentId, deletedAt: null } });
    if (!paper) throw AppError.notFound('Paper not found.');
    return paper;
  }

  async deletePaper(p: Principal, paperId: string) {
    const studentId = this.studentId(p);
    await this.requireOwnedPaper(studentId, paperId);
    await this.prisma.studentPaper.update({ where: { id: paperId }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  /** A short-lived read URL for the uploaded PDF — same presigned-GET
   *  convention as PreviousYearPapersService.downloadForStudent: fresh per
   *  request, never a permanently public URL. */
  async downloadUrl(p: Principal, paperId: string): Promise<PyqPaperDownload> {
    const studentId = this.studentId(p);
    const paper = await this.requireOwnedPaper(studentId, paperId);
    const asset = await this.prisma.mediaAsset.findUniqueOrThrow({ where: { id: paper.assetId } });
    if (!asset.storageKey) throw AppError.conflict('File is not ready yet.');
    const expiresInSeconds = 300;
    const url = await this.s3.presignGet(asset.storageKey, expiresInSeconds);
    return { url, expiresInSeconds };
  }

  async startAttempt(p: Principal, paperId: string) {
    const studentId = this.studentId(p);
    const paper = await this.requireOwnedPaper(studentId, paperId);
    const questionCount = this.effectiveQuestionCount(paper);
    if (!questionCount) throw AppError.conflict('Set a question count or answer key before taking a timed practice.');
    const attempt = await this.prisma.studentPaperAttempt.create({
      data: { paperId, studentId },
    });
    return { attemptId: attempt.id, assetId: paper.assetId, questionCount };
  }

  /** Scores only when the paper has an answer key — a question-by-question
   *  key comparison, no question bank involved. No key = submitted but left
   *  unscored (score/maxScore stay null), surfaced to the student as "submit
   *  for manual review", never guessed at. */
  async submitAttempt(p: Principal, attemptId: string, dto: SubmitStudentPaperAttempt): Promise<StudentPaperAttemptResult> {
    const studentId = this.studentId(p);
    const attempt = await this.prisma.studentPaperAttempt.findFirst({ where: { id: attemptId, studentId } });
    if (!attempt) throw AppError.notFound('Attempt not found.');
    if (attempt.submittedAt) throw AppError.conflict('This attempt was already submitted.');

    const paper = await this.prisma.studentPaper.findUniqueOrThrow({ where: { id: attempt.paperId } });
    const answerKey = paper.answerKey as Record<string, string> | null;

    let score: number | null = null;
    let maxScore: number | null = null;
    if (answerKey && Object.keys(answerKey).length) {
      maxScore = Object.keys(answerKey).length;
      score = 0;
      for (const [qNum, correctKey] of Object.entries(answerKey)) {
        if ((dto.answers[qNum] ?? '').trim().toUpperCase() === correctKey) score += 1;
      }
    }

    const updated = await this.prisma.studentPaperAttempt.update({
      where: { id: attemptId },
      data: { answers: dto.answers, score, maxScore, submittedAt: new Date() },
    });
    return { id: updated.id, paperId: updated.paperId, score: updated.score, maxScore: updated.maxScore, submittedAt: updated.submittedAt!.toISOString() };
  }
}
