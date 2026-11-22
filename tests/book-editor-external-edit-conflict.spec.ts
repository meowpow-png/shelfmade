import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { type ViteDevServer } from 'vite'

import { startViteServer } from '../src/cli/vite-server'
import { chapterPath, createBookSandbox, type BookSandbox } from './book-sandbox'

let sandbox: BookSandbox
let server: ViteDevServer
let baseURL: string

// Per-worker port - chromium and firefox projects run in parallel
// Playwright requires the fixtures arg be destructured even when unused
// eslint-disable-next-line no-empty-pattern
test.beforeAll(async ({}, testInfo) => {
  sandbox = createBookSandbox()
  const port = 8299 + testInfo.workerIndex
  server = await startViteServer(sandbox.root, port)
  baseURL = `http://127.0.0.1:${port}`
})

test.afterAll(async () => {
  await server.close()
  sandbox.cleanup()
})

function chapterWrapper(page: Page, title: string) {
  return page
    .locator('.editor-chapter-wrapper')
    .filter({ has: page.locator('.editor-chapter-title', { hasText: title }) })
}

test('an external edit to a clean chapter shows the banner and leaves the pane untouched', async ({
  page,
}) => {
  await page.goto(`${baseURL}/field-notes.html`)
  await page.waitForFunction(() => document.getElementById('book-root')?.style.visibility === '')

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

  const chapter = chapterWrapper(page, 'Chapter Two')
  await chapter.locator('.cm-content').click()
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

  const chapter = chapterWrapper(page, 'Reading Her Signals')

  const chapterFile = chapterPath(sandbox, 'good-dog-mom', '1-reading-her-signals.mdx')
  const original = readFileSync(chapterFile, 'utf-8')
  writeFileSync(chapterFile, original.replace('vocabulary.', 'a whole vocabulary.'))

  await expect(chapter.locator('.editor-conflict-banner')).toBeVisible()

  await chapter.locator('.cm-content').click()
  await page.keyboard.type(' Still typing through the conflict.')

  await expect
    .poll(() => readFileSync(chapterFile, 'utf-8'))
    .toContain('Still typing through the conflict.')
})

test("resolving one chapter's conflict does not touch another chapter's", async ({ page }) => {
  await page.goto(`${baseURL}/pocket-tales.html`)
  await page.waitForFunction(() => document.getElementById('book-root')?.style.visibility === '')

  const chapterA = chapterWrapper(page, 'Der Uhrmacher')
  const chapterB = chapterWrapper(page, 'Die Leuchtturmkatze')

  const fileA = chapterPath(sandbox, 'pocket-tales', 'tale-1.mdx')
  const fileB = chapterPath(sandbox, 'pocket-tales', 'tale-2.mdx')
  const originalA = readFileSync(fileA, 'utf-8')
  const originalB = readFileSync(fileB, 'utf-8')

  writeFileSync(fileA, originalA.replace('# Der Uhrmacher', '# Der Uhrmacher (extern geändert)'))
  writeFileSync(
    fileB,
    originalB.replace('# Die Leuchtturmkatze', '# Die Leuchtturmkatze (extern geändert)'),
  )

  await expect(chapterA.locator('.editor-conflict-banner')).toBeVisible()
  await expect(chapterB.locator('.editor-conflict-banner')).toBeVisible()

  await chapterA.getByRole('button', { name: 'Load external changes' }).click()

  await expect(chapterA.locator('.editor-conflict-banner')).toHaveCount(0)
  await expect(chapterA.locator('.cm-content')).toContainText('Der Uhrmacher (extern geändert)')

  // Resolving chapter A must not clear or otherwise affect chapter B's conflict
  await expect(chapterB.locator('.editor-conflict-banner')).toBeVisible()
  await expect(chapterB.locator('.cm-content')).not.toContainText(
    'Die Leuchtturmkatze (extern geändert)',
  )
})
