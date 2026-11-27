import { expect, test } from './test'

function withoutSoftHyphens(text: string) {
  return text.replace(/\u00ad/g, '')
}

test('moves a hyphenated word intact to the next page', async ({
  browserName,
  paginateFixture,
}) => {
  test.skip(
    browserName === 'firefox',
    'Firefox reports this page break before the rendered hyphenated word.',
  )
  const pages = await paginateFixture('keep-hyphenated-word-together.html')
  await expect(pages).toHaveCount(2)

  const firstPageText = withoutSoftHyphens(await pages.nth(0).innerText())
  const secondPageText = withoutSoftHyphens(await pages.nth(1).innerText())

  expect(firstPageText.trim()).toMatch(/Druga riječ$/)
  expect(firstPageText).not.toContain('najjednostavnije')
  expect(secondPageText.trim()).toMatch(/^najjednostavnije/)
})

test('leaves an ordinary word-boundary page break unchanged', async ({ paginateFixture }) => {
  const pages = await paginateFixture('keep-hyphenated-word-together-no-op.html')
  await expect(pages).toHaveCount(2)

  expect((await pages.nth(0).innerText()).trim()).toMatch(/Druga riječ$/)
  expect((await pages.nth(1).innerText()).trim()).toMatch(/^završava/)
})
