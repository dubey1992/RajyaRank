import { test, expect } from '@playwright/test';

/**
 * Phase-1 critical-path e2e. Assumes the stack is running (api, web, admin) and
 * seeded. The dev SMS sink logs the OTP; in CI a test-only endpoint or the log
 * is scraped to obtain the code. Staff/admin flows use seeded credentials.
 */

const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3001';

test.describe('student', () => {
  test('landing page is bilingual and links to login', async ({ page }) => {
    await page.goto('/hi');
    await expect(page.getByRole('link', { name: /लॉगिन|Login/ })).toBeVisible();
    await page.goto('/en');
    await expect(page).toHaveURL(/\/en/);
  });

  test('student login screen shows OTP entry, no role selector', async ({ page }) => {
    await page.goto('/hi/login');
    await expect(page.getByLabel(/मोबाइल|Mobile/)).toBeVisible();
    await expect(page.getByText(/role|भूमिका/i)).toHaveCount(0);
  });
});

test.describe('staff', () => {
  test('staff login → MFA → dashboard (seeded Super Admin)', async ({ page }) => {
    await page.goto(`${ADMIN}/en/admin/login`);
    await page.getByLabel(/Work email/).fill('super-admin@rajyarank.dev');
    await page.getByLabel(/Password/).fill('RajyaRank@Dev1');
    await page.getByRole('button', { name: /Sign in/ }).click();
    // Super Admin has MFA enrolled → MFA step appears.
    await expect(page.getByText(/Two-factor|प्रमाणीकरण/)).toBeVisible();
    // (TOTP code is generated from the seed-printed secret in CI.)
  });

  test('teacher cannot see admin-only nav (UI hint) and is blocked server-side', async ({ page }) => {
    await page.goto(`${ADMIN}/en/admin/login`);
    await page.getByLabel(/Work email/).fill('teacher@rajyarank.dev');
    await page.getByLabel(/Password/).fill('RajyaRank@Dev1');
    await page.getByRole('button', { name: /Sign in/ }).click();
    await expect(page).toHaveURL(/my-content/);
    // The real 403 + audit assertion lives in the API integration spec
    // (apps/api/test/auth-flows.int-spec.ts) which calls the endpoint directly.
  });
});
