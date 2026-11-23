import { readFileSync, writeFileSync } from 'node:fs'

import { chapterPath } from '../book-sandbox'
import { expect, test } from './test'

// Tests share a mutable worker sandbox and must run in declaration order.
test.describe.configure({ mode: 'serial' })
test.use({ editorServerOptions: { portBase: 8299 } })

test('an external edit to a clean chapter shows the banner and leaves the pane untouched', async ({
  chapter,
  openBook,
  sandbox,
}) => {
  await openBook('field-notes')

  // Chapter One is selected by default
  const selectedChapter = chapter('Chapter One')
  const paneBefore = await selectedChapter.locator('.cm-content').innerText()

  const chapterFile = chapterPath(sandbox, 'field-notes', 'chapter-1.mdx')
  const original = readFileSync(chapterFile, 'utf-8')
  writeFileSync(chapterFile, original.replace('The Harbour at Dawn', 'A Different Title'))

  await expect(selectedChapter.locator('.editor-conflict-banner')).toBeVisible()
  await expect(selectedChapter.locator('.cm-content')).toHaveText(paneBefore, {
    useInnerText: true,
  })
})

test('an external edit to a dirty chapter shows the banner and keeps local edits', async ({
  chapter,
  openBook,
  page,
  sandbox,
  selectChapter,
}) => {
  await openBook('field-notes')
  await selectChapter('Chapter Two')

  const selectedChapter = chapter('Chapter Two')
  await selectedChapter.locator('.cm-content').click()
  // Move cursor to doc-start so typing never lands inside a tag
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('Local edit that must survive.')
  const paneBefore = await selectedChapter.locator('.cm-content').innerText()

  const chapterFile = chapterPath(sandbox, 'field-notes', 'chapter-2.mdx')
  const original = readFileSync(chapterFile, 'utf-8')
  writeFileSync(chapterFile, `${original}\nExternally appended paragraph.\n`)

  await expect(selectedChapter.locator('.editor-conflict-banner')).toBeVisible()
  await expect(selectedChapter.locator('.cm-content')).toHaveText(paneBefore, {
    useInnerText: true,
  })
})

test('"Load external changes" loads disk content and clears the banner', async ({
  chapter,
  openBook,
  sandbox,
  selectChapter,
}) => {
  await openBook('field-notes')
  await selectChapter('Chapter Three')

  const selectedChapter = chapter('Chapter Three')

  const chapterFile = chapterPath(sandbox, 'field-notes', 'chapter-3.mdx')
  const original = readFileSync(chapterFile, 'utf-8')
  writeFileSync(chapterFile, original.replace("The Lighthouse Keeper's Garden", 'A New Heading'))

  await expect(selectedChapter.locator('.editor-conflict-banner')).toBeVisible()

  await selectedChapter.getByRole('button', { name: 'Load external changes' }).click()

  await expect(selectedChapter.locator('.editor-conflict-banner')).toHaveCount(0)
  await expect(selectedChapter.locator('.cm-content')).toContainText('A New Heading')
})

test('autosave is not paused while a banner is showing', async ({
  chapter,
  openBook,
  page,
  sandbox,
}) => {
  await openBook('good-dog-mom')

  // "Reading Her Signals" is selected by default
  const selectedChapter = chapter('Reading Her Signals')

  const chapterFile = chapterPath(sandbox, 'good-dog-mom', '1-reading-her-signals.mdx')
  const original = readFileSync(chapterFile, 'utf-8')
  writeFileSync(chapterFile, original.replace('vocabulary.', 'a whole vocabulary.'))

  await expect(selectedChapter.locator('.editor-conflict-banner')).toBeVisible()

  await selectedChapter.locator('.cm-content').click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('Still typing through the conflict. ')

  await expect
    .poll(() => readFileSync(chapterFile, 'utf-8'))
    .toContain('Still typing through the conflict.')
})

test('an external edit to a hidden chapter never banners, and is silently overwritten on autosave', async ({
  chapter,
  openBook,
  page,
  sandbox,
  selectChapter,
}) => {
  await openBook('good-dog-mom')

  // Neither chapter is touched by the other tests in this file, which share this sandbox
  await selectChapter('Becoming Her Secure Base')
  await selectChapter('The Rituals That Build Trust')

  const chapterFile = chapterPath(sandbox, 'good-dog-mom', '2-becoming-her-secure-base.mdx')
  const original = readFileSync(chapterFile, 'utf-8')
  writeFileSync(chapterFile, original.replace('secure base.', 'secure, unshakeable base.'))

  // The hidden chapter isn't mounted, so there's nothing to raise a banner on
  await expect(page.locator('.editor-conflict-banner')).toHaveCount(0)

  // Switching back doesn't retroactively surface the conflict either
  await selectChapter('Becoming Her Secure Base')
  await expect(page.locator('.editor-conflict-banner')).toHaveCount(0)

  await chapter('Becoming Her Secure Base').locator('.cm-content').click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('Overwriting from the editor. ')

  await expect
    .poll(() => readFileSync(chapterFile, 'utf-8'))
    .toContain('Overwriting from the editor.')
})
