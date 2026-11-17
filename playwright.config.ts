import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  // Match the Chromium-based PDF rendering environment.
  projects: [
    {
      name: 'chromium',
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
      use: devices['Desktop Firefox'],
    },
  ],
})
