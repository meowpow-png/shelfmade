import { expect, test } from './test'

test('MinOrphanLines defers an entire paragraph rather than leaving a single orphan line', async ({
  paginateFixture,
}) => {
  const pages = await paginateFixture('orphan-lines.html')
  await expect(pages).toHaveCount(2)

  const firstPageText = await pages.nth(0).innerText()
  const secondPageText = await pages.nth(1).innerText()

  expect(firstPageText).toContain('Filler')
  expect(firstPageText).not.toContain('Target 1')
  expect(secondPageText).toContain('Target 1')
  expect(secondPageText).toContain('Target 6')
})

test('MinOrphanLines leaves a break alone when the orphan rule is already satisfied', async ({
  paginateFixture,
}) => {
  const pages = await paginateFixture('orphan-lines-no-op.html')
  await expect(pages).toHaveCount(2)

  const firstPageText = await pages.nth(0).innerText()
  const secondPageText = await pages.nth(1).innerText()

  expect(firstPageText).toContain('Filler')
  expect(firstPageText).toContain('Target 1')
  expect(firstPageText).toContain('Target 2')
  expect(firstPageText).not.toContain('Target 3')
  expect(secondPageText).toContain('Target 3')
  expect(secondPageText).toContain('Target 6')
})
