import { readFileSync, writeFileSync } from 'node:fs'

import { withOrder } from '../../src/engine/books'
import { chapterPath, type BookSandbox } from '../book-sandbox'
import { expect, test } from './test'

// Tests share a mutable worker sandbox and must run in declaration order.
test.describe.configure({ mode: 'serial' })

function seedFieldNoteOrders(sandbox: BookSandbox) {
  for (const [index, file] of ['chapter-1.mdx', 'chapter-2.mdx', 'chapter-3.mdx'].entries()) {
    const path = chapterPath(sandbox, 'field-notes', file)
    writeFileSync(path, withOrder(readFileSync(path, 'utf-8'), index + 1))
  }
}

test.use({
  editorServerOptions: { portBase: 8799, prepareSandbox: seedFieldNoteOrders },
})

// Each test needs the same baseline despite sharing a worker sandbox.
test.beforeEach(async ({ sandbox }) => seedFieldNoteOrders(sandbox))

test('reordering a sibling chapter never banners the chapter that is open', async ({
  chapter,
  editorBaseURL,
  openBook,
  page,
  request,
}) => {
  await openBook('field-notes')

  // Chapter One is selected by default; moving Chapter Three to first shifts its order too
  const response = await request.put(
    `${editorBaseURL}/books/field-notes/chapters/chapter-3/order`,
    { data: '1' },
  )
  expect(response.status()).toBe(200)

  await expect(page.locator('.chapter-nav-item')).toHaveText([
    'Chapter Three',
    'Chapter One',
    'Chapter Two',
  ])
  await expect(chapter('Chapter One')).toBeVisible()
  await expect(page.locator('.editor-conflict-banner')).toHaveCount(0)
})

test('dragging the currently-open chapter to a new position never banners it', async ({
  chapter,
  openBook,
  page,
}) => {
  await openBook('field-notes')

  const source = page.locator('.chapter-nav-item', { hasText: 'Chapter One' }).locator('..')
  const target = page.locator('.chapter-nav-item', { hasText: 'Chapter Three' }).locator('..')
  await source.dragTo(target)

  await expect(page.locator('.chapter-nav-item')).toHaveText([
    'Chapter Two',
    'Chapter Three',
    'Chapter One',
  ])
  await expect(chapter('Chapter One')).toBeVisible()
  await expect(page.locator('.editor-conflict-banner')).toHaveCount(0)
})
