/**
 * Integration coverage for the generic admin set-password bypass
 * (POST admin/staff/invitations/:id/set-password) — specifically the
 * tenant/role escalation guard added after review found the route had none:
 * any user.invite holder (e.g. Content Admin) could otherwise claim ANY
 * pending invitation by id, including a co-Head's in a different org or a
 * still-pending Super Admin invite. Requires Postgres + Redis
 * (docker-compose.ci.yml). Run: pnpm test:integration.
 */
import { randomUUID } from 'node:crypto';
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

async function loginAsFreshStaff(roleKey: 'SUPER_ADMIN' | 'CONTENT_ADMIN' | 'ACADEMIC_HEAD', orgId: string | null = null) {
  const password = await argon2.hash('RajyaRank@Dev1', { type: argon2.argon2id });
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `inv-test-${roleKey.toLowerCase()}-${stamp}@rajyarank.dev`;
  const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
  await prisma.user.create({
    data: {
      kind: 'STAFF',
      status: 'ACTIVE',
      email,
      emailVerified: true,
      passwordHash: password,
      displayName: `Invite Test ${roleKey}`,
      orgId,
      staffProfile: { create: { fullName: `Invite Test ${roleKey}`, workEmail: email } },
      roles: { create: { roleId: role.id } },
    },
  });
  const login = await api().post('/api/v1/auth/staff/login').send({ workEmail: email, password: 'RajyaRank@Dev1' }).expect(201);
  const rawCookies = login.headers['set-cookie'];
  const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
  const csrf = cookieValue(cookies, 'rr_csrf');
  return { cookies, csrf: csrf! };
}

async function makeOrg(label: string) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  return prisma.organization.create({ data: { name: `${label} Institute`, code: `INVTEST${stamp}`, createdBy: (await prisma.role.findFirst())!.id } });
}

/** Inserts a pending StaffInvitation directly — bypasses create()'s own
 *  actor-permission checks (deliberately, since we're testing what happens
 *  once such a row already exists, not how it got created). */
async function makePendingInvite(roleKey: 'SUPER_ADMIN' | 'ACADEMIC_HEAD', orgId: string | null) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return prisma.staffInvitation.create({
    data: {
      email: `pending-${roleKey.toLowerCase()}-${stamp}@example.com`,
      phone: `9${stamp.replace(/\D/g, '').slice(-9)}`,
      fullName: `Pending ${roleKey}`,
      roleKey,
      orgId,
      assignments: [],
      tokenHash: randomUUID(),
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 48 * 3_600_000),
      invitedBy: (await prisma.role.findFirst())!.id, // FK-less column; any string is fine for this test
    },
  });
}

describe('Generic admin set-password bypass — tenant/role escalation guard', () => {
  it('a Content Admin (no org, holds user.invite) cannot claim an org-scoped ACADEMIC_HEAD invite', async () => {
    const org = await makeOrg('Guard1');
    const invite = await makePendingInvite('ACADEMIC_HEAD', org.id);
    const { cookies, csrf } = await loginAsFreshStaff('CONTENT_ADMIN', null);

    const res = await api()
      .post(`/api/v1/admin/staff/invitations/${invite.id}/set-password`)
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf)
      .send({ password: 'ShouldNotWork1!' })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');

    const after = await prisma.staffInvitation.findUniqueOrThrow({ where: { id: invite.id } });
    expect(after.status).toBe('PENDING');
  });

  it('an Academic Head of org A cannot claim a pending invite belonging to org B', async () => {
    const orgA = await makeOrg('GuardA');
    const orgB = await makeOrg('GuardB');
    const inviteForB = await makePendingInvite('ACADEMIC_HEAD', orgB.id);
    const { cookies, csrf } = await loginAsFreshStaff('ACADEMIC_HEAD', orgA.id);

    await api()
      .post(`/api/v1/admin/staff/invitations/${inviteForB.id}/set-password`)
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf)
      .send({ password: 'ShouldNotWork1!' })
      .expect(404);
  });

  it('a Content Admin cannot claim a pending SUPER_ADMIN invitation even though it holds user.invite', async () => {
    const invite = await makePendingInvite('SUPER_ADMIN', null);
    const { cookies, csrf } = await loginAsFreshStaff('CONTENT_ADMIN', null);

    await api()
      .post(`/api/v1/admin/staff/invitations/${invite.id}/set-password`)
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf)
      .send({ password: 'ShouldNotWork1!' })
      .expect(404);

    const after = await prisma.staffInvitation.findUniqueOrThrow({ where: { id: invite.id } });
    expect(after.status).toBe('PENDING');
  });

  it('an Academic Head CAN complete a same-org, non-SUPER_ADMIN invite via the generic route (sanity — the guard is scoped, not a blanket block)', async () => {
    // Super Admin itself doesn't hold user.invite (only org.manage — that's
    // exactly why the org-scoped route exists), so it can't be the actor for
    // this route at all; an Academic Head sharing the invite's own org is
    // the actual legitimate case this guard must keep working.
    const org = await makeOrg('Guard-Positive');
    const invite = await makePendingInvite('ACADEMIC_HEAD', org.id);
    const { cookies, csrf } = await loginAsFreshStaff('ACADEMIC_HEAD', org.id);

    const res = await api()
      .post(`/api/v1/admin/staff/invitations/${invite.id}/set-password`)
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf)
      .send({ password: 'ShouldWorkFine1!' })
      .expect(201);
    expect(res.body.data.userId).toBeTruthy();

    const after = await prisma.staffInvitation.findUniqueOrThrow({ where: { id: invite.id } });
    expect(after.status).toBe('ACCEPTED');
  });
});
