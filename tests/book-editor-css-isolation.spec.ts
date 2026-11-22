import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { type ViteDevServer } from 'vite'

import { startViteServer } from '../src/cli/vite-server'

const ROOT = resolve(__dirname, '../examples/sample-book')

let server: ViteDevServer
let baseURL: string

// Per-worker port - chromium and firefox projects run in parallel
// Playwright requires the fixtures arg be destructured even when unused
// eslint-disable-next-line no-empty-pattern
test.beforeAll(async ({}, testInfo) => {
  const port = 8199 + testInfo.workerIndex
  server = await startViteServer(ROOT, port)
  baseURL = `http://127.0.0.1:${port}`
})

test.afterAll(async () => {
  await server.close()
})

test('a book stylesheet does not leak into the editor chrome', async ({ page }) => {
  await page.goto(`${baseURL}/field-notes.html`)
  await page.waitForFunction(() => document.getElementById('book-root')?.style.visibility === '')

  // Positive control: book.css really does override body's font-family
  const displayFrame = page.frames().find((frame) => frame.url().includes('-display-frame'))
  const bookFontFamily = await displayFrame!.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  )
  expect(bookFontFamily.toLowerCase()).toContain('georgia')

  // Book CSS should only ever load inside the iframes, never the main document
  const bookLinkCount = await page.evaluate(
    () => document.querySelectorAll('head link[href*="books/"]').length,
  )
  expect(bookLinkCount).toBe(0)
})
