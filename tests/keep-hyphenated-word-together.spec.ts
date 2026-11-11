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

function withoutSoftHyphens(text: string) {
  return text.replaceAll('\u00ad', '')
}

test('moves a hyphenated word intact to the next page', async ({ page, browserName }) => {
  test.skip(
    browserName === 'firefox',
    'Firefox reports this page break before the rendered hyphenated word.',
  )
  const pages = await paginate(page, 'keep-hyphenated-word-together.html')
  await expect(pages).toHaveCount(2)

  const firstPageText = withoutSoftHyphens(await pages.nth(0).innerText())
  const secondPageText = withoutSoftHyphens(await pages.nth(1).innerText())

  expect(firstPageText.trim()).toMatch(/Druga riječ$/)
  expect(firstPageText).not.toContain('najjednostavnije')
  expect(secondPageText.trim()).toMatch(/^najjednostavnije/)
})

test('leaves an ordinary word-boundary page break unchanged', async ({ page }) => {
  const pages = await paginate(page, 'keep-hyphenated-word-together-no-op.html')
  await expect(pages).toHaveCount(2)

  expect((await pages.nth(0).innerText()).trim()).toMatch(/Druga riječ$/)
  expect((await pages.nth(1).innerText()).trim()).toMatch(/^završava/)
})
