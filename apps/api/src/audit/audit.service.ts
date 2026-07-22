import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditInput {
  correlationId?: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
  reasonCode?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Append-only audit writer. Never stores secrets (passwords, OTPs, tokens).
 * The DB trigger (constraints.sql) enforces immutability at the storage layer.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        correlationId: input.correlationId ?? null,
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        result: input.result,
        reasonCode: input.reasonCode ?? null,
        before: (input.before as object) ?? undefined,
        after: (input.after as object) ?? undefined,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }
}
