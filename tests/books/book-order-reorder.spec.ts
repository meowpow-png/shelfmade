import { expect, test } from './test'

test('moving a chapter to the first position renumbers every chapter it passed over', async ({
  bookOrderServer,
  fieldNotes,
}) => {
  const response = await bookOrderServer.reorder('chapter-3', 1)
  expect(response.status()).toBe(204)

  expect(fieldNotes.orderOf('chapter-3.mdx')).toBe(1)
  expect(fieldNotes.orderOf('chapter-1.mdx')).toBe(2)
  expect(fieldNotes.orderOf('chapter-2.mdx')).toBe(3)
})

test('an adjacent swap only touches the two chapters involved', async ({
  bookOrderServer,
  fieldNotes,
}) => {
  const untouchedBefore = fieldNotes.bytes('chapter-3.mdx')

  const response = await bookOrderServer.reorder('chapter-2', 1)
  expect(response.status()).toBe(204)

  expect(fieldNotes.orderOf('chapter-2.mdx')).toBe(1)
  expect(fieldNotes.orderOf('chapter-1.mdx')).toBe(2)
  expect(fieldNotes.bytes('chapter-3.mdx')).toEqual(untouchedBefore)
})

test('requesting a chapter at its current position writes nothing', async ({
  bookOrderServer,
  fieldNotes,
}) => {
  const before = fieldNotes.files.map(fieldNotes.bytes)

  const response = await bookOrderServer.reorder('chapter-2', 2)
  expect(response.status()).toBe(204)

  const after = fieldNotes.files.map(fieldNotes.bytes)
  expect(after).toEqual(before)
})
