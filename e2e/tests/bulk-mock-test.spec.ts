import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Full lifecycle e2e for the Mock Tests dual-approval workflow:
 *
 *   Academic Head bulk-uploads questions into a new Mock Test
 *   → Academic Reviewer approves
 *   → Academic Head approves (dual sign-off complete)
 *   → Academic Head publishes
 *   → the test becomes visible to a student ENROLLED in that institute
 *   → the test stays INVISIBLE to a student with no institute affiliation
 *     (mock tests are "assigned" to the owning institute's own students,
 *     not broadcast platform-wide — see student-tests.service.ts's
 *     orgScopeFilter()).
 *
 * Reuses the already-generated Prisma client from apps/api (no separate
 * `prisma generate` needed for this workspace) for setup/teardown that has
 * no real UI (deriving IDs, enrolling a student into an institute, reading
 * the dev SMS log for OTPs) — the actual scenario under test (create,
 * approve, publish, visibility) is driven entirely through the real UI.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require(path.resolve(__dirname, '../../apps/api/node_modules/@prisma/client'));
const prisma = new (PrismaClient as new () => any)();

const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3001';
const API = process.env.API_URL ?? 'http://localhost:4000';
const API_LOG_PATH = process.env.API_LOG_PATH ?? '/tmp/api.log';
const STAFF_PASSWORD = 'RajyaRank@Dev1';

const runId = Date.now().toString().slice(-8);
const testTitle = `E2E Bulk Mock Test ${runId}`;
const institutePhone = `70${runId}`; // enrolled in Green Valley
const outsiderPhone = `71${runId}`; // no institute — must NOT see the test

let greenValleyOrgId: string;
let greenValleyAccessCode: string;
let courseId: string;
let subjectId: string;
let headMfaWasEnabled: boolean;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  const org = await prisma.organization.findFirst({ where: { name: { contains: 'Green Valley' } } });
  if (!org) throw new Error('Seed data missing: Green Valley Institute');
  greenValleyOrgId = org.id;
  greenValleyAccessCode = org.accessCode;
  if (!greenValleyAccessCode) throw new Error('Green Valley Institute has no access code set in seed data');

  const course = await prisma.course.findFirst({ where: { titleEn: { contains: 'BPSC Prelims' } } });
  if (!course) throw new Error('Seed data missing: BPSC Prelims course');
  courseId = course.id;

  const subject = await prisma.subject.findFirst({ where: { courseId } });
  if (!subject) throw new Error('Seed data missing: a subject on the BPSC Prelims course');
  subjectId = subject.id;

  // Publishing is content.publish + AAL2 (MFA step-up). head@greenvalley.dev
  // has no MFA enrolled in seed data; AUTH_DEV_SKIP_MFA (already on in this
  // sandbox) grants AAL2 straight through login for any account WITH MFA
  // enabled, so flipping this flag is the same trick used for manual testing
  // earlier in this session — reverted in afterAll.
  const head = await prisma.user.findFirst({ where: { email: 'head@greenvalley.dev' } });
  if (!head) throw new Error('Seed data missing: head@greenvalley.dev');
  headMfaWasEnabled = head.mfaEnabled;
  await prisma.user.update({ where: { id: head.id }, data: { mfaEnabled: true } });
});

test.afterAll(async () => {
  // Restore the Head's MFA flag exactly as found.
  await prisma.user.updateMany({ where: { email: 'head@greenvalley.dev' }, data: { mfaEnabled: headMfaWasEnabled } });

  // Remove everything this run created.
  const test_ = await prisma.test.findFirst({ where: { titleEn: testTitle } });
  if (test_) {
    const versions = await prisma.testVersion.findMany({ where: { testId: test_.id }, select: { id: true } });
    const versionIds = versions.map((v: { id: string }) => v.id);
    const sections = await prisma.testSection.findMany({ where: { testVersionId: { in: versionIds } }, select: { id: true } });
    const sectionIds = sections.map((s: { id: string }) => s.id);
    const testQuestions = await prisma.testQuestion.findMany({ where: { testSectionId: { in: sectionIds } }, select: { questionVersionId: true } });
    const questionVersionIds = testQuestions.map((q: { questionVersionId: string }) => q.questionVersionId);
    const questionVersions = await prisma.questionVersion.findMany({ where: { id: { in: questionVersionIds } }, select: { questionId: true } });
    const questionIds = [...new Set(questionVersions.map((qv: { questionId: string }) => qv.questionId))];

    await prisma.attemptAnswer.deleteMany({ where: { attempt: { testVersionId: { in: versionIds } } } });
    await prisma.attempt.deleteMany({ where: { testVersionId: { in: versionIds } } });
    await prisma.test.delete({ where: { id: test_.id } }); // cascades version/section/testQuestion
    if (questionIds.length) await prisma.question.deleteMany({ where: { id: { in: questionIds } } }); // cascades questionVersion
  }

  for (const phone of [institutePhone, outsiderPhone]) {
    const u = await prisma.user.findFirst({ where: { phone } });
    if (!u) continue;
    await prisma.planItem.deleteMany({ where: { plan: { studentId: u.id } } }).catch(() => {});
    await prisma.studyPlan.deleteMany({ where: { studentId: u.id } }).catch(() => {});
    await prisma.loginSession.deleteMany({ where: { userId: u.id } });
    await prisma.studentProfile.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
  }

  await prisma.$disconnect();
});

