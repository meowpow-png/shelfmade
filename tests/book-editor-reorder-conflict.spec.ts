import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { type ViteDevServer } from 'vite'

import { startViteServer } from '../src/cli/vite-server'
import { acquireLock, chapterPath, createBookSandbox, type BookSandbox } from './book-sandbox'

// Avoids contention between concurrent Vite servers/pagedjs runs across workers
test.describe.configure({ mode: 'serial' })

async function setupServer() {
  // serial mode alone doesn't stop chromium/firefox workers overlapping - this mutex does
  test.info().setTimeout(60_000)
  const releaseLock = await acquireLock('reorder-conflict')
  const sandbox = createBookSandbox()
  // The real content this copies from isn't guaranteed to be order-less or filename-ordered
  for (const file of ['chapter-1.mdx', 'chapter-2.mdx', 'chapter-3.mdx']) {
    const path = chapterPath(sandbox, 'field-notes', file)
    writeFileSync(path, readFileSync(path, 'utf-8').replace(/^order:.*\n/m, ''))
  }
  const port = 8799 + test.info().workerIndex
  const server = await startViteServer(sandbox.root, port)
  return { sandbox, server, baseURL: `http://127.0.0.1:${port}`, releaseLock }
}

async function teardown(sandbox: BookSandbox, server: ViteDevServer, releaseLock: () => void) {
  try {
    await server.close()
  } finally {
    sandbox.cleanup()
    releaseLock()
  }
}

function chapterWrapper(page: Page, title: string) {
  return page
    .locator('.editor-chapter-wrapper')
    .filter({ has: page.locator('.editor-chapter-title', { hasText: title }) })
}

test('reordering a sibling chapter never banners the chapter that is open', async ({
  page,
  request,
}) => {
  const { sandbox, server, baseURL, releaseLock } = await setupServer()
  try {
    await page.goto(`${baseURL}/field-notes.html`)
    await page.waitForFunction(() => document.getElementById('book-root')?.style.visibility === '')

    // Chapter One is selected by default; moving Chapter Three to first shifts its order too
    const response = await request.put(`${baseURL}/books/field-notes/chapters/chapter-3/order`, {
      data: '1',
    })
    expect(response.status()).toBe(204)

    await expect(page.locator('.chapter-nav-item')).toHaveText([
      'Chapter Three',
      'Chapter One',
      'Chapter Two',
    ])
    await expect(chapterWrapper(page, 'Chapter One')).toBeVisible()
    await expect(page.locator('.editor-conflict-banner')).toHaveCount(0)
  } finally {
    await teardown(sandbox, server, releaseLock)
  }
})

test('dragging the currently-open chapter to a new position never banners it', async ({ page }) => {
  const { sandbox, server, baseURL, releaseLock } = await setupServer()
  try {
    await page.goto(`${baseURL}/field-notes.html`)
    await page.waitForFunction(() => document.getElementById('book-root')?.style.visibility === '')

    const source = page.locator('.chapter-nav-item', { hasText: 'Chapter One' }).locator('..')
    const target = page.locator('.chapter-nav-item', { hasText: 'Chapter Three' }).locator('..')
    await source.dragTo(target)

    await expect(page.locator('.chapter-nav-item')).toHaveText([
      'Chapter Two',
      'Chapter Three',
      'Chapter One',
    ])
    await expect(chapterWrapper(page, 'Chapter One')).toBeVisible()
    await expect(page.locator('.editor-conflict-banner')).toHaveCount(0)
  } finally {
    await teardown(sandbox, server, releaseLock)
  }
})
