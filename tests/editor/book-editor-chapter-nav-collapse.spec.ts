import { expect, test } from './test'

test('the chapter nav is expanded by default', async ({ openBook, page }) => {
  await openBook('field-notes')

  await expect(page.getByRole('button', { name: 'Toggle chapter list' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('.chapter-nav')).toBeVisible()
})

test('toggling the activity bar icon collapses the chapter nav panel', async ({
  openBook,
  page,
}) => {
  await openBook('field-notes')

  const toggle = page.getByRole('button', { name: 'Toggle chapter list' })
  await toggle.click()

  await expect(page.locator('.chapter-nav')).toHaveCount(0)
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
})

test('re-expanding keeps the previously selected chapter selected', async ({
  openBook,
  page,
  selectChapter,
}) => {
  await openBook('field-notes')
  await selectChapter('Chapter Two')

  const toggle = page.getByRole('button', { name: 'Toggle chapter list' })
  await toggle.click()
  await toggle.click()

  await expect(page.getByRole('button', { name: 'Chapter Two', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  )
})
