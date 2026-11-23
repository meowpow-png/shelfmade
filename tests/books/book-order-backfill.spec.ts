import { expect, test } from './test'

test('a fully unmigrated book gets sequential order written to disk', ({ fieldNotes }) => {
  const book = fieldNotes.load()

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

test('loading an already-backfilled book again rewrites nothing', ({ fieldNotes }) => {
  fieldNotes.load()
  const before = fieldNotes.files.map(fieldNotes.bytes)

  fieldNotes.load()
  const after = fieldNotes.files.map(fieldNotes.bytes)

  expect(after).toEqual(before)
})

test('an explicit order is kept; order-less chapters append after it by filename', ({
  fieldNotes,
}) => {
  fieldNotes.setOrder('chapter-2.mdx', 5)
  const book = fieldNotes.load()

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

test('the static build path never backfills or writes to disk', ({ fieldNotes }) => {
  const before = fieldNotes.source('chapter-1.mdx')
  const book = fieldNotes.load(false)

  expect(book.chapters.map((chapter) => chapter.slug)).toEqual([
    'chapter-1',
    'chapter-2',
    'chapter-3',
  ])
  expect(book.chapters.every((chapter) => chapter.order === undefined)).toBe(true)
  expect(fieldNotes.source('chapter-1.mdx')).toEqual(before)
})

test('backfill only touches the order line, leaving other frontmatter and body untouched', ({
  fieldNotes,
}) => {
  fieldNotes.load()
  const source = fieldNotes.source('chapter-1.mdx')

  expect(source).toContain('title: Chapter One')
  expect(source).toContain('# The Harbour at Dawn')
})
