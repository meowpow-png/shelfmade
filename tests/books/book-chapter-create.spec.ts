import { rmSync, writeFileSync } from 'node:fs'
import { type APIResponse } from '@playwright/test'

import { chapterPath } from '../book-sandbox'
import { expect, test } from './test'

interface ChapterPayload {
  slug: string
  title: string
  content: string
}

// Finds the new chapter by slug index, since the create response doesn't name it directly
async function newestChapter(response: APIResponse): Promise<ChapterPayload> {
  const chapters = (await response.json()) as ChapterPayload[]
  return chapters.reduce((newest, candidate) =>
    Number(candidate.slug.match(/^chapter-(\d+)$/)?.[1] ?? -1) >
    Number(newest.slug.match(/^chapter-(\d+)$/)?.[1] ?? -1)
      ? candidate
      : newest,
  )
}

test('creates chapter-4, skipping an unrelated filename but counting it toward order', async ({
  bookOrderServer,
  fieldNotes,
  request,
}) => {
  writeFileSync(chapterPath(fieldNotes.sandbox, 'field-notes', 'notes.mdx'), '# Notes\n')

  const response = await request.post(`${bookOrderServer.baseURL}/books/field-notes/chapters`)
  expect(response.status()).toBe(201)

  const chapter = await newestChapter(response)
  expect(chapter.slug).toBe('chapter-4')
  expect(chapter.title).toBe('Untitled chapter')

  const source = fieldNotes.source('chapter-4.mdx')
  // notes.mdx gets backfilled to order 4 before this chapter is created, so this is 5, not 4
  expect(fieldNotes.orderOf('chapter-4.mdx')).toBe(5)
  expect(source).toContain('title: "Untitled chapter"')
  expect(source.replace(/^---[\s\S]*?---\n*/, '')).toBe('')
})

// A reused index forces Vite's dev HMR into a full page reload instead of hot-updating
test('does not reuse a deleted chapter index', async ({ bookOrderServer, fieldNotes, request }) => {
  const first = await request.post(`${bookOrderServer.baseURL}/books/field-notes/chapters`)
  const { slug: firstSlug } = await newestChapter(first)
  expect(firstSlug).toBe('chapter-4')

  rmSync(chapterPath(fieldNotes.sandbox, 'field-notes', `${firstSlug}.mdx`))

  const second = await request.post(`${bookOrderServer.baseURL}/books/field-notes/chapters`)
  const { slug: secondSlug } = await newestChapter(second)
  expect(secondSlug).toBe('chapter-5')
})
