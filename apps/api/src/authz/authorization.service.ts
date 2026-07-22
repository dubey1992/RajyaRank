import { Injectable } from '@nestjs/common';
import {
  buildPrincipal,
  evaluate,
  type AssignmentScopeRow,
  type Principal,
  type PolicyDecision,
  type ResourceContext,
  type RoleKey,
} from '@rajyarank/auth';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';

/**
 * The one place authorization decisions are made. Builds the Principal from
 * persisted roles/assignments (cached in Redis, busted by User.permVersion),
 * runs the pure policy engine, and audits denied high-risk attempts.
 */
@Injectable()
export class AuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  /** Resolve a fully-populated Principal for a user + current session assurance.
   *  Permission codes are resolved live from Role→RolePermission→Permission —
   *  the DB is the source of truth (Super Admin's Permission Matrix edits
   *  RolePermission rows directly), not the ROLE_PERMISSIONS map in
   *  @rajyarank/auth (that map is only ever used once, to seed a fresh role). */
  async resolvePrincipal(userId: string, assurance: 'AAL1' | 'AAL2'): Promise<Principal | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        assignments: { where: { deletedAt: null } },
      },
    });
    if (!user) return null;

    // Fold every held role's permVersion into the cache key so a Permission
    // Matrix edit is picked up on the next request, not just after the 300s
    // TTL backstop — mirrors the existing per-user permVersion pattern.
    const roleVersions = user.roles.map((r) => r.role.permVersion).sort((a, b) => a - b).join('.');
    const cacheKey = `princ:${userId}:v${user.permVersion}:rv${roleVersions}:${assurance}`;
    const cached = await this.redis.client.get(cacheKey);
    if (cached) return deserialize(cached);

    const roleKeys = user.roles.map((r) => r.role.key as RoleKey);
    const permissionCodes = new Set<string>();
    for (const r of user.roles) for (const rp of r.role.permissions) permissionCodes.add(rp.permission.code);
    const assignments: AssignmentScopeRow[] = user.assignments.map((a) => ({
      scope: a.scope,
      orgId: a.orgId ?? undefined,
      stateId: a.stateId ?? undefined,
      examId: a.examId ?? undefined,
      courseId: a.courseId ?? undefined,
      subjectId: a.subjectId ?? undefined,
      batchId: a.batchId ?? undefined,
    }));

    const principal = buildPrincipal({
      userId: user.id,
      kind: user.kind,
      status: user.status,
      roleKeys,
      permissionCodes,
      assignments,
      assurance,
      orgId: user.orgId ?? undefined,
    });

    await this.redis.client.set(cacheKey, serialize(principal), 'EX', 300);
    return principal;
  }

  /** Bump the permission version so cached principals are invalidated. */
  async invalidate(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { permVersion: { increment: 1 } } });
  }

  /** Bump a role's permission version — invalidates every cached principal for
   *  every user holding this role, immediately, without a fan-out per-user update. */
  async invalidateRole(roleId: string): Promise<void> {
    await this.prisma.role.update({ where: { id: roleId }, data: { permVersion: { increment: 1 } } });
  }

  check(
    principal: Principal,
    permission: string,
    resource?: ResourceContext,
    assurance?: 'AAL2',
  ): PolicyDecision {
    return evaluate({ principal, permission, resource, requireAssurance: assurance });
  }

  async auditDenied(args: {
    principal: Principal;
    permission: string;
    decision: Extract<PolicyDecision, { allow: false }>;
    correlationId?: string;
    ip?: string | null;
    userAgent?: string | null;
    targetType?: string | null;
    targetId?: string | null;
  }): Promise<void> {
    await this.audit.record({
      correlationId: args.correlationId,
      actorUserId: args.principal.userId,
      actorRole: args.principal.roleKeys.join(','),
      action: `authz.denied:${args.permission}`,
      targetType: args.targetType ?? null,
      targetId: args.targetId ?? null,
      result: 'DENIED',
      reasonCode: 'PERMISSION_DENIED',
      after: { denyCode: args.decision.code },
      ip: args.ip,
      userAgent: args.userAgent,
    });
  }
}

function serialize(p: Principal): string {
  return JSON.stringify({ ...p, permissionCodes: [...p.permissionCodes] });
}
function deserialize(raw: string): Principal {
  const obj = JSON.parse(raw) as Omit<Principal, 'permissionCodes'> & { permissionCodes: string[] };
  return { ...obj, permissionCodes: new Set(obj.permissionCodes) };
}
