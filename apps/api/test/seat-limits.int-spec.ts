/**
 * Integration coverage for subscription-plan seat limits
 * (students.service.ts enroll(), invitations.service.ts create()) — a plan's
 * maxActiveStudents/maxStaffSeats were purely informational numbers shown on
 * the billing screen; nothing stopped a Head from enrolling or inviting past
 * them. Requires Postgres + Redis (docker-compose.ci.yml). Run: pnpm
 * test:integration.
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

/** A plan with exactly 1 student seat and 1 staff seat — small enough to hit
 *  the limit with a single enroll/invite in each test. */
async function makeOrgWithTinyPlan(label: string) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const org = await prisma.organization.create({
    data: { name: `${label} Institute`, code: `SEATLIM${stamp}`, createdBy: (await prisma.role.findFirst())!.id },
  });
  const plan = await prisma.subscriptionPlan.create({
    data: {
      code: `SEATLIM${stamp}`,
      nameHi: 'Tiny',
      nameEn: 'Tiny',
      priceMonthlyMinor: 100,
      priceAnnualMinor: 1000,
      maxActiveStudents: 1,
      maxStaffSeats: 1,
      storageGb: 1,
      internalFeeBps: 100,
      externalFeeBps: 100,
    },
  });
  await prisma.organizationSubscription.create({
    data: { orgId: org.id, planId: plan.id, billingCycle: 'MONTHLY', status: 'ACTIVE' },
  });
  return org;
}

async function loginAsHeadOfOrg(orgId: string) {
  const password = await argon2.hash('RajyaRank@Dev1', { type: argon2.argon2id });
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `seatlim-head-${stamp}@rajyarank.dev`;
  const role = await prisma.role.findUniqueOrThrow({ where: { key: 'ACADEMIC_HEAD' } });
  const user = await prisma.user.create({
    data: {
      kind: 'STAFF',
      status: 'ACTIVE',
      email,
      emailVerified: true,
      passwordHash: password,
      displayName: 'Seatlim Test Head',
      orgId,
      staffProfile: { create: { fullName: 'Seatlim Test Head', workEmail: email } },
      roles: { create: { roleId: role.id } },
    },
  });
  await prisma.organization.update({ where: { id: orgId }, data: { headUserId: user.id } });
  const login = await api().post('/api/v1/auth/staff/login').send({ workEmail: email, password: 'RajyaRank@Dev1' }).expect(201);
  const rawCookies = login.headers['set-cookie'];
  const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
  return { cookies, csrf: cookieValue(cookies, 'rr_csrf')! };
}

function enrollStudentBody() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  return {
    fullName: `Seatlim Student ${stamp}`,
    email: `seatlim-student-${stamp}@example.com`,
    password: 'StudentPass1!',
    phone: `9${stamp.replace(/\D/g, '').slice(-9)}`,
  };
}

function inviteStaffBody(roleKey: string) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  return {
    fullName: `Seatlim Staff ${stamp}`,
    email: `seatlim-staff-${stamp}@example.com`,
    phone: `8${stamp.replace(/\D/g, '').slice(-9)}`,
    roleKey,
    assignments: [],
  };
}

describe('Subscription plan seat limits', () => {
  it('blocks enrolling a student once maxActiveStudents is reached', async () => {
    const org = await makeOrgWithTinyPlan('StudentSeat');
    const head = await loginAsHeadOfOrg(org.id);

    await api().post('/api/v1/admin/students').set('Cookie', head.cookies).set('x-csrf-token', head.csrf).send(enrollStudentBody()).expect(201);

    const res = await api()
      .post('/api/v1/admin/students')
      .set('Cookie', head.cookies)
      .set('x-csrf-token', head.csrf)
      .send(enrollStudentBody())
      .expect(409);
    expect(res.body.error.message).toMatch(/1 active students/i);
  });

  it('blocks inviting staff once maxStaffSeats is reached', async () => {
    const org = await makeOrgWithTinyPlan('StaffSeat');
    const head = await loginAsHeadOfOrg(org.id);

    await api().post('/api/v1/admin/staff/invitations').set('Cookie', head.cookies).set('x-csrf-token', head.csrf).send(inviteStaffBody('TEACHER')).expect(201);

    const res = await api()
      .post('/api/v1/admin/staff/invitations')
      .set('Cookie', head.cookies)
      .set('x-csrf-token', head.csrf)
      .send(inviteStaffBody('TEACHER'))
      .expect(409);
    expect(res.body.error.message).toMatch(/1 staff seats/i);
  });

  it('inviting a co-Head does NOT consume a staff seat and is never blocked by the limit', async () => {
    const org = await makeOrgWithTinyPlan('CoHeadSeat');
    const head = await loginAsHeadOfOrg(org.id);

    // The 1 staff seat this plan has is still fully available afterward —
    // inviting a co-Head neither consumes it nor counts toward it.
    await api()
      .post('/api/v1/admin/staff/invitations')
      .set('Cookie', head.cookies)
      .set('x-csrf-token', head.csrf)
      .send(inviteStaffBody('ACADEMIC_HEAD'))
      .expect(201);

    await api()
      .post('/api/v1/admin/staff/invitations')
      .set('Cookie', head.cookies)
      .set('x-csrf-token', head.csrf)
      .send(inviteStaffBody('TEACHER'))
      .expect(201);
  });
});
