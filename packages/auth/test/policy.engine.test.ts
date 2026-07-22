import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignmentCovers,
  evaluate,
  scopeCovered,
  statusAllows,
} from '../src/policy.engine.ts';
import type { Principal } from '../src/policy.types.ts';

function principal(overrides: Partial<Principal> = {}): Principal {
  return {
    userId: 'u1',
    kind: 'STAFF',
    status: 'ACTIVE',
    roleKeys: ['TEACHER'],
    permissionCodes: new Set(['content.create', 'content.edit_own', 'content.submit_review']),
    assignments: [{ scope: 'EXAM', stateId: 'BR', examId: 'BPSC_PT' }],
    assurance: 'AAL1',
    isSuperAdmin: false,
    ...overrides,
  };
}

test('denies when account is not active', () => {
  const d = evaluate({ principal: principal({ status: 'SUSPENDED' }), permission: 'content.create' });
  assert.equal(d.allow, false);
  assert.equal(d.allow === false && d.code, 'ACCOUNT_INACTIVE');
});

test('denies when the permission code is missing', () => {
  const d = evaluate({ principal: principal(), permission: 'content.publish' });
  assert.equal(d.allow, false);
  assert.equal(d.allow === false && d.code, 'MISSING_PERMISSION');
});

test('allows a held permission within scope', () => {
  const d = evaluate({
    principal: principal(),
    permission: 'content.create',
    resource: { scope: { stateId: 'BR', examId: 'BPSC_PT' } },
  });
  assert.equal(d.allow, true);
});

test('denies out-of-scope resource', () => {
  const d = evaluate({
    principal: principal(),
    permission: 'content.create',
    resource: { scope: { stateId: 'JH', examId: 'JSSC_CGL' } },
  });
  assert.equal(d.allow, false);
  assert.equal(d.allow === false && d.code, 'OUT_OF_SCOPE');
});

test('denies editing another user\'s content for *_own', () => {
  const d = evaluate({
    principal: principal(),
    permission: 'content.edit_own',
    resource: { ownerUserId: 'someone-else', status: 'DRAFT', scope: { stateId: 'BR', examId: 'BPSC_PT' } },
  });
  assert.equal(d.allow, false);
  assert.equal(d.allow === false && d.code, 'NOT_OWNER');
});

test('allows editing own content in an editable status', () => {
  const d = evaluate({
    principal: principal(),
    permission: 'content.edit_own',
    resource: { ownerUserId: 'u1', status: 'DRAFT', scope: { stateId: 'BR', examId: 'BPSC_PT' } },
  });
  assert.equal(d.allow, true);
});

test('denies edit_own when content status forbids it', () => {
  const d = evaluate({
    principal: principal(),
    permission: 'content.edit_own',
    resource: { ownerUserId: 'u1', status: 'PUBLISHED', scope: { stateId: 'BR', examId: 'BPSC_PT' } },
  });
  assert.equal(d.allow, false);
  assert.equal(d.allow === false && d.code, 'STATUS_FORBIDDEN');
});

test('requires AAL2 for high-risk action even when permission is held', () => {
  const admin = principal({
    roleKeys: ['CONTENT_ADMIN'],
    permissionCodes: new Set(['content.publish']),
    assignments: [{ scope: 'STATE', stateId: 'BR' }],
    assurance: 'AAL1',
  });
  const denied = evaluate({
    principal: admin,
    permission: 'content.publish',
    requireAssurance: 'AAL2',
    resource: { status: 'APPROVED', scope: { stateId: 'BR', examId: 'BPSC_PT' } },
  });
  assert.equal(denied.allow, false);
  assert.equal(denied.allow === false && denied.code, 'ASSURANCE_REQUIRED');

  const allowed = evaluate({
    principal: { ...admin, assurance: 'AAL2' },
    permission: 'content.publish',
    requireAssurance: 'AAL2',
    resource: { status: 'APPROVED', scope: { stateId: 'BR', examId: 'BPSC_PT' } },
  });
  assert.equal(allowed.allow, true);
});

