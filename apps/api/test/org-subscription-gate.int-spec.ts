/**
 * Integration coverage for the new institution-subscription gate
 * (packages/auth/src/policy.engine.ts, step 3) — an org-scoped staff
 * member (Academic Head, Teacher, ...) must belong to an institution with
 * an ACTIVE OrganizationSubscription to use ANY of their permissions
 * (enroll students, invite/manage staff, manage courses, etc.). Before this
 * fix, a newly-onboarded institution with no subscription at all could
 * already use every feature — this locks that down at the single shared
 * policy-engine seam rather than per-route. Requires Postgres + Redis
 * (docker-compose.ci.yml). Run: pnpm test:integration.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();
let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1', { exclude: ['healthz', 'readyz'] });
  await app.init();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const api = () => request(app.getHttpServer());

function cookieValue(cookies: string[], name: string): string | undefined {
  for (const c of cookies) {
    const [pair] = c.split(';');
    const [k, v] = (pair ?? '').split('=');
    if (k === name) return v;
  }
  return undefined;
}

async function makeOrg(label: string) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  return prisma.organization.create({
    data: { name: `${label} Institute`, code: `SUBGATE${stamp}`, createdBy: (await prisma.role.findFirst())!.id },
  });
}

/** Creates an ACTIVE Academic Head already attached to `orgId` and logs in —
 *  bypasses the invite/accept flow, which isn't what this gate is testing. */
async function loginAsHeadOfOrg(orgId: string) {
  const password = await argon2.hash('RajyaRank@Dev1', { type: argon2.argon2id });
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `subgate-head-${stamp}@rajyarank.dev`;
  const role = await prisma.role.findUniqueOrThrow({ where: { key: 'ACADEMIC_HEAD' } });
  const user = await prisma.user.create({
    data: {
      kind: 'STAFF',
      status: 'ACTIVE',
      email,
      emailVerified: true,
      passwordHash: password,
      displayName: 'Subgate Test Head',
      orgId,
      staffProfile: { create: { fullName: 'Subgate Test Head', workEmail: email } },
      roles: { create: { roleId: role.id } },
    },
  });
  await prisma.organization.update({ where: { id: orgId }, data: { headUserId: user.id } });
  const login = await api().post('/api/v1/auth/staff/login').send({ workEmail: email, password: 'RajyaRank@Dev1' }).expect(201);
  const rawCookies = login.headers['set-cookie'];
  const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
  return { email, cookies, csrf: cookieValue(cookies, 'rr_csrf')! };
}

async function loginAsSuperAdmin() {
  const password = await argon2.hash('RajyaRank@Dev1', { type: argon2.argon2id });
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `subgate-sa-${stamp}@rajyarank.dev`;
  const role = await prisma.role.findUniqueOrThrow({ where: { key: 'SUPER_ADMIN' } });
  await prisma.user.create({
    data: {
      kind: 'STAFF',
      status: 'ACTIVE',
      email,
      emailVerified: true,
      passwordHash: password,
      displayName: 'Subgate Test SA',
      staffProfile: { create: { fullName: 'Subgate Test SA', workEmail: email } },
      roles: { create: { roleId: role.id } },
    },
  });
  const login = await api().post('/api/v1/auth/staff/login').send({ workEmail: email, password: 'RajyaRank@Dev1' }).expect(201);
  const rawCookies = login.headers['set-cookie'];
  const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
  return { cookies, csrf: cookieValue(cookies, 'rr_csrf')! };
}

function enrollStudentBody() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  return {
    fullName: `Subgate Student ${stamp}`,
    email: `subgate-student-${stamp}@example.com`,
    password: 'StudentPass1!',
    phone: `9${stamp.replace(/\D/g, '').slice(-9)}`,
  };
}

describe('Institution subscription gate — org-scoped staff blocked with no active subscription', () => {
  it('an Academic Head of an institution with NO subscription row cannot enroll a student', async () => {
    const org = await makeOrg('NoSub');
    const head = await loginAsHeadOfOrg(org.id);

    const res = await api()
      .post('/api/v1/admin/students')
      .set('Cookie', head.cookies)
      .set('x-csrf-token', head.csrf)
      .send(enrollStudentBody())
      .expect(403);
    expect(res.body.error.code).toBe('PERMISSION_DENIED');
    expect(res.body.error.message).toMatch(/subscription/i);
  });

  it('the SAME Academic Head CAN enroll a student once Super Admin subscribes the institution to a plan', async () => {
    const org = await makeOrg('WithSub');
    const head = await loginAsHeadOfOrg(org.id);

    const plan = await prisma.subscriptionPlan.findFirstOrThrow({ where: { active: true } });
    const superAdmin = await loginAsSuperAdmin();
    await api()
      .post(`/api/v1/admin/billing/organizations/${org.id}/subscribe`)
      .set('Cookie', superAdmin.cookies)
      .set('x-csrf-token', superAdmin.csrf)
      .send({ planId: plan.id, billingCycle: 'MONTHLY' })
      .expect(201);

    // The Head's Principal was cached (Redis, 300s TTL) before the org had a
    // subscription — log in again to pick up the fresh org state, same as a
    // real Head would after a page reload some time later.
    const refreshed = await api().post('/api/v1/auth/staff/login').send({ workEmail: head.email, password: 'RajyaRank@Dev1' }).expect(201);
    const rawCookies = refreshed.headers['set-cookie'];
    const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
    const csrf = cookieValue(cookies, 'rr_csrf')!;

    const res = await api()
      .post('/api/v1/admin/students')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf)
      .send(enrollStudentBody())
      .expect(201);
    expect(res.body.data.id).toBeTruthy();
  });

  it('a PAST_DUE subscription blocks staff actions the same as having none at all', async () => {
    const org = await makeOrg('PastDue');
    const plan = await prisma.subscriptionPlan.findFirstOrThrow({ where: { active: true } });
    await prisma.organizationSubscription.create({
      data: { orgId: org.id, planId: plan.id, billingCycle: 'MONTHLY', status: 'PAST_DUE' },
    });
    const head = await loginAsHeadOfOrg(org.id);

    const res = await api()
      .post('/api/v1/admin/students')
      .set('Cookie', head.cookies)
      .set('x-csrf-token', head.csrf)
      .send(enrollStudentBody())
      .expect(403);
    expect(res.body.error.message).toMatch(/subscription/i);
  });

  it('Super Admin (org-less) is never subject to this gate', async () => {
    const superAdmin = await loginAsSuperAdmin();
    // org.manage is a real Super Admin permission with no resource scope —
    // confirms the subscription step doesn't fire for orgId-less principals.
    await api()
      .get('/api/v1/admin/organizations')
      .set('Cookie', superAdmin.cookies)
      .set('x-csrf-token', superAdmin.csrf)
      .expect(200);
  });
});
