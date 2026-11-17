import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

declare global {
  interface Window {
    PAGED_READY?: boolean
  }
}

async function paginate(page: Page, fixtureName: string) {
  const fixture = path.join(__dirname, 'fixtures', fixtureName)
  await page.goto(`file://${fixture}`)
  await page.waitForFunction(() => window.PAGED_READY === true)
  return page.locator('.pagedjs_page')
}

function marginTop(page: Page, selector: string) {
  return page
    .locator(`.pagedjs_page ${selector}`)
    .evaluate((element) => getComputedStyle(element).marginTop)
}

test('a heading starting a page loses its top margin', async ({ page }) => {
  const pages = await paginate(page, 'heading-page-start.html')
  await expect(pages).toHaveCount(3)

  // Wrapped in a section, as a layout's chapter is
  expect(await marginTop(page, 'h2.nested')).toBe('0px')
  // Placed directly in the body
  expect(await marginTop(page, 'h2.flat')).toBe('0px')
})

test('a heading after other content on the page keeps its top margin', async ({ page }) => {
  await paginate(page, 'heading-page-start.html')

  expect(await marginTop(page, 'h2.middle')).toBe('20px')
})
