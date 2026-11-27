import { readFileSync, writeFileSync } from 'node:fs'

import { chapterPath, type BookSandbox } from '../book-sandbox'
import { expect, test } from './test'

// Tests share a mutable worker sandbox and must run in declaration order.
test.describe.configure({ mode: 'serial' })

function resetChapterTitle(sandbox: BookSandbox, file: string, title: string) {
  const path = chapterPath(sandbox, 'field-notes', file)
  writeFileSync(path, readFileSync(path, 'utf-8').replace(/title: ".*"/, `title: "${title}"`))
}

test.use({ editorServerOptions: { portBase: 8599 } })

// Each test needs the same baseline despite sharing a worker sandbox.
test.beforeEach(async ({ sandbox }) => {
  resetChapterTitle(sandbox, 'chapter-1.mdx', 'Chapter One')
  resetChapterTitle(sandbox, 'chapter-2.mdx', 'Chapter Two')
})

test('menu rename on a non-selected chapter does not change the selection', async ({
  openBook,
  page,
  sandbox,
}) => {
  await openBook('field-notes')
  await expect(page.getByRole('button', { name: 'Chapter One', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  )

  await page.getByRole('button', { name: 'Actions for Chapter Two' }).click()
  await page.getByRole('menuitem', { name: 'Rename' }).click()

  const input = page.locator('.chapter-nav-rename')
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('Chapter Two')
  const selection = await input.evaluate((element: HTMLInputElement) => ({
    start: element.selectionStart,
    end: element.selectionEnd,
  }))
  expect(selection).toEqual({ start: 0, end: 'Chapter Two'.length })

  await input.fill('Renamed Chapter Two')
  await input.press('Enter')
  await expect(input).toHaveCount(0)

  await expect
    .poll(() => readFileSync(chapterPath(sandbox, 'field-notes', 'chapter-2.mdx'), 'utf-8'))
    .toContain('title: "Renamed Chapter Two"')

  await expect(page.getByRole('button', { name: 'Chapter One', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  )
})

test('renaming an existing chapter updates the row only once the write completes', async ({
  openBook,
  page,
}) => {
  await openBook('field-notes')

  let releaseTitlePut: () => void
  const titlePutHeld = new Promise<void>((resolve) => {
    releaseTitlePut = resolve
  })
  await page.route('**/chapters/chapter-2/title', async (route) => {
    await titlePutHeld
    await route.continue()
  })

  await page.getByRole('button', { name: 'Actions for Chapter Two' }).click()
  await page.getByRole('menuitem', { name: 'Rename' }).click()
  await page.locator('.chapter-nav-rename').fill('Renamed Chapter Two')
  await page.locator('.chapter-nav-rename').press('Enter')

  // The row reverts to its pre-rename title until the server confirms the new one
  await expect(page.locator('.chapter-nav-item')).toHaveText([
    'Chapter One',
    'Chapter Two',
    'Chapter Three',
  ])

  releaseTitlePut!()

  await expect(page.locator('.chapter-nav-item')).toHaveText([
    'Chapter One',
    'Renamed Chapter Two',
    'Chapter Three',
  ])
})

test('one row renaming disables other rows menu triggers and the add button', async ({
  openBook,
  page,
}) => {
  await openBook('field-notes')

  await page.getByRole('button', { name: 'Actions for Chapter Two' }).click()
  await page.getByRole('menuitem', { name: 'Rename' }).click()
  await expect(page.locator('.chapter-nav-rename')).toBeVisible()

  await expect(page.getByRole('button', { name: 'Actions for Chapter One' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Actions for Chapter Three' })).toBeDisabled()
  await expect(page.locator('.chapter-nav-add')).toHaveAttribute('aria-disabled', 'true')
})

test('Escape on menu-triggered rename reverts the title with no write and no selection change', async ({
  openBook,
  page,
}) => {
  await openBook('field-notes')
  await expect(page.getByRole('button', { name: 'Chapter One', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  )

  let titlePutFired = false
  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().includes('/title')) titlePutFired = true
  })

  await page.getByRole('button', { name: 'Actions for Chapter Two' }).click()
  await page.getByRole('menuitem', { name: 'Rename' }).click()

  const input = page.locator('.chapter-nav-rename')
  await input.fill('Should not be saved')
  await input.press('Escape')
  await expect(input).toHaveCount(0)

  expect(titlePutFired).toBe(false)
  await expect(page.getByRole('button', { name: 'Chapter Two', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Chapter One', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  )
})

test('menu rename of the currently open chapter triggers no conflict banner', async ({
  chapter,
  openBook,
  page,
  sandbox,
}) => {
  await openBook('field-notes')

  // Chapter One is selected by default
  const selectedChapter = chapter('Chapter One')
  await expect(selectedChapter).toBeVisible()

  await page.getByRole('button', { name: 'Actions for Chapter One' }).click()
  await page.getByRole('menuitem', { name: 'Rename' }).click()
  await page.locator('.chapter-nav-rename').fill('Renamed Chapter One')
  await page.locator('.chapter-nav-rename').press('Enter')

  await expect
    .poll(() => readFileSync(chapterPath(sandbox, 'field-notes', 'chapter-1.mdx'), 'utf-8'))
    .toContain('title: "Renamed Chapter One"')

  await expect(page.locator('.editor-conflict-banner')).toHaveCount(0)
})

test('dismissing the menu via an outside click does not leave the trigger focused or revealed', async ({
  openBook,
  page,
}) => {
  await openBook('field-notes')

  const trigger = page.getByRole('button', { name: 'Actions for Chapter Two' })
  await trigger.click()
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible()

  await page.getByText('Chapters', { exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toHaveCount(0)

  await expect(trigger).not.toBeFocused()
  await expect(trigger).toHaveCSS('opacity', '0')
})
