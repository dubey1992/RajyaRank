#!/usr/bin/env node
/**
 * One-time remediation for a specific bootstrap mistake: if
 * BOOTSTRAP_ADMIN_EMAIL was never updated past its Secrets Manager
 * placeholder before bootstrap-super-admin.js ran, the Super Admin account
 * gets created with the literal email "REPLACE_ME". bootstrap-super-admin.js
 * itself refuses to touch an existing Super Admin (by design, to never
 * silently overwrite a real admin), so that script can't fix its own
 * mistake — this one narrowly can.
 *
 * Only ever updates a Super Admin whose email is exactly "REPLACE_ME".
 * Refuses to run against any other value, so it can never be used to
 * silently reassign a real admin's email.
 *
 * Run once, after the mistake is confirmed:
 *   BOOTSTRAP_ADMIN_EMAIL=you@yourorg.in node apps/api/scripts/fix-super-admin-placeholder-email.js
 */
const { PrismaClient } = require('@prisma/client');

const PLACEHOLDER_EMAIL = 'REPLACE_ME';

async function main() {
  const newEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (!newEmail || newEmail === PLACEHOLDER_EMAIL) {
    console.error('BOOTSTRAP_ADMIN_EMAIL must be set to the real admin email (not the placeholder).');
    process.exitCode = 1;
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    console.error(`BOOTSTRAP_ADMIN_EMAIL "${newEmail}" does not look like a valid email address.`);
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findFirst({
      where: { kind: 'STAFF', roles: { some: { role: { key: 'SUPER_ADMIN' } } } },
      select: { id: true, email: true },
    });
    if (!admin) {
      console.error('No Super Admin exists yet — run bootstrap-super-admin.js first.');
      process.exitCode = 1;
      return;
    }
    if (admin.email !== PLACEHOLDER_EMAIL) {
      console.log(`Super Admin email is already "${admin.email}", not the placeholder — nothing to do. Refusing to change it.`);
      return;
    }

    const emailTaken = await prisma.user.findFirst({ where: { kind: 'STAFF', email: newEmail } });
    if (emailTaken) {
      console.error(`A staff account with email ${newEmail} already exists — pick a different BOOTSTRAP_ADMIN_EMAIL.`);
      process.exitCode = 1;
      return;
    }

    await prisma.user.update({
      where: { id: admin.id },
      data: { email: newEmail, emailVerified: true },
    });
    console.log(`Super Admin email fixed: "${PLACEHOLDER_EMAIL}" -> "${newEmail}" (id ${admin.id}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
