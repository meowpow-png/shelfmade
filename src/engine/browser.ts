import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'

const INSTALL_ARGS = ['install', 'chromium', '--only-shell']

export class BrowserMissingError extends Error {
  constructor() {
    super('Chromium for PDF printing is not installed')
  }
}

export function isBrowserMissing(error: unknown) {
  return error instanceof Error && error.message.includes("Executable doesn't exist")
}

// Downloads the headless Chromium matching the installed
// Playwright version into Playwright's shared per-user cache
export function installBrowser() {
  const cli = join(dirname(require.resolve('playwright/package.json')), 'cli.js')
  const { status } = spawnSync(process.execPath, [cli, ...INSTALL_ARGS], { stdio: 'inherit' })

  if (status !== 0) {
    throw new Error(
      `Downloading Chromium failed. Check your connection, or run \`npx playwright ${INSTALL_ARGS.join(' ')}\` in the book project.`,
    )
  }
}
