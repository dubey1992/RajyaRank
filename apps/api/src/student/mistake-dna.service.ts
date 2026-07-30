import { Injectable } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';
import type { MistakeDnaView, MistakeType } from '@rajyarank/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { MISTAKE_LOOKBACK_DAYS } from './study-plan.service';

const TYPE_ORDER: MistakeType[] = ['CONCEPT_GAP', 'SLOW_CALCULATION', 'GUESSING', 'MISREAD'];

/** "Mistake DNA" breakdown (Mistake Coach, Phase 2) — a read-only aggregation
 *  over the same recent window study-plan.service.ts uses to pick a
 *  MISTAKE_DRILL target, so the dashboard card and the plan agree. */
@Injectable()
export class MistakeDnaService {
  constructor(private readonly prisma: PrismaService) {}

  private studentId(p: Principal): string {
    if (p.kind !== 'STUDENT') throw AppError.permissionDenied('Student account required.');
    return p.userId;
  }

  async mistakeDna(p: Principal): Promise<MistakeDnaView> {
    const studentId = this.studentId(p);
    const cutoff = new Date(Date.now() - MISTAKE_LOOKBACK_DAYS * 86_400_000);
    const attempts = await this.prisma.attempt.findMany({
      where: { studentId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] }, submittedAt: { gte: cutoff } },
      select: { id: true },
    });
    const wrong = attempts.length
      ? await this.prisma.attemptAnswer.findMany({
          where: { attemptId: { in: attempts.map((a) => a.id) }, mistakeType: { not: null } },
          select: { mistakeType: true },
        })
      : [];
    if (!wrong.length) return { available: false, reason: 'NO_RECENT_MISTAKES' };

    const counts = new Map<MistakeType, number>(TYPE_ORDER.map((t) => [t, 0]));
    for (const w of wrong) counts.set(w.mistakeType!, (counts.get(w.mistakeType!) ?? 0) + 1);
    const totalWrong = wrong.length;
    const byType = TYPE_ORDER.map((type) => ({ type, count: counts.get(type)!, percent: Math.round((counts.get(type)! / totalWrong) * 100) }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count || TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));

    return { available: true, windowDays: MISTAKE_LOOKBACK_DAYS, totalWrong, byType };
  }
}
