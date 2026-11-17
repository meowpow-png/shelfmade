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

test('KeepHeadingWithParagraph moves the heading and paragraph together when too few lines follow', async ({
  page,
}) => {
  const pages = await paginate(page, 'heading-paragraph.html')
  await expect(pages).toHaveCount(2)

  const firstPageText = await pages.nth(0).innerText()
  const secondPageText = await pages.nth(1).innerText()

  expect(firstPageText).toContain('Filler')
  expect(firstPageText).not.toContain('Heading')
  expect(firstPageText).not.toContain('Target 1')
  expect(secondPageText).toContain('Heading')
  expect(secondPageText).toContain('Target 1')
  expect(secondPageText).toContain('Target 6')
})

test('KeepHeadingWithParagraph leaves a break alone when 2 lines already follow the heading', async ({
  page,
}) => {
  const pages = await paginate(page, 'heading-paragraph-no-op.html')
  await expect(pages).toHaveCount(2)

  const firstPageText = await pages.nth(0).innerText()
  const secondPageText = await pages.nth(1).innerText()

  expect(firstPageText).toContain('Filler')
  expect(firstPageText).toContain('Heading')
  expect(firstPageText).toContain('Target 1')
  expect(firstPageText).toContain('Target 2')
  expect(firstPageText).not.toContain('Target 3')
  expect(secondPageText).toContain('Target 3')
  expect(secondPageText).toContain('Target 6')
})
