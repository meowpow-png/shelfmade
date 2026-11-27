import { type Page } from '@playwright/test'

import { expect, test } from './test'

function marginTop(page: Page, selector: string) {
  return page
    .locator(`.pagedjs_page ${selector}`)
    .evaluate((element) => getComputedStyle(element).marginTop)
}

test('a heading starting a page loses its top margin', async ({ page, paginateFixture }) => {
  const pages = await paginateFixture('heading-page-start.html')
  await expect(pages).toHaveCount(3)

  // Wrapped in a section, as a layout's chapter is
  expect(await marginTop(page, 'h2.nested')).toBe('0px')
  // Placed directly in the body
  expect(await marginTop(page, 'h2.flat')).toBe('0px')
})

test('a heading after other content on the page keeps its top margin', async ({
  page,
  paginateFixture,
}) => {
  await paginateFixture('heading-page-start.html')

  expect(await marginTop(page, 'h2.middle')).toBe('20px')
})