// ── Helpers ──────────────────────────────────────────────────────────────

async function loginStaff(page: Page, email: string) {
  await page.goto(`${ADMIN}/en/admin/login`);
  await page.getByLabel(/Work email/).fill(email);
  await page.getByLabel(/Password/).fill(STAFF_PASSWORD);
  await page.getByRole('button', { name: /Sign in/ }).click();
  await expect(page).not.toHaveURL(/\/admin\/login/, { timeout: 15_000 });
}

/** Reads the dev SMS sink (API log) for the most recent OTP sent to a phone
 *  ending in the given last-4 digits. The log line is written by
 *  DevQueueConsumer picking the job off its queue asynchronously — a beat
 *  behind the HTTP response that made the OTP input appear — so this polls
 *  briefly rather than reading once. */
async function latestOtp(phone: string): Promise<string> {
  const last4 = phone.slice(-4);
  // Matches either dev-sink log line format seen in this codebase:
  //   [dev SMS] OTP for ••••••XXXX → NNNNNN            (Notifier)
  //   ••••••XXXX → NNNNNN is your RajyaRank ... code.   (DevQueueConsumer)
  const re = new RegExp(`••••••${last4} → (\\d{6})`, 'g');
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const log = fs.readFileSync(API_LOG_PATH, 'utf8');
    let match: RegExpExecArray | null;
    let last: string | null = null;
    while ((match = re.exec(log))) last = match[1]!;
    if (last) return last;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No OTP found in ${API_LOG_PATH} for phone ending ${last4}`);
}

async function loginStudentByPhone(page: Page, phone: string) {
  await page.goto(`${WEB}/en/login`);
  const useUOtpToggle = page.getByRole('button', { name: 'Use phone number instead' });
  if (await useUOtpToggle.isVisible().catch(() => false)) await useUOtpToggle.click();
  await page.getByRole('textbox', { name: 'Mobile number' }).fill(phone);
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await expect(page.getByRole('textbox', { name: 'Enter the 6-digit code' })).toBeVisible({ timeout: 10_000 });
  const otp = await latestOtp(phone);
  await page.getByRole('textbox', { name: 'Enter the 6-digit code' }).fill(otp);
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });
  // Skip onboarding if it appears — irrelevant to this scenario.
  if (page.url().includes('/onboarding')) {
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  }
}

// ── The scenario ─────────────────────────────────────────────────────────

test('bulk-created mock test → dual approval → publish → institute-scoped student visibility', async ({ browser }) => {
  test.setTimeout(180_000);

  // ── 1) Academic Head creates the test, bulk-uploading questions via CSV ──
  const headCtx = await browser.newContext();
  const headPage = await headCtx.newPage();
  await loginStaff(headPage, 'head@greenvalley.dev');
  await headPage.goto(`${ADMIN}/en/admin/mock-tests`);

  await headPage.getByRole('button', { name: '+ Create content' }).click();
  const dialog = headPage.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Step 1: content type → Mock Test
  await dialog.getByLabel('Content type').selectOption({ label: 'Mock Test' });
  await dialog.getByRole('button', { name: 'Next' }).click();

  // Step 2: quiz setup — course, subject, title, then bulk-upload CSV
  const selects = dialog.locator('select');
  await selects.nth(0).locator(`option[value="${courseId}"]`).waitFor({ state: 'attached', timeout: 15_000 });
  await selects.nth(0).selectOption(courseId);
  await selects.nth(1).locator(`option[value="${subjectId}"]`).waitFor({ state: 'attached', timeout: 15_000 });
  await selects.nth(1).selectOption(subjectId);
  await dialog.getByLabel('Title (Hindi)').fill(`${testTitle} हिन्दी`);
  await dialog.getByLabel('Title (English)').fill(testTitle);
  await dialog.getByRole('button', { name: 'Next' }).click();

  // Step 3: bulk upload — write a small CSV and attach it via the file input
  const csv = [
    'type,subjectId,textEn,textHi,optionA,optionB,optionC,optionD,correct,difficulty,marks,negativeMarks',
    `SINGLE_CHOICE,ignored,In which part of the Constitution are Fundamental Rights?,मौलिक अधिकार संविधान के किस भाग में हैं?,Part I,Part II,Part III,Part IV,C,MEDIUM,1,0.25`,
    `SINGLE_CHOICE,ignored,Who was the first President of India?,भारत के पहले राष्ट्रपति कौन थे?,Nehru,Rajendra Prasad,Patel,Gandhi,B,EASY,1,0.25`,
    `TRUE_FALSE,ignored,India is a federal state.,भारत एक संघीय राज्य है।,,,,,TRUE,EASY,1,0`,
  ].join('\n');
  const csvPath = path.join(os.tmpdir(), `e2e-bulk-questions-${runId}.csv`);
  fs.writeFileSync(csvPath, csv);
  await dialog.getByLabel('Upload CSV').setInputFiles(csvPath);
  await expect(dialog.getByText(/Parsed 3 question/)).toBeVisible({ timeout: 10_000 });
  await dialog.getByRole('button', { name: 'Next' }).click();

  // Step 4: review & create
  await expect(dialog.getByText(/3 \(3 bulk-uploaded\)/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Create content' }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  fs.unlinkSync(csvPath);

  const row = headPage.locator('li', { hasText: testTitle });
  await expect(row).toBeVisible({ timeout: 10_000 });
  await expect(row.getByText('SUBMITTED', { exact: true })).toBeVisible();

  // ── 2) Academic Reviewer approves ──
  const reviewerCtx = await browser.newContext();
  const reviewerPage = await reviewerCtx.newPage();
  await loginStaff(reviewerPage, 'reviewer@rajyarank.dev');
  await reviewerPage.goto(`${ADMIN}/en/admin/mock-tests`);
  const reviewerRow = reviewerPage.locator('li', { hasText: testTitle });
  await expect(reviewerRow).toBeVisible({ timeout: 10_000 });
  await reviewerRow.getByRole('button', { name: 'Approve as Reviewer' }).click();
  await expect(reviewerRow.getByText('Reviewer ✓')).toBeVisible({ timeout: 10_000 });

  // ── 3) Academic Head approves (dual sign-off complete) ──
  await headPage.reload();
  const headRow = headPage.locator('li', { hasText: testTitle });
  await expect(headRow).toBeVisible({ timeout: 10_000 });
  await headRow.getByRole('button', { name: 'Approve as Head' }).click();
  await expect(headRow.getByText('APPROVED', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(headRow.getByText('Head ✓')).toBeVisible();
  await expect(headRow.getByText('Reviewer ✓')).toBeVisible();

  // ── 4) Academic Head publishes ──
  await headRow.getByRole('button', { name: 'Publish to students' }).click();
  await expect(headRow.getByText('PUBLISHED', { exact: true })).toBeVisible({ timeout: 10_000 });

  await headCtx.close();
  await reviewerCtx.close();

  // ── 5) Enroll one student into Green Valley, leave the other unaffiliated ──
  const studentCtx1 = await browser.newContext();
  const studentPage1 = await studentCtx1.newPage();
  await loginStudentByPhone(studentPage1, institutePhone);
  // Through the real endpoint (not a raw Prisma write) so the cached
  // Principal actually gets invalidated (authz.invalidate) — writing orgId
  // directly would leave this student's already-issued session resolving to
  // the stale orgId for up to ~5 minutes (see student.service.ts's
  // joinInstitution comment), which would make the very next assertion flaky.
  const joinRes = await studentPage1.request.post(`${API}/api/v1/student/institution/join`, {
    data: { accessCode: greenValleyAccessCode },
  });
  expect(joinRes.ok()).toBeTruthy();

  const studentCtx2 = await browser.newContext();
  const studentPage2 = await studentCtx2.newPage();
  await loginStudentByPhone(studentPage2, outsiderPhone);
  // (outsider stays with orgId: null — the default)

  // ── 6) Enrolled student SEES the test ──
  await studentPage1.goto(`${WEB}/en/tests`);
  await expect(studentPage1.getByText(testTitle)).toBeVisible({ timeout: 10_000 });

  // ── 7) Unaffiliated student does NOT see the test (institute-scoped) ──
  await studentPage2.goto(`${WEB}/en/tests`);
  await expect(studentPage2.getByText(testTitle)).toHaveCount(0);

  await studentCtx1.close();
  await studentCtx2.close();
});
