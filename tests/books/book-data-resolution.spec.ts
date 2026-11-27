import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

import { resolveBooks } from '../../src/engine/books'
import { resolvePageSize } from '../../src/engine/page-format'
import { createBookSandbox } from '../book-sandbox'

test('a book folder with no book.json or book.config.ts gets sane defaults', async () => {
  const sandbox = createBookSandbox()

  try {
    const contentDir = join(sandbox.root, 'books', 'river-notes', 'content')
    mkdirSync(contentDir, { recursive: true })
    writeFileSync(join(contentDir, 'chapter-1.mdx'), '# Hello\n')

    const books = await resolveBooks({}, sandbox.root)
    const book = books.find((candidate) => candidate.slug === 'river-notes')

    expect(book?.title).toBe('River Notes')
    expect(book?.lang).toBe('en')
    expect(book?.pageSize).toEqual(resolvePageSize('A5'))
  } finally {
    sandbox.cleanup()
  }
})

test('a partial book.json falls back to the project config, then a built-in default', async () => {
  const sandbox = createBookSandbox()

  try {
    writeFileSync(
      join(sandbox.root, 'books', 'pocket-tales', 'book.json'),
      JSON.stringify({ lang: 'de' }),
    )

    const books = await resolveBooks({ pageFormat: 'A4' }, sandbox.root)
    const book = books.find((candidate) => candidate.slug === 'pocket-tales')

    expect(book?.lang).toBe('de')
    expect(book?.pageSize).toEqual(resolvePageSize('A4'))
    expect(book?.title).toBe('Pocket Tales')
  } finally {
    sandbox.cleanup()
  }
})
