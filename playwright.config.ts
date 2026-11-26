import { defineConfig, devices } from '@playwright/test'

const bookIntegrationTests = [
  /tests\/books\/book-order-reorder\.spec\.ts/,
  /tests\/books\/book-chapter-create\.spec\.ts/,
  /tests\/books\/book-chapter-rename\.spec\.ts/,
  /tests\/books\/book-create\.spec\.ts/,
  /tests\/editor\/.*\.spec\.ts/,
]

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['list'], ['json', { outputFile: 'playwright-report/results.json' }]]
    : 'list',
  use: {
    trace: 'on-first-retry',
  },
  // Match the Chromium-based PDF rendering environment.
  projects: [
    {
      name: 'chromium',
      testIgnore: bookIntegrationTests,
      use: {
        ...devices['Desktop Chrome'],
        // The Docker image installs full Chromium rather than the headless shell.
        channel: 'chromium',
        // Allow file-based fixtures to reload their stylesheets during pagination.
        launchOptions: { args: ['--allow-file-access-from-files'] },
      },
    },
    {
      name: 'firefox',
      testIgnore: bookIntegrationTests,
      use: devices['Desktop Firefox'],
    },
    {
      name: 'chromium-book-integration',
      testMatch: bookIntegrationTests,
      workers: 1,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        launchOptions: { args: ['--allow-file-access-from-files'] },
      },
    },
    {
      name: 'firefox-book-integration',
      testMatch: bookIntegrationTests,
      workers: 1,
      use: devices['Desktop Firefox'],
    },
  ],
})
