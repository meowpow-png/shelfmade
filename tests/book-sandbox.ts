import { cpSync, mkdtempSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'

const SAMPLE_BOOK = resolve(__dirname, '../examples/sample-book')
const PACKAGE_ROOT = resolve(__dirname, '..')

// Must live under the repo root because react/react-dom/etc.
// are hoisted at /workspace/node_modules, and Node's resolution
// only finds them by walking up from a sandbox nested under there
const SANDBOXES_DIR = resolve(__dirname, '.sandboxes')

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
