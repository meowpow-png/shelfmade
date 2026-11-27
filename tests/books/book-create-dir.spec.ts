import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

import { createBookDir } from '../../src/cli/vite-server'
import { createBookSandbox } from '../book-sandbox'

test('claims the base slug when its directory does not exist yet', async () => {
  const sandbox = createBookSandbox()

  try {
    const booksDir = join(sandbox.root, 'books')
    expect(createBookDir(booksDir, 'river-notes')).toBe('river-notes')
  } finally {
    sandbox.cleanup()
  }
})

test('an already-claimed directory is skipped in favor of the next suffix', async () => {
  const sandbox = createBookSandbox()

  try {
    const booksDir = join(sandbox.root, 'books')
    mkdirSync(join(booksDir, 'river-notes'))

    expect(createBookDir(booksDir, 'river-notes')).toBe('river-notes-2')
  } finally {
    sandbox.cleanup()
  }
})

test('the reserved index slug is always skipped, even when free', async () => {
  const sandbox = createBookSandbox()

  try {
    const booksDir = join(sandbox.root, 'books')
    expect(createBookDir(booksDir, 'index')).toBe('index-2')
  } finally {
    sandbox.cleanup()
  }
})
