import { defineConfig, devices } from '@playwright/test';

const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'on-first-retry',
    // Emulate a mid-range Android to honor the mobile-first requirement.
    ...devices['Pixel 5'],
    // Use the system-installed Chrome rather than a Playwright-managed
    // download — this sandbox already has one at /usr/bin/google-chrome
    // (shared with the interactive Playwright MCP browser), and `playwright
    // install` needs network/apt access this environment may not have.
    channel: 'chrome',
  },
  projects: [
    { name: 'web', use: { baseURL: WEB } },
    { name: 'admin', use: { baseURL: ADMIN } },
  ],
});
