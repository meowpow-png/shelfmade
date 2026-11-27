import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from './test'

test('typing the exact title enables delete and removes the book end-to-end', async ({
  booksPageServer,
  openBooksPage,
  page,
}) => {
  await openBooksPage()

  await page.getByRole('button', { name: 'Actions for Field Notes from a Small Coast' }).click()
  await page.getByRole('menuitem', { name: 'Delete book' }).click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.book-delete-title')).toHaveText(
    'Delete “Field Notes from a Small Coast”?',
  )

  const confirmButton = page.getByRole('button', { name: 'Delete', exact: true })
  await expect(confirmButton).toBeDisabled()

  const input = page.getByRole('textbox')
  await input.fill('Field Notes from a Small Coas')
  await expect(confirmButton).toBeDisabled()

  await input.fill('Field Notes from a Small Coast')
  await expect(confirmButton).toBeEnabled()

  await confirmButton.click()

  await expect(page.getByText('Field Notes from a Small Coast', { exact: true })).toHaveCount(0)
  expect(existsSync(join(booksPageServer.sandbox.root, 'books', 'field-notes'))).toBe(false)
})

test('deleting a slug with no matching book returns 404', async ({ booksPageServer }) => {
  const response = await booksPageServer.delete('no-such-book')
  expect(response.status()).toBe(404)
})
