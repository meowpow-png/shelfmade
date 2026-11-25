import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import { withOrderLock } from '../../src/engine/books'
import { expect, test } from './test'

function wait(ms: number) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms))
}

function fieldNotesContentDir(sandboxRoot: string) {
  return join(sandboxRoot, 'books', 'field-notes', 'content')
}

test('a fully unmigrated book gets sequential order written to disk', async ({ fieldNotes }) => {
  const book = await fieldNotes.load()

  expect(book.chapters.map((chapter) => chapter.slug)).toEqual([
    'chapter-1',
    'chapter-2',
    'chapter-3',
  ])
  expect(book.chapters.map((chapter) => chapter.order)).toEqual([1, 2, 3])
  expect(fieldNotes.orderOf('chapter-1.mdx')).toBe(1)
  expect(fieldNotes.orderOf('chapter-2.mdx')).toBe(2)
  expect(fieldNotes.orderOf('chapter-3.mdx')).toBe(3)
})

test('loading an already-backfilled book again rewrites nothing', async ({ fieldNotes }) => {
  await fieldNotes.load()
  const before = fieldNotes.files.map(fieldNotes.bytes)

  await fieldNotes.load()
  const after = fieldNotes.files.map(fieldNotes.bytes)

  expect(after).toEqual(before)
})

test('loading fully ordered chapters does not wait on the backfill lock', async ({
  fieldNotes,
}) => {
  fieldNotes.files.forEach((file, index) => fieldNotes.setOrder(file, index + 1))
  const lockPath = join(fieldNotes.sandbox.root, 'books', 'field-notes', 'content', '.order.lock')
  mkdirSync(lockPath)

  try {
    const book = await fieldNotes.load()

    expect(book.chapters.map((chapter) => chapter.order)).toEqual([1, 2, 3])
    expect(existsSync(lockPath)).toBe(true)
  } finally {
    rmSync(lockPath, { recursive: true, force: true })
  }
})

test('waiting for the order lock yields to the event loop', async ({ fieldNotes }) => {
  const contentDir = fieldNotesContentDir(fieldNotes.sandbox.root)
  const lockPath = join(contentDir, '.order.lock')
  mkdirSync(lockPath)

  let callbackRan = false
  const waiting = withOrderLock(contentDir, () => {
    callbackRan = true
  })

  try {
    await wait(75)
    expect(callbackRan).toBe(false)
  } finally {
    rmSync(lockPath, { recursive: true, force: true })
    await waiting
  }

  expect(callbackRan).toBe(true)
})

test('order lock allows only one writer at a time', async ({ fieldNotes }) => {
  const contentDir = fieldNotesContentDir(fieldNotes.sandbox.root)
  const events: string[] = []
  let releaseFirst: () => void
  const firstCanFinish = new Promise<void>((resolveFinish) => {
    releaseFirst = resolveFinish
  })

  const first = withOrderLock(contentDir, async () => {
    events.push('first started')
    await firstCanFinish
    events.push('first finished')
  })
  const second = withOrderLock(contentDir, () => events.push('second started'))

  try {
    await wait(75)
    expect(events).toEqual(['first started'])
  } finally {
    releaseFirst!()
    await Promise.all([first, second])
  }

  expect(events).toEqual(['first started', 'first finished', 'second started'])
})

test('an explicit order is kept; order-less chapters append after it by filename', async ({
  fieldNotes,
}) => {
  fieldNotes.setOrder('chapter-2.mdx', 5)
  const book = await fieldNotes.load()

  const orderBySlug = new Map(book.chapters.map((chapter) => [chapter.slug, chapter.order]))
  expect(orderBySlug.get('chapter-2')).toBe(5)
  expect(orderBySlug.get('chapter-1')).toBe(6)
  expect(orderBySlug.get('chapter-3')).toBe(7)
  expect(book.chapters.map((chapter) => chapter.slug)).toEqual([
    'chapter-2',
    'chapter-1',
    'chapter-3',
  ])
})

test('the static build path never backfills or writes to disk', async ({ fieldNotes }) => {
  const before = fieldNotes.source('chapter-1.mdx')
  const book = await fieldNotes.load(false)

  expect(book.chapters.map((chapter) => chapter.slug)).toEqual([
    'chapter-1',
    'chapter-2',
    'chapter-3',
  ])
  expect(book.chapters.every((chapter) => chapter.order === undefined)).toBe(true)
  expect(fieldNotes.source('chapter-1.mdx')).toEqual(before)
})

test('backfill only touches the order line, leaving other frontmatter and body untouched', async ({
  fieldNotes,
}) => {
  await fieldNotes.load()
  const source = fieldNotes.source('chapter-1.mdx')

  expect(source).toContain('title: "Chapter One"')
  expect(source).toContain('# The Harbour at Dawn')
})
