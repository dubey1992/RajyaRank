import type { AssignmentScopeRow, Principal } from '@rajyarank/auth';

let seq = 0;
export const uid = (prefix = 'id') => `${prefix}-${(seq += 1)}`;

/** Build a test Principal with sensible defaults; override as needed. */
export function makePrincipal(overrides: Partial<Principal> = {}): Principal {
  return {
    userId: uid('user'),
    kind: 'STAFF',
    status: 'ACTIVE',
    roleKeys: ['TEACHER'],
    permissionCodes: new Set(['content.create', 'content.edit_own']),
    assignments: [{ scope: 'EXAM', stateId: 'BR', examId: 'BPSC_PT' }] as AssignmentScopeRow[],
    assurance: 'AAL1',
    isSuperAdmin: false,
    ...overrides,
  };
}

/** Deterministic fixture ids used across integration/e2e tests. */
export const FIXTURES = {
  states: { bihar: 'state-bihar', jharkhand: 'state-jharkhand' },
  exams: { bpscPt: 'exam-bpsc-pt', jsscCgl: 'exam-jssc-cgl' },
  staff: {
    teacher: 'teacher@rajyarank.dev',
    reviewer: 'reviewer@rajyarank.dev',
    contentAdmin: 'content-admin@rajyarank.dev',
    superAdmin: 'super-admin@rajyarank.dev',
  },
} as const;
