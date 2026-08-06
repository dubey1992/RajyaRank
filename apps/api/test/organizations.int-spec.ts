/**
 * Integration coverage for resending a head invitation from an institution's
 * detail view. Super Admin holds org.manage but not user.invite, so it can't
 * use the generic /admin/staff/invitations/:id/resend route even for a head
 * invite it sent itself — this exercises the org-scoped route that closes
 * that gap. Requires Postgres + Redis (docker-compose.ci.yml). Run:
 * pnpm test:integration.
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

async function loginAsFreshStaff(roleKey: 'SUPER_ADMIN' | 'TEACHER') {
  const password = await argon2.hash('RajyaRank@Dev1', { type: argon2.argon2id });
  const email = `org-test-${roleKey.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@rajyarank.dev`;
  const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
  await prisma.user.create({
    data: {
      kind: 'STAFF',
      status: 'ACTIVE',
      email,
      emailVerified: true,
      passwordHash: password,
      displayName: `Org Test ${roleKey}`,
      staffProfile: { create: { fullName: `Org Test ${roleKey}`, workEmail: email } },
      roles: { create: { roleId: role.id } },
    },
  });
  const login = await api().post('/api/v1/auth/staff/login').send({ workEmail: email, password: 'RajyaRank@Dev1' }).expect(201);
  const rawCookies = login.headers['set-cookie'];
  const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
  const csrf = cookieValue(cookies, 'rr_csrf');
  return { cookies, csrf: csrf! };
}

async function registerOrg(cookies: string[], csrf: string, label: string) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const res = await api()
    .post('/api/v1/admin/organizations')
    .set('Cookie', cookies)
    .set('x-csrf-token', csrf)
    .send({
      name: `${label} Institute`,
      code: `ORGTEST${stamp}`,
      headFullName: `${label} Head`,
      headEmail: `head-${label.toLowerCase()}-${stamp}@example.com`,
      // Must be unique per call — InvitationsService.create() 409s on a
      // phone already used by a live invitation, and every org here invites
      // a head in the same test run.
      headPhone: `9${stamp.slice(-9)}`,
    })
    .expect(201);
  return res.body.data as { id: string; code: string; invitationId: string };
}

describe('Resend head invitation', () => {
  it('Super Admin (org.manage, no user.invite) can resend a head invite it sent', async () => {
    const { cookies, csrf } = await loginAsFreshStaff('SUPER_ADMIN');
    const org = await registerOrg(cookies, csrf, 'Solo');

    const before = await prisma.staffInvitation.findUniqueOrThrow({ where: { id: org.invitationId } });

    const resent = await api()
      .post(`/api/v1/admin/organizations/${org.id}/heads/${org.invitationId}/resend`)
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf)
      .expect(201);
    expect(resent.body.data.id).toBe(org.invitationId);

    const after = await prisma.staffInvitation.findUniqueOrThrow({ where: { id: org.invitationId } });
    expect(after.status).toBe('PENDING');
    // Resend rotates the token — same row, new hash.
    expect(after.tokenHash).not.toBe(before.tokenHash);
    expect(after.expiresAt.getTime()).toBeGreaterThan(before.expiresAt.getTime());
  });

  it('resends and un-expires an invite that lapsed (status EXPIRED, not just a stale PENDING row)', async () => {
    const { cookies, csrf } = await loginAsFreshStaff('SUPER_ADMIN');
    const org = await registerOrg(cookies, csrf, 'Lapsed');
    // status only flips to EXPIRED lazily, when someone opens the lapsed
    // link — force that state directly rather than waiting out the TTL.
    await prisma.staffInvitation.update({ where: { id: org.invitationId }, data: { status: 'EXPIRED', expiresAt: new Date(Date.now() - 1000) } });

    await api()
      .post(`/api/v1/admin/organizations/${org.id}/heads/${org.invitationId}/resend`)
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf)
      .expect(201);

    const after = await prisma.staffInvitation.findUniqueOrThrow({ where: { id: org.invitationId } });
    // Must flip back to PENDING — a resend that leaves status EXPIRED with a
    // future expiresAt would still fail the accept flow's own status check.
    expect(after.status).toBe('PENDING');
    expect(after.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects resend when the invitation belongs to a different org', async () => {
    const { cookies, csrf } = await loginAsFreshStaff('SUPER_ADMIN');
    const orgA = await registerOrg(cookies, csrf, 'A');
    const orgB = await registerOrg(cookies, csrf, 'B');

    const res = await api()
      .post(`/api/v1/admin/organizations/${orgB.id}/heads/${orgA.invitationId}/resend`)
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf)
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('403s for staff without org.manage', async () => {
    const { cookies, csrf } = await loginAsFreshStaff('TEACHER');
    await api()
      .post('/api/v1/admin/organizations/00000000-0000-0000-0000-000000000000/heads/00000000-0000-0000-0000-000000000000/resend')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf)
      .expect(403);
  });
});
