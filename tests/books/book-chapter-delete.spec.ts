import { existsSync } from 'node:fs'

import { chapterPath } from '../book-sandbox'
import { expect, test } from './test'

test('deleting a chapter returns 204 and removes its file from disk', async ({
  bookOrderServer,
  fieldNotes,
  request,
}) => {
  const path = chapterPath(fieldNotes.sandbox, 'field-notes', 'chapter-2.mdx')
  expect(existsSync(path)).toBe(true)

  const response = await request.delete(
    `${bookOrderServer.baseURL}/books/field-notes/chapters/chapter-2`,
  )
  expect(response.status()).toBe(204)

  expect(existsSync(path)).toBe(false)
})

test('deleting a chapter renumbers the chapters that follow it', async ({
  bookOrderServer,
  fieldNotes,
  request,
}) => {
  const response = await request.delete(
    `${bookOrderServer.baseURL}/books/field-notes/chapters/chapter-1`,
  )
  expect(response.status()).toBe(204)

  expect(fieldNotes.orderOf('chapter-2.mdx')).toBe(1)
  expect(fieldNotes.orderOf('chapter-3.mdx')).toBe(2)
})

test('deleting the last chapter leaves the others byte-identical', async ({
  bookOrderServer,
  fieldNotes,
  request,
}) => {
  const chapter1Before = fieldNotes.bytes('chapter-1.mdx')
  const chapter2Before = fieldNotes.bytes('chapter-2.mdx')

  const response = await request.delete(
    `${bookOrderServer.baseURL}/books/field-notes/chapters/chapter-3`,
  )
  expect(response.status()).toBe(204)

  expect(fieldNotes.bytes('chapter-1.mdx')).toEqual(chapter1Before)
  expect(fieldNotes.bytes('chapter-2.mdx')).toEqual(chapter2Before)
})

test('deleting every chapter leaves none behind, without error', async ({
  bookOrderServer,
  fieldNotes,
  request,
}) => {
  for (const chapterSlug of ['chapter-1', 'chapter-2', 'chapter-3']) {
    const response = await request.delete(
      `${bookOrderServer.baseURL}/books/field-notes/chapters/${chapterSlug}`,
    )
    expect(response.status()).toBe(204)
  }

  for (const file of fieldNotes.files) {
    expect(existsSync(chapterPath(fieldNotes.sandbox, 'field-notes', file))).toBe(false)
  }
})
