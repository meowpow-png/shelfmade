import { cpSync, mkdtempSync, mkdirSync, rmSync, statSync, symlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'

const SAMPLE_BOOK = resolve(__dirname, '../examples/sample-book')
const PACKAGE_ROOT = resolve(__dirname, '..')
const BOOK_INTEGRATION_LOCK = 'book-integration'

// Must live under the repo root because react/react-dom/etc.
// are hoisted at /workspace/node_modules, and Node's resolution
// only finds them by walking up from a sandbox nested under there
const SANDBOXES_DIR = resolve(__dirname, '.sandboxes')
const LOCKS_DIR = resolve(SANDBOXES_DIR, '.locks')

export interface BookSandbox {
  root: string
  cleanup: () => void
}

export function createBookSandbox(): BookSandbox {
  mkdirSync(SANDBOXES_DIR, { recursive: true })
  const root = mkdtempSync(join(SANDBOXES_DIR, 'book-'))

  for (const entry of ['books', 'shelfmade.config.ts']) {
    cpSync(join(SAMPLE_BOOK, entry), join(root, entry), { recursive: true })
  }

  // Only "shelfmade" itself needs linking;
  // every other dependency resolves via the repo root
  mkdirSync(join(root, 'node_modules'))
  symlinkSync(PACKAGE_ROOT, join(root, 'node_modules', 'shelfmade'), 'dir')

  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  }
}

export function chapterPath(sandbox: BookSandbox, bookSlug: string, chapterFile: string): string {
  return join(sandbox.root, 'books', bookSlug, 'content', chapterFile)
}

// Cross-process mutex via atomic mkdir
export async function acquireLock(name: string, timeoutMs = 120_000): Promise<() => void> {
  mkdirSync(LOCKS_DIR, { recursive: true })
  const lockPath = join(LOCKS_DIR, name)
  const start = Date.now()

  while (true) {
    try {
      mkdirSync(lockPath)
      return () => rmSync(lockPath, { recursive: true, force: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error

      // Reclaim a lock abandoned by a killed process rather than waiting out the timeout
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > timeoutMs)
          rmSync(lockPath, { recursive: true })
      } catch {
        // Lock was removed concurrently - fine, just retry
      }

      if (Date.now() - start > timeoutMs) throw new Error(`Timed out acquiring lock: ${name}`)
      await new Promise((r) => setTimeout(r, 100))
    }
  }
}

export function acquireBookIntegrationLock(): Promise<() => void> {
  return acquireLock(BOOK_INTEGRATION_LOCK)
}
