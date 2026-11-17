import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'

declare global {
  interface Window {
    PAGED_READY?: boolean
  }
}

async function paginate(page: Page) {
  const fixture = path.join(__dirname, 'fixtures', 'protect-paragraph-ending.html')
  await page.goto(`file://${fixture}`)
  await page.waitForFunction(() => window.PAGED_READY === true)
  return page.locator('.pagedjs_page')
}

async function lineTop(locator: Locator) {
  return locator.evaluate((element) => Math.round(element.getBoundingClientRect().top))
}

test('binds a short final word to the preceding word', async ({ page }) => {
  const pages = await paginate(page)
  await expect(pages).toHaveCount(1)

  const paragraph = pages.locator('#short-ending')
  const previousWord = paragraph.locator('.previous-word')
  const finalWord = paragraph.locator('.pagination-intact-ending')

  await expect(paragraph).toContainText('posljednja\u00a0je')
  await expect(finalWord).toHaveText('je')
  expect(await lineTop(previousWord)).toBe(await lineTop(finalWord))
})

test('keeps a final word with a hyphenation opportunity intact', async ({ page }) => {
  const pages = await paginate(page)
  const finalWord = pages.locator('#hyphenated-ending .pagination-intact-ending')

  await expect(finalWord).toHaveText('naj\u00adjednostavnije')
  await expect(finalWord).toHaveCSS('hyphens', 'none')
  await expect(finalWord).toHaveCSS('white-space', 'nowrap')

  const lineCount = await finalWord.evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size
  })
  expect(lineCount).toBe(1)
})

test('does not bind a longer final word to the preceding word', async ({ page }) => {
  const pages = await paginate(page)
  const paragraph = pages.locator('#long-ending')

  await expect(paragraph.locator('.pagination-intact-ending')).toHaveText('zauvijek')
  expect(await paragraph.textContent()).toBe('Ostaje ovdje zauvijek.')
})
