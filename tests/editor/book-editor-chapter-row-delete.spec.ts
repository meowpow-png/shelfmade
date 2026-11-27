import { existsSync } from 'node:fs'

import { chapterPath } from '../book-sandbox'
import { expect, test } from './test'

test.use({ editorServerOptions: { portBase: 9099 } })

test('clicking Delete opens a confirmation dialog titled with the chapter name', async ({
  openBook,
  page,
}) => {
  await openBook('field-notes')

  await page.getByRole('button', { name: 'Actions for Chapter Two' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.chapter-delete-title')).toHaveText('Delete “Chapter Two”?')
})

test('Cancel leaves the file and the row intact', async ({ openBook, page, sandbox }) => {
  await openBook('field-notes')

  const path = chapterPath(sandbox, 'field-notes', 'chapter-2.mdx')

  await page.getByRole('button', { name: 'Actions for Chapter Two' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Chapter Two', exact: true })).toBeVisible()
  expect(existsSync(path)).toBe(true)
})

test('confirming delete removes the row only once the request resolves', async ({
  openBook,
  page,
}) => {
  await openBook('good-dog-mom')

  let releaseDelete: () => void
  const deleteHeld = new Promise<void>((resolve) => {
    releaseDelete = resolve
  })
  await page.route('**/books/good-dog-mom/chapters/*', async (route) => {
    if (route.request().method() === 'DELETE') await deleteHeld
    await route.continue()
  })

  await page.getByRole('button', { name: 'Actions for The Rituals That Build Trust' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()

  // Stays until the server confirms the deletion
  await expect(
    page.getByRole('button', { name: 'The Rituals That Build Trust', exact: true }),
  ).toBeVisible()

  releaseDelete!()

  await expect(
    page.getByRole('button', { name: 'The Rituals That Build Trust', exact: true }),
  ).toHaveCount(0)
})

test('deleting the selected chapter falls back to the new first chapter', async ({
  chapter,
  openBook,
  page,
}) => {
  await openBook('pocket-tales')

  await expect(page.getByRole('button', { name: 'Der Uhrmacher', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  )

  await page.getByRole('button', { name: 'Actions for Der Uhrmacher' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()

  await expect(page.getByRole('button', { name: 'Der Uhrmacher', exact: true })).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Die Leuchtturmkatze', exact: true }),
  ).toHaveAttribute('aria-current', 'true')
  await expect(chapter('Die Leuchtturmkatze')).toBeVisible()
})

test('deleting a non-selected chapter leaves the current selection untouched', async ({
  openBook,
  page,
}) => {
  await openBook('field-notes')

  await expect(page.getByRole('button', { name: 'Chapter One', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  )

  await page.getByRole('button', { name: 'Actions for Chapter Three' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()

  await expect(page.getByRole('button', { name: 'Chapter Three', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Chapter One', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  )
})
