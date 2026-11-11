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

test('break-inside: avoid defers a whole heading rather than splitting it', async ({ page }) => {
  const pages = await paginate(page, 'heading-split.html')
  await expect(pages).toHaveCount(2)

  const firstPageText = await pages.nth(0).innerText()
  const secondPageText = await pages.nth(1).innerText()

  // The complete heading moves to the next page.
  expect(firstPageText).toContain('Filler')
  expect(firstPageText).not.toContain('Heading 1')
  expect(secondPageText).toContain('Heading 1')
  expect(secondPageText).toContain('Heading 2')
  expect(secondPageText).toContain('Heading 3')
})

test('break-inside: avoid does not force a break when the heading already fits', async ({
  page,
}) => {
  const pages = await paginate(page, 'heading-split-no-op.html')
  await expect(pages).toHaveCount(1)

  const pageText = await pages.nth(0).innerText()
  expect(pageText).toContain('Filler')
  expect(pageText).toContain('Heading 1')
  expect(pageText).toContain('Heading 2')
  expect(pageText).toContain('Heading 3')
})
