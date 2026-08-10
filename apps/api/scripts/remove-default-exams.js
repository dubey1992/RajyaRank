#!/usr/bin/env node
/**
 * One-time removal of the two platform-seeded (orgId: null) demo exams —
 * "BPSC Prelims" (BPSC_PT) and "JSSC CGL" (JSSC_CGL) — that prisma/seed.ts
 * used to create unconditionally, including in production, even though
 * they only ever existed to support the (production-skipped) demo
 * users/courses. No production institute created them, so they don't
 * belong in the live exam catalog.
 *
 * Safety: before deleting either exam, this checks every relation that
 * references it (courses, tests, concepts, official notices, staff
 * assignments, student target-exam) and refuses to delete an exam that
 * still has any real dependents — printing the counts instead of guessing.
 * seed.ts itself has already been fixed to stop recreating these in
 * production; this script only cleans up what was already seeded before
 * that fix shipped.
 */
const { PrismaClient } = require('@prisma/client');

const CODES = ['BPSC_PT', 'JSSC_CGL'];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const code of CODES) {
      const exam = await prisma.exam.findFirst({ where: { code, orgId: null } });
      if (!exam) {
        console.log(`${code}: no platform-seeded exam found — nothing to do.`);
        continue;
      }

      const [courses, tests, concepts, notices, assigns, students] = await Promise.all([
        prisma.course.count({ where: { examId: exam.id } }),
        prisma.test.count({ where: { examId: exam.id } }),
        prisma.concept.count({ where: { examId: exam.id } }),
        prisma.officialNotice.count({ where: { examId: exam.id } }),
        prisma.staffAssignment.count({ where: { examId: exam.id, deletedAt: null } }),
        prisma.studentProfile.count({ where: { targetExamId: exam.id } }),
      ]);
      const dependents = { courses, tests, concepts, notices, assigns, students };
      const total = Object.values(dependents).reduce((a, b) => a + b, 0);

      if (total > 0) {
        console.error(`${code} (${exam.id}): NOT deleted — still has dependents: ${JSON.stringify(dependents)}. Resolve these first.`);
        process.exitCode = 1;
        continue;
      }

      await prisma.exam.delete({ where: { id: exam.id } });
      console.log(`${code} (${exam.id}): deleted — no dependents found.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
