import { expect, test } from './test'

function linesOf(text: string) {
  return text.split('\n').filter((line) => line.length > 0)
}

test('paragraph splitting only happens between complete lines', async ({ paginateFixture }) => {
  const pages = await paginateFixture('paragraph-splitting.html')
  await expect(pages).toHaveCount(2)

  const firstPageLines = linesOf(await pages.nth(0).innerText())
  const secondPageLines = linesOf(await pages.nth(1).innerText())

  expect(firstPageLines).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4'])
  expect(secondPageLines).toEqual(['Line 5', 'Line 6'])

  // No content is lost or duplicated.
  expect([...firstPageLines, ...secondPageLines]).toEqual([
    'Line 1',
    'Line 2',
    'Line 3',
    'Line 4',
    'Line 5',
    'Line 6',
  ])
})
