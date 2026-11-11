import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  // Chromium-only: paged.js's own break-relocation handler relies on
  // document.caretRangeFromPoint, which is Chromium/WebKit-only, matching
  // the Chromium-locked rendering path already used by engine/print.ts.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
