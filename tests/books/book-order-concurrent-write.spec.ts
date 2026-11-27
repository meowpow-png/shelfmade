import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from './test'

function wait(ms: number) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms))
}

function fieldNotesContentDir(sandboxRoot: string) {
  return join(sandboxRoot, 'books', 'field-notes', 'content')
}

test('reorder recomputes from the latest order, not the pre-lock snapshot', async ({
  bookOrderServer,
  fieldNotes,
}) => {
  const lockPath = join(fieldNotesContentDir(fieldNotes.sandbox.root), '.order.lock')
  mkdirSync(lockPath)

  const reordering = bookOrderServer.reorder('chapter-3', 1)
  // Lets the handler take its pre-lock snapshot and start waiting on the lock
  await wait(75)

  // Simulates a concurrent write landing while this request is blocked on the lock
  fieldNotes.setOrder('chapter-2.mdx', 1)
  fieldNotes.setOrder('chapter-1.mdx', 2)

  rmSync(lockPath, { recursive: true })
  const response = await reordering

  expect(response.status()).toBe(200)
  expect(fieldNotes.orderOf('chapter-3.mdx')).toBe(1)
  expect(fieldNotes.orderOf('chapter-2.mdx')).toBe(2)
  expect(fieldNotes.orderOf('chapter-1.mdx')).toBe(3)
})

test('delete recomputes remaining order from the latest state, not the pre-lock snapshot', async ({
  bookOrderServer,
  fieldNotes,
  request,
}) => {
  const lockPath = join(fieldNotesContentDir(fieldNotes.sandbox.root), '.order.lock')
  mkdirSync(lockPath)

  const deleting = request.delete(`${bookOrderServer.baseURL}/books/field-notes/chapters/chapter-1`)
  // Lets the handler take its pre-lock snapshot and start waiting on the lock
  await wait(75)

  // Simulates a concurrent write landing while this request is blocked on the lock
  fieldNotes.setOrder('chapter-3.mdx', 2)
  fieldNotes.setOrder('chapter-2.mdx', 3)

  rmSync(lockPath, { recursive: true })
  const response = await deleting

  expect(response.status()).toBe(200)
  expect(fieldNotes.orderOf('chapter-3.mdx')).toBe(1)
  expect(fieldNotes.orderOf('chapter-2.mdx')).toBe(2)
})
