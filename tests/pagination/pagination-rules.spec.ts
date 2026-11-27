import { expect, test, type PaginateFixture } from './test'

async function expectLines4and5SplitAcrossPages(
  paginateFixture: PaginateFixture,
  fixtureName: string,
) {
  const pages = await paginateFixture(fixtureName)
  await expect(pages).toHaveCount(2)

  const firstPageText = await pages.nth(0).innerText()
  const secondPageText = await pages.nth(1).innerText()

  expect(firstPageText).toContain('Line 4')
  expect(firstPageText).not.toContain('Line 5')
  expect(secondPageText).toContain('Line 5')
  expect(secondPageText).toContain('Line 6')
}

test('MinWidowLines relocates a break that would otherwise leave a single-line widow', async ({
  paginateFixture,
}) => {
  await expectLines4and5SplitAcrossPages(paginateFixture, 'min-widow-lines.html')
})

test('MinWidowLines leaves a break alone when the widow rule is already satisfied', async ({
  paginateFixture,
}) => {
  await expectLines4and5SplitAcrossPages(paginateFixture, 'min-widow-lines-no-op.html')
})
