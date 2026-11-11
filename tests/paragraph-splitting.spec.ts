import path from 'node:path'
import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    PAGED_READY?: boolean
  }
}

function linesOf(text: string) {
  return text.split('\n').filter((line) => line.length > 0)
}

test('paragraph splitting only happens between complete lines', async ({ page }) => {
  const fixture = path.join(__dirname, 'fixtures', 'paragraph-splitting.html')
  await page.goto(`file://${fixture}`)
  await page.waitForFunction(() => window.PAGED_READY === true)

  const pages = page.locator('.pagedjs_page')
  await expect(pages).toHaveCount(2)

  const firstPageLines = linesOf(await pages.nth(0).innerText())
  const secondPageLines = linesOf(await pages.nth(1).innerText())

  // Both pages contain only complete lines.
  expect(firstPageLines).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4'])
  expect(secondPageLines).toEqual(['Line 5', 'Line 6'])

  // No content is lost or duplicated.
  expect([...firstPageLines, ...secondPageLines]).toEqual([
    'Line 1',
    'Line 2',
    'Line 3',
    'Line 4',
    'Line 5',
    'Line 6',
  ])
})
