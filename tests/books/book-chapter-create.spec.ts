import { rmSync, writeFileSync } from 'node:fs'

import { chapterPath } from '../book-sandbox'
import { expect, test } from './test'

test('creates chapter-4, skipping an unrelated filename but counting it toward order', async ({
  bookOrderServer,
  fieldNotes,
  request,
}) => {
  writeFileSync(chapterPath(fieldNotes.sandbox, 'field-notes', 'notes.mdx'), '# Notes\n')

  const response = await request.post(`${bookOrderServer.baseURL}/books/field-notes/chapters`)
  expect(response.status()).toBe(201)

  const chapter = (await response.json()) as { slug: string; title: string }
  expect(chapter).toEqual({ slug: 'chapter-4', title: 'Untitled chapter' })

  const source = fieldNotes.source('chapter-4.mdx')
  // notes.mdx gets backfilled to order 4 before this chapter is created, so this is 5, not 4
  expect(fieldNotes.orderOf('chapter-4.mdx')).toBe(5)
  expect(source).toContain('title: "Untitled chapter"')
  expect(source.replace(/^---[\s\S]*?---\n*/, '')).toBe('')
})

// A reused index forces Vite's dev HMR into a full page reload instead of hot-updating
test('does not reuse a deleted chapter index', async ({ bookOrderServer, fieldNotes, request }) => {
  const first = await request.post(`${bookOrderServer.baseURL}/books/field-notes/chapters`)
  const { slug: firstSlug } = (await first.json()) as { slug: string }
  expect(firstSlug).toBe('chapter-4')

  rmSync(chapterPath(fieldNotes.sandbox, 'field-notes', `${firstSlug}.mdx`))

  const second = await request.post(`${bookOrderServer.baseURL}/books/field-notes/chapters`)
  const { slug: secondSlug } = (await second.json()) as { slug: string }
  expect(secondSlug).toBe('chapter-5')
})
