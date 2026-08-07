import type { RoleKey } from './roles';

/** Account statuses relevant to authorization (mirrors Prisma AccountStatus). */
export type AccountStatus = 'INVITED' | 'PENDING_SETUP' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

/** Session assurance level. AAL2 = MFA-verified this session. */
export type AssuranceLevel = 'AAL1' | 'AAL2';

/** The scope dimensions a staff assignment can pin (extends in Phase 2+). */
export interface ScopeRef {
  orgId?: string;
  stateId?: string;
  examId?: string;
  courseId?: string;
  subjectId?: string;
  batchId?: string;
}

/** One resolved staff_assignments row: which scope this grant covers. */
export interface AssignmentScopeRow extends ScopeRef {
  scope: 'ORG' | 'STATE' | 'EXAM' | 'COURSE' | 'SUBJECT' | 'BATCH';
}

/** The authenticated actor, fully resolved from roles + assignments. */
export interface Principal {
  userId: string;
  kind: 'STUDENT' | 'STAFF';
  status: AccountStatus;
  roleKeys: RoleKey[];
  /** Union of permission codes granted by the principal's roles. */
  permissionCodes: ReadonlySet<string>;
  assignments: AssignmentScopeRow[];
  assurance: AssuranceLevel;
  isSuperAdmin: boolean;
  /** The institution this actor belongs to (tenant). Undefined = platform-level (e.g. Super Admin). */
  orgId?: string;
  /** Only meaningful when orgId is set — does that institution currently have
   *  an ACTIVE platform subscription (billing/billing.service.ts)? Undefined
   *  for org-less principals (Super Admin, Content Admin, students), who are
   *  never subject to this check regardless of value. */
  orgSubscriptionActive?: boolean;
}

/** The resource an action targets (optional for global endpoints). */
export interface ResourceContext {
  type?: string;
  /** For *_own permissions: who owns the resource. */
  ownerUserId?: string;
  /** Content lifecycle status, matched against the status table. */
  status?: string;
  /** The resource's own scope, matched against principal assignments. */
  scope?: ScopeRef;
}

export interface PolicyInput {
  principal: Principal;
  permission: string;
  resource?: ResourceContext;
  /** Demand step-up (MFA) for high-risk actions. */
  requireAssurance?: AssuranceLevel;
  /** Exempts this specific action from step 3's subscription-active check —
   *  for the small set of routes a Head must be able to reach WHILE their
   *  subscription is inactive/never-purchased, because they're how a Head
   *  escapes that state (submitting KYC, browsing plans, buying a plan).
   *  Without this, those routes were unreachable for exactly the orgs that
   *  need them: a never-subscribed org always denies course.manage here,
   *  before any KYC- or billing-specific logic runs. */
  bypassSubscriptionGate?: boolean;
}

export type DenyCode =
  | 'ACCOUNT_INACTIVE'
  | 'MISSING_PERMISSION'
  | 'SUBSCRIPTION_INACTIVE'
  | 'ASSURANCE_REQUIRED'
  | 'NOT_OWNER'
  | 'STATUS_FORBIDDEN'
  | 'OUT_OF_SCOPE';

export type PolicyDecision =
  | { allow: true }
  | { allow: false; code: DenyCode; reason: string };
