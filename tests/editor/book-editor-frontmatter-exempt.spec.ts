import { readFileSync, writeFileSync } from 'node:fs'

import { chapterPath, type BookSandbox } from '../book-sandbox'
import { expect, test } from './test'

// Tests share a mutable worker sandbox and must run in declaration order.
test.describe.configure({ mode: 'serial' })

function removeFieldNoteOrders(sandbox: BookSandbox) {
  // The real content this copies from isn't guaranteed to be order-less or filename-ordered
  for (const file of ['chapter-1.mdx', 'chapter-2.mdx', 'chapter-3.mdx']) {
    const path = chapterPath(sandbox, 'field-notes', file)
    writeFileSync(path, readFileSync(path, 'utf-8').replace(/^order:.*\n/m, ''))
  }
}

test.use({
  editorServerOptions: { portBase: 8999, prepareSandbox: removeFieldNoteOrders },
})

// Each test renames a different chapter to a distinct title, so none needs to undo another's
function renameTitle(chapterFile: string, from: string, to: string) {
  const original = readFileSync(chapterFile, 'utf-8')
  writeFileSync(chapterFile, original.replace(`title: ${from}`, `title: ${to}`))
}

test('a frontmatter-only external change on the open chapter never banners', async ({
  openBook,
  page,
  sandbox,
}) => {
  await openBook('field-notes')

  const paneBefore = await page.locator('.cm-content').innerText()
  const chapterFile = chapterPath(sandbox, 'field-notes', 'chapter-1.mdx')
  renameTitle(chapterFile, 'Chapter One', 'Renamed Chapter One')

  await expect(page.locator('.editor-chapter-title')).toHaveText('Renamed Chapter One')
  await expect(page.locator('.editor-conflict-banner')).toHaveCount(0)
  await expect(page.locator('.cm-content')).toHaveText(paneBefore, { useInnerText: true })
})

test('autosave after a frontmatter-only change writes the new frontmatter, not a stale copy', async ({
  openBook,
  page,
  sandbox,
  selectChapter,
}) => {
  await openBook('field-notes')
  await selectChapter('Chapter Two')

  const chapterFile = chapterPath(sandbox, 'field-notes', 'chapter-2.mdx')
  renameTitle(chapterFile, 'Chapter Two', 'Renamed Chapter Two')
  await expect(page.locator('.editor-chapter-title')).toHaveText('Renamed Chapter Two')
  await expect(page.locator('.editor-conflict-banner')).toHaveCount(0)

  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('Typed after an external frontmatter change. ')

  await expect
    .poll(() => readFileSync(chapterFile, 'utf-8'))
    .toContain('Typed after an external frontmatter change.')
  expect(readFileSync(chapterFile, 'utf-8')).toContain('title: Renamed Chapter Two')
})

test('switching away from a chapter flushes with its refreshed frontmatter, not a stale copy', async ({
  openBook,
  page,
  sandbox,
  selectChapter,
}) => {
  await openBook('field-notes')
  await selectChapter('Chapter Three')

  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('Pending edit before switching away. ')

  const chapterFile = chapterPath(sandbox, 'field-notes', 'chapter-3.mdx')
  renameTitle(chapterFile, 'Chapter Three', 'Renamed Chapter Three')
  await expect(page.locator('.editor-chapter-title')).toHaveText('Renamed Chapter Three')
  await expect(page.locator('.editor-conflict-banner')).toHaveCount(0)

  // Picked by nav position, not title - earlier tests already renamed chapter titles
  await page.locator('.chapter-nav-item').first().click()

  const saved = readFileSync(chapterFile, 'utf-8')
  expect(saved).toContain('Pending edit before switching away.')
  expect(saved).toContain('title: Renamed Chapter Three')
})
