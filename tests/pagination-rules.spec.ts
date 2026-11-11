import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

declare global {
  interface Window {
    PAGED_READY?: boolean
  }
}

async function expectLines4and5SplitAcrossPages(page: Page, fixtureName: string) {
  const fixture = path.join(__dirname, 'fixtures', fixtureName)
  await page.goto(`file://${fixture}`)
  await page.waitForFunction(() => window.PAGED_READY === true)

  const pages = page.locator('.pagedjs_page')
  await expect(pages).toHaveCount(2)

  const firstPageText = await pages.nth(0).innerText()
  const secondPageText = await pages.nth(1).innerText()

  expect(firstPageText).toContain('Line 4')
  expect(firstPageText).not.toContain('Line 5')
  expect(secondPageText).toContain('Line 5')
  expect(secondPageText).toContain('Line 6')
}

test('MinWidowLines relocates a break that would otherwise leave a single-line widow', async ({
  page,
}) => {
  await expectLines4and5SplitAcrossPages(page, 'min-widow-lines.html')
})

test('MinWidowLines leaves a break alone when the widow rule is already satisfied', async ({
  page,
}) => {
  await expectLines4and5SplitAcrossPages(page, 'min-widow-lines-no-op.html')
})
