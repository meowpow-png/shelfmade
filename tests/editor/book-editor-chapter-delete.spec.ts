import { existsSync, unlinkSync } from 'node:fs'

import { chapterPath } from '../book-sandbox'
import { expect, test } from './test'

// Chapters disappear only by deleting their file on disk, not through an in-app action.
test.use({ editorServerOptions: { portBase: 8499 } })

test('deleting the open chapter falls back selection to the first remaining chapter', async ({
  chapter,
  openBook,
  page,
  sandbox,
}) => {
  await openBook('field-notes')
  await expect(chapter('Chapter One')).toBeVisible()

  unlinkSync(chapterPath(sandbox, 'field-notes', 'chapter-1.mdx'))

  await expect(page.locator('.chapter-nav-item')).toHaveText(['Chapter Two', 'Chapter Three'])
  await expect(chapter('Chapter Two')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Chapter Two', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  )
})

test('deleting the open chapter with an unsaved edit does not resurrect the file', async ({
  chapter,
  openBook,
  page,
  sandbox,
  typeInContent,
}) => {
  await openBook('good-dog-mom')

  // "Reading Her Signals" is selected by default
  const selectedChapter = chapter('Reading Her Signals')
  await typeInContent(selectedChapter, 'Unsaved edit that must not resurrect the file. ')

  const chapterFile = chapterPath(sandbox, 'good-dog-mom', '1-reading-her-signals.mdx')
  unlinkSync(chapterFile)

  await expect(page.locator('.chapter-nav-item')).toHaveText([
    'Becoming Her Secure Base',
    'The Rituals That Build Trust',
  ])
  // Outlasts the save debounce so a resurrecting flush-on-switch write would have landed by now
  await page.waitForTimeout(400)
  expect(existsSync(chapterFile)).toBe(false)
})

test('an unrelated deletion mid-create does not leave a stuck placeholder', async ({
  openBook,
  page,
  sandbox,
}) => {
  await openBook('pocket-tales')

  let releaseCreate: () => void
  const createHeld = new Promise<void>((resolve) => {
    releaseCreate = resolve
  })
  await page.route('**/books/pocket-tales/chapters', async (route) => {
    if (route.request().method() === 'POST') await createHeld
    await route.continue()
  })

  await page.getByRole('button', { name: 'Add chapter' }).click()

  // Lands while the create above is still in flight, invalidating its placeholder's baseline
  unlinkSync(chapterPath(sandbox, 'pocket-tales', 'tale-2.mdx'))
  await expect(page.locator('.chapter-nav-item')).toHaveText(['Der Uhrmacher'])

  releaseCreate!()
  await expect(page.locator('.chapter-nav-rename')).toHaveCount(0)
  await expect(page.locator('.chapter-nav-item')).toHaveText(['Der Uhrmacher'])
})