test('Super Admin is denied a capability outside their platform-oversight role (no blanket bypass)', () => {
  // Super Admin's real permission set (see ROLE_PERMISSIONS.SUPER_ADMIN) is
  // deliberately narrow — course/content management is NOT in it, so this
  // must be denied just like any other role lacking the permission, not
  // silently allowed via an isSuperAdmin short-circuit.
  const su = principal({ roleKeys: ['SUPER_ADMIN'], isSuperAdmin: true, permissionCodes: new Set(['org.manage']), assignments: [] });
  const denied = evaluate({
    principal: su,
    permission: 'content.publish',
    resource: { scope: { stateId: 'JH', examId: 'JSSC_CGL' }, status: 'DRAFT' },
  });
  assert.equal(denied.allow, false);
  assert.equal(denied.allow === false && denied.code, 'MISSING_PERMISSION');
});

test('Super Admin bypasses assignment scope for a capability they DO hold, but still honors AAL2 demand', () => {
  const su = principal({ roleKeys: ['SUPER_ADMIN'], isSuperAdmin: true, permissionCodes: new Set(['org.manage', 'role.manage']), assignments: [] });
  const anywhere = evaluate({
    principal: su,
    permission: 'org.manage',
    resource: { scope: { stateId: 'JH', examId: 'JSSC_CGL' } },
  });
  assert.equal(anywhere.allow, true);

  const stepUp = evaluate({ principal: su, permission: 'role.manage', requireAssurance: 'AAL2' });
  assert.equal(stepUp.allow, false);
  assert.equal(stepUp.allow === false && stepUp.code, 'ASSURANCE_REQUIRED');
});

test('broader assignment covers narrower resource scope', () => {
  const stateAssign = [{ scope: 'STATE' as const, stateId: 'BR' }];
  assert.equal(
    scopeCovered(stateAssign, { stateId: 'BR', examId: 'BPSC_PT', subjectId: 'MATH' }),
    true,
  );
  assert.equal(scopeCovered(stateAssign, { stateId: 'JH' }), false);
});

test('assignmentCovers: pinned subject must match', () => {
  const subj = { scope: 'SUBJECT' as const, stateId: 'BR', examId: 'BPSC_PT', subjectId: 'MATH' };
  assert.equal(assignmentCovers(subj, { stateId: 'BR', examId: 'BPSC_PT', subjectId: 'MATH' }), true);
  assert.equal(assignmentCovers(subj, { stateId: 'BR', examId: 'BPSC_PT', subjectId: 'GS' }), false);
});

test('global endpoint (no resource scope) relies on permission code only', () => {
  const admin = principal({
    roleKeys: ['CONTENT_ADMIN'],
    permissionCodes: new Set(['user.invite']),
    assignments: [],
  });
  const d = evaluate({ principal: admin, permission: 'user.invite' });
  assert.equal(d.allow, true);
});

test('statusAllows: ungated permission is always allowed', () => {
  assert.equal(statusAllows('user.invite', 'ANYTHING'), true);
  assert.equal(statusAllows('content.publish', 'DRAFT'), false);
  assert.equal(statusAllows('content.publish', 'APPROVED'), true);
});

test('account PENDING_SETUP is denied everything', () => {
  const d = evaluate({ principal: principal({ status: 'PENDING_SETUP' }), permission: 'content.create' });
  assert.equal(d.allow === false && d.code, 'ACCOUNT_INACTIVE');
});

test('one matching assignment among several grants access', () => {
  const p = principal({
    assignments: [
      { scope: 'EXAM', stateId: 'JH', examId: 'JSSC_CGL' },
      { scope: 'SUBJECT', stateId: 'BR', examId: 'BPSC_PT', subjectId: 'MATH' },
    ],
  });
  const d = evaluate({
    principal: p,
    permission: 'content.create',
    resource: { scope: { stateId: 'BR', examId: 'BPSC_PT', subjectId: 'MATH' } },
  });
  assert.equal(d.allow, true);
});

test('holding a permission but with zero assignments is out of scope for scoped resources', () => {
  const p = principal({ assignments: [] });
  const d = evaluate({
    principal: p,
    permission: 'content.create',
    resource: { scope: { stateId: 'BR', examId: 'BPSC_PT' } },
  });
  assert.equal(d.allow === false && d.code, 'OUT_OF_SCOPE');
});
