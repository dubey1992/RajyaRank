#!/usr/bin/env node
/**
 * One-time Super Admin bootstrap — NOT part of prisma/seed.ts, which must
 * stay demo-data-free in production (seed.ts guards its own demo-user step
 * with `NODE_ENV !== 'production'`). A fresh Staging/Production database has
 * reference data (states/exams/roles/permissions, from `prisma db seed`) but
 * zero staff accounts — every other admin action requires being logged in
 * as staff already, so this is the only way to create the very first one.
 *
 * Run once per environment, after `prisma db seed`:
 *   BOOTSTRAP_ADMIN_EMAIL=you@yourorg.in \
 *   BOOTSTRAP_ADMIN_PASSWORD='...' \
 *   [BOOTSTRAP_ADMIN_NAME='...'] [BOOTSTRAP_ADMIN_PHONE='9XXXXXXXXX'] \
 *   node apps/api/scripts/bootstrap-super-admin.js
 *
 * Idempotent: if a SUPER_ADMIN already exists, prints who and exits — never
 * silently creates a second one, never overwrites an existing account.
 */
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

// Same rule list as packages/contracts/src/common.ts's PASSWORD_RULES —
// duplicated (not imported) because this is a plain script outside the
// TS/workspace build graph, matching apps/worker's own established
// "duplicate small shared logic rather than reach across a build boundary"
// convention (see regenerateSimplePlan()'s doc comment).
const PASSWORD_RULES = [
  { test: (p) => p.length >= 10, label: 'at least 10 characters' },
  { test: (p) => /[a-z]/.test(p), label: 'a lowercase letter' },
  { test: (p) => /[A-Z]/.test(p), label: 'an uppercase letter' },
  { test: (p) => /[0-9]/.test(p), label: 'a number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'a special character' },
];

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Super Admin';
  const phone = process.env.BOOTSTRAP_ADMIN_PHONE || undefined;

  if (!email || !password) {
    console.error('BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required.');
    process.exitCode = 1;
    return;
  }
  const failedRules = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.label);
  if (failedRules.length) {
    console.error(`BOOTSTRAP_ADMIN_PASSWORD is too weak — missing: ${failedRules.join(', ')}.`);
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const role = await prisma.role.findUnique({ where: { key: 'SUPER_ADMIN' } });
    if (!role) {
      console.error('SUPER_ADMIN role not found — run `prisma db seed` first to load reference data + roles.');
      process.exitCode = 1;
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { kind: 'STAFF', roles: { some: { role: { key: 'SUPER_ADMIN' } } } },
      select: { email: true },
    });
    if (existing) {
      console.log(`A Super Admin already exists (${existing.email}) — nothing to do. This script never creates a second one.`);
      return;
    }

    const emailTaken = await prisma.user.findFirst({ where: { kind: 'STAFF', email } });
    if (emailTaken) {
      console.error(`A staff account with email ${email} already exists but is not a Super Admin — refusing to modify it. Pick a different BOOTSTRAP_ADMIN_EMAIL.`);
      process.exitCode = 1;
      return;
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.user.create({
      data: {
        kind: 'STAFF',
        status: 'ACTIVE',
        email,
        emailVerified: true,
        phone,
        passwordHash,
        displayName: name,
        // MFA is NOT pre-configured here — the account starts mfaEnabled:
        // false and the real TOTP enrollment flow (mfa.service.ts) is what
        // flips it on, exercised live as its own post-deploy smoke-test step.
        staffProfile: { create: { fullName: name, workEmail: email } },
        roles: { create: { roleId: role.id } },
      },
      select: { id: true, email: true },
    });

    console.log(`Super Admin created: ${user.email} (id ${user.id}). Log in and enroll MFA immediately.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
