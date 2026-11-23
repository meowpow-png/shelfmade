import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

import { resolveBooks, withOrder } from '../src/engine/books'
import { chapterPath, createBookSandbox, type BookSandbox } from './book-sandbox'

const FIELD_NOTES_FILES = ['chapter-1.mdx', 'chapter-2.mdx', 'chapter-3.mdx']

function readOrder(sandbox: BookSandbox, file: string) {
  const source = readFileSync(chapterPath(sandbox, 'field-notes', file), 'utf-8')
  return Number(source.match(/^order:\s*(\d+)/m)?.[1])
}

function setOrder(sandbox: BookSandbox, file: string, order: number) {
  const path = chapterPath(sandbox, 'field-notes', file)
  writeFileSync(path, withOrder(readFileSync(path, 'utf-8'), order))
}

function clearOrder(sandbox: BookSandbox, file: string) {
  const path = chapterPath(sandbox, 'field-notes', file)
  writeFileSync(path, readFileSync(path, 'utf-8').replace(/^order:.*\n/m, ''))
}

// The example content this copies from isn't guaranteed to be order-less itself
function createUnmigratedSandbox() {
  const sandbox = createBookSandbox()
  FIELD_NOTES_FILES.forEach((file) => clearOrder(sandbox, file))
  return sandbox
}

function loadFieldNotes(sandbox: BookSandbox, backfillOrder = true) {
  const [book] = resolveBooks(
    { books: { 'field-notes': { title: 'Field Notes' } } },
    sandbox.root,
    { backfillOrder },
  )
  return book!
}

test('a fully unmigrated book gets sequential order written to disk', () => {
  const sandbox = createUnmigratedSandbox()
  try {
    const book = loadFieldNotes(sandbox)
    expect(book.chapters.map((c) => c.slug)).toEqual(['chapter-1', 'chapter-2', 'chapter-3'])
    expect(book.chapters.map((c) => c.order)).toEqual([1, 2, 3])
    expect(readOrder(sandbox, 'chapter-1.mdx')).toBe(1)
    expect(readOrder(sandbox, 'chapter-2.mdx')).toBe(2)
    expect(readOrder(sandbox, 'chapter-3.mdx')).toBe(3)
  } finally {
    sandbox.cleanup()
  }
})

test('loading an already-backfilled book again rewrites nothing', () => {
  const sandbox = createUnmigratedSandbox()
  try {
    loadFieldNotes(sandbox)
    const before = FIELD_NOTES_FILES.map((file) =>
      readFileSync(chapterPath(sandbox, 'field-notes', file)),
    )

    loadFieldNotes(sandbox)
    const after = FIELD_NOTES_FILES.map((file) =>
      readFileSync(chapterPath(sandbox, 'field-notes', file)),
    )

    expect(after).toEqual(before)
  } finally {
    sandbox.cleanup()
  }
})

test('an explicit order is kept; order-less chapters append after it by filename', () => {
  const sandbox = createUnmigratedSandbox()
  try {
    setOrder(sandbox, 'chapter-2.mdx', 5)
    const book = loadFieldNotes(sandbox)

    const orderBySlug = new Map(book.chapters.map((c) => [c.slug, c.order]))
    expect(orderBySlug.get('chapter-2')).toBe(5)
    expect(orderBySlug.get('chapter-1')).toBe(6)
    expect(orderBySlug.get('chapter-3')).toBe(7)
    expect(book.chapters.map((c) => c.slug)).toEqual(['chapter-2', 'chapter-1', 'chapter-3'])
  } finally {
    sandbox.cleanup()
  }
})

test('the static build path never backfills or writes to disk', () => {
  const sandbox = createUnmigratedSandbox()
  try {
    const before = readFileSync(chapterPath(sandbox, 'field-notes', 'chapter-1.mdx'))
    const book = loadFieldNotes(sandbox, false)

    expect(book.chapters.map((c) => c.slug)).toEqual(['chapter-1', 'chapter-2', 'chapter-3'])
    expect(book.chapters.every((c) => c.order === undefined)).toBe(true)
    expect(readFileSync(chapterPath(sandbox, 'field-notes', 'chapter-1.mdx'))).toEqual(before)
  } finally {
    sandbox.cleanup()
  }
})

test('backfill only touches the order line, leaving other frontmatter and body untouched', () => {
  const sandbox = createUnmigratedSandbox()
  try {
    loadFieldNotes(sandbox)
    const source = readFileSync(chapterPath(sandbox, 'field-notes', 'chapter-1.mdx'), 'utf-8')
    expect(source).toContain('title: Chapter One')
    expect(source).toContain('# The Harbour at Dawn')
  } finally {
    sandbox.cleanup()
  }
})
