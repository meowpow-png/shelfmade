import { expect, test } from './test'

test('break-inside: avoid defers a whole heading rather than splitting it', async ({
  paginateFixture,
}) => {
  const pages = await paginateFixture('heading-split.html')
  await expect(pages).toHaveCount(2)

  const firstPageText = await pages.nth(0).innerText()
  const secondPageText = await pages.nth(1).innerText()

  expect(firstPageText).toContain('Filler')
  expect(firstPageText).not.toContain('Heading 1')
  expect(secondPageText).toContain('Heading 1')
  expect(secondPageText).toContain('Heading 2')
  expect(secondPageText).toContain('Heading 3')
})

test('break-inside: avoid does not force a break when the heading already fits', async ({
  paginateFixture,
}) => {
  const pages = await paginateFixture('heading-split-no-op.html')
  await expect(pages).toHaveCount(1)

  const pageText = await pages.nth(0).innerText()
  expect(pageText).toContain('Filler')
  expect(pageText).toContain('Heading 1')
  expect(pageText).toContain('Heading 2')
  expect(pageText).toContain('Heading 3')
})
