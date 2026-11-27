import { expect, test } from './test'

test('renaming only touches the title line, leaving order, body, and siblings untouched', async ({
  bookOrderServer,
  fieldNotes,
  request,
}) => {
  const bodyBefore = fieldNotes.source('chapter-2.mdx').replace(/^---[\s\S]*?---\n*/, '')
  const chapter1Before = fieldNotes.bytes('chapter-1.mdx')
  const chapter3Before = fieldNotes.bytes('chapter-3.mdx')

  const response = await request.put(
    `${bookOrderServer.baseURL}/books/field-notes/chapters/chapter-2/title`,
    { data: 'Renamed Chapter Two' },
  )
  expect(response.status()).toBe(200)

  const after = fieldNotes.source('chapter-2.mdx')
  expect(after).toContain('title: "Renamed Chapter Two"')
  expect(after).toContain('order: 2')
  expect(after.replace(/^---[\s\S]*?---\n*/, '')).toBe(bodyBefore)

  expect(fieldNotes.bytes('chapter-1.mdx')).toEqual(chapter1Before)
  expect(fieldNotes.bytes('chapter-3.mdx')).toEqual(chapter3Before)
})

test('a blank title is rejected without touching the chapter file', async ({
  bookOrderServer,
  fieldNotes,
  request,
}) => {
  const before = fieldNotes.bytes('chapter-2.mdx')

  const response = await request.put(
    `${bookOrderServer.baseURL}/books/field-notes/chapters/chapter-2/title`,
    { data: '   ' },
  )
  expect(response.status()).toBe(400)
  expect(fieldNotes.bytes('chapter-2.mdx')).toEqual(before)
})

test('a title over the length limit is rejected', async ({ bookOrderServer, request }) => {
  const response = await request.put(
    `${bookOrderServer.baseURL}/books/field-notes/chapters/chapter-2/title`,
    { data: 'x'.repeat(201) },
  )
  expect(response.status()).toBe(400)
})
