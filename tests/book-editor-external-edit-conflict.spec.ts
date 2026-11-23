import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { type ViteDevServer } from 'vite'

import { startViteServer } from '../src/cli/vite-server'
import { acquireLock, chapterPath, createBookSandbox, type BookSandbox } from './book-sandbox'

// Avoids contention between concurrent Vite servers/pagedjs runs across workers
test.describe.configure({ mode: 'serial' })

let sandbox: BookSandbox
let server: ViteDevServer
let baseURL: string
let releaseLock: () => void

// Per-worker port, since chromium/firefox projects run in parallel
// Playwright requires the fixtures arg be destructured even when unused
// eslint-disable-next-line no-empty-pattern
test.beforeAll(async ({}, testInfo) => {
  // serial mode alone doesn't stop chromium/firefox workers overlapping - this mutex does
  testInfo.setTimeout(180_000)
  releaseLock = await acquireLock('external-edit-conflict')
  sandbox = createBookSandbox()
  const port = 8299 + testInfo.workerIndex
  server = await startViteServer(sandbox.root, port)
  baseURL = `http://127.0.0.1:${port}`
})

test.afterAll(async () => {
  try {
    await server?.close()
  } finally {
    sandbox?.cleanup()
    releaseLock?.()
  }
})

// Only the selected chapter is ever mounted, so this matches whichever one is shown
function chapterWrapper(page: Page, title: string) {
  return page
    .locator('.editor-chapter-wrapper')
    .filter({ has: page.locator('.editor-chapter-title', { hasText: title }) })
}

async function selectChapter(page: Page, title: string) {
  await page.getByRole('button', { name: title, exact: true }).click()
  await expect(chapterWrapper(page, title)).toBeVisible()
}

test('an external edit to a clean chapter shows the banner and leaves the pane untouched', async ({
  page,
}) => {
  await page.goto(`${baseURL}/field-notes.html`)
  await page.waitForFunction(() => document.getElementById('book-root')?.style.visibility === '')

  // Chapter One is selected by default
  const chapter = chapterWrapper(page, 'Chapter One')
  const paneBefore = await chapter.locator('.cm-content').innerText()

  const chapterFile = chapterPath(sandbox, 'field-notes', 'chapter-1.mdx')
  const original = readFileSync(chapterFile, 'utf-8')
  writeFileSync(chapterFile, original.replace('The Harbour at Dawn', 'A Different Title'))

  await expect(chapter.locator('.editor-conflict-banner')).toBeVisible()
  await expect(chapter.locator('.cm-content')).toHaveText(paneBefore, { useInnerText: true })
})

test('an external edit to a dirty chapter shows the banner and keeps local edits', async ({
  page,
}) => {
  await page.goto(`${baseURL}/field-notes.html`)
  await page.waitForFunction(() => document.getElementById('book-root')?.style.visibility === '')
  await selectChapter(page, 'Chapter Two')

  const chapter = chapterWrapper(page, 'Chapter Two')
  await chapter.locator('.cm-content').click()
  // Move cursor to doc-start so typing never lands inside a tag
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('Local edit that must survive.')
  const paneBefore = await chapter.locator('.cm-content').innerText()

  const chapterFile = chapterPath(sandbox, 'field-notes', 'chapter-2.mdx')
  const original = readFileSync(chapterFile, 'utf-8')
  writeFileSync(chapterFile, `${original}\nExternally appended paragraph.\n`)

  await expect(chapter.locator('.editor-conflict-banner')).toBeVisible()
  await expect(chapter.locator('.cm-content')).toHaveText(paneBefore, { useInnerText: true })
})

test('"Load external changes" loads disk content and clears the banner', async ({ page }) => {
  await page.goto(`${baseURL}/field-notes.html`)
  await page.waitForFunction(() => document.getElementById('book-root')?.style.visibility === '')
  await selectChapter(page, 'Chapter Three')

  const chapter = chapterWrapper(page, 'Chapter Three')

  const chapterFile = chapterPath(sandbox, 'field-notes', 'chapter-3.mdx')
  const original = readFileSync(chapterFile, 'utf-8')
  writeFileSync(chapterFile, original.replace("The Lighthouse Keeper's Garden", 'A New Heading'))

  await expect(chapter.locator('.editor-conflict-banner')).toBeVisible()

  await chapter.getByRole('button', { name: 'Load external changes' }).click()

  await expect(chapter.locator('.editor-conflict-banner')).toHaveCount(0)
  await expect(chapter.locator('.cm-content')).toContainText('A New Heading')
})

test('autosave is not paused while a banner is showing', async ({ page }) => {
  await page.goto(`${baseURL}/good-dog-mom.html`)
  await page.waitForFunction(() => document.getElementById('book-root')?.style.visibility === '')

  // "Reading Her Signals" is selected by default
  const chapter = chapterWrapper(page, 'Reading Her Signals')

  const chapterFile = chapterPath(sandbox, 'good-dog-mom', '1-reading-her-signals.mdx')
  const original = readFileSync(chapterFile, 'utf-8')
  writeFileSync(chapterFile, original.replace('vocabulary.', 'a whole vocabulary.'))

  await expect(chapter.locator('.editor-conflict-banner')).toBeVisible()

  await chapter.locator('.cm-content').click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('Still typing through the conflict. ')

  await expect
    .poll(() => readFileSync(chapterFile, 'utf-8'))
    .toContain('Still typing through the conflict.')
})

test('an external edit to a hidden chapter never banners, and is silently overwritten on autosave', async ({
  page,
}) => {
  await page.goto(`${baseURL}/good-dog-mom.html`)
  await page.waitForFunction(() => document.getElementById('book-root')?.style.visibility === '')

  // Neither chapter is touched by the other tests in this file, which share this sandbox
  await selectChapter(page, 'Becoming Her Secure Base')
  await selectChapter(page, 'The Rituals That Build Trust')

  const chapterFile = chapterPath(sandbox, 'good-dog-mom', '2-becoming-her-secure-base.mdx')
  const original = readFileSync(chapterFile, 'utf-8')
  writeFileSync(chapterFile, original.replace('secure base.', 'secure, unshakeable base.'))

  // The hidden chapter isn't mounted, so there's nothing to raise a banner on
  await expect(page.locator('.editor-conflict-banner')).toHaveCount(0)

  // Switching back doesn't retroactively surface the conflict either
  await selectChapter(page, 'Becoming Her Secure Base')
  await expect(page.locator('.editor-conflict-banner')).toHaveCount(0)

  await chapterWrapper(page, 'Becoming Her Secure Base').locator('.cm-content').click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('Overwriting from the editor. ')

  await expect
    .poll(() => readFileSync(chapterFile, 'utf-8'))
    .toContain('Overwriting from the editor.')
})
