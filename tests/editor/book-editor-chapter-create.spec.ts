import { readdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { type Page } from '@playwright/test'

import { chapterPath, type BookSandbox } from '../book-sandbox'
import { expect, test } from './test'

function chapterFiles(sandbox: BookSandbox): Set<string> {
  const contentDir = dirname(chapterPath(sandbox, 'field-notes', 'chapter-1.mdx'))
  return new Set(readdirSync(contentDir).filter((file) => /^chapter-\d+\.mdx$/.test(file)))
}

// Diffs the directory instead of assuming a filename, since the shared sandbox may already have extras
async function createChapter(page: Page, sandbox: BookSandbox): Promise<string> {
  const before = chapterFiles(sandbox)
  await page.getByRole('button', { name: 'Add chapter' }).click()
  await expect(page.locator('.chapter-nav-rename')).toBeVisible()

  const created = [...chapterFiles(sandbox)].find((file) => !before.has(file))
  if (!created) throw new Error('Add chapter did not create a new chapter file')
  return created
}

test('clicking + focuses the new chapter rename input with its text preselected', async ({
  openBook,
  page,
  sandbox,
}) => {
  await openBook('field-notes')
  await createChapter(page, sandbox)

  const input = page.locator('.chapter-nav-rename')
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('Untitled chapter')

  const selection = await input.evaluate((element: HTMLInputElement) => ({
    start: element.selectionStart,
    end: element.selectionEnd,
  }))
  expect(selection).toEqual({ start: 0, end: 'Untitled chapter'.length })
})

test('Enter commits the typed title to disk', async ({ openBook, page, sandbox }) => {
  await openBook('field-notes')
  const chapterFile = await createChapter(page, sandbox)

  await page.locator('.chapter-nav-rename').fill('My New Chapter')
  await page.locator('.chapter-nav-rename').press('Enter')

  await expect
    .poll(() => readFileSync(chapterPath(sandbox, 'field-notes', chapterFile), 'utf-8'))
    .toContain('title: "My New Chapter"')
})

test('Escape cancels with no network call, leaving the default title on disk', async ({
  openBook,
  page,
  sandbox,
}) => {
  await openBook('field-notes')
  const chapterFile = await createChapter(page, sandbox)

  let titlePutFired = false
  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().includes('/title')) titlePutFired = true
  })

  const input = page.locator('.chapter-nav-rename')
  await input.fill('Should not be saved')
  await input.press('Escape')
  await expect(input).toHaveCount(0)

  expect(titlePutFired).toBe(false)
  expect(readFileSync(chapterPath(sandbox, 'field-notes', chapterFile), 'utf-8')).toContain(
    'title: "Untitled chapter"',
  )
})

test('committing an empty title skips the write and keeps the default', async ({
  openBook,
  page,
  sandbox,
}) => {
  await openBook('field-notes')
  const chapterFile = await createChapter(page, sandbox)

  let titlePutFired = false
  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().includes('/title')) titlePutFired = true
  })

  const input = page.locator('.chapter-nav-rename')
  await input.fill('')
  await input.press('Enter')
  await expect(input).toHaveCount(0)

  expect(titlePutFired).toBe(false)
  expect(readFileSync(chapterPath(sandbox, 'field-notes', chapterFile), 'utf-8')).toContain(
    'title: "Untitled chapter"',
  )
})

test('rapid double-click on + only creates one chapter', async ({ openBook, page, sandbox }) => {
  await openBook('field-notes')
  const before = chapterFiles(sandbox)

  let createRequestCount = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/chapters')) createRequestCount++
  })

  await page.locator('.chapter-nav-add').dblclick()
  await expect(page.locator('.chapter-nav-rename')).toBeVisible()
  await page.waitForTimeout(300)

  expect(createRequestCount).toBe(1)
  const created = [...chapterFiles(sandbox)].filter((file) => !before.has(file))
  expect(created).toHaveLength(1)
})

test('the optimistic row appears before the real list loads and never duplicates once it does', async ({
  openBook,
  page,
}) => {
  await openBook('field-notes')
  const rows = page.locator('.chapter-nav-list > li')
  const before = await rows.count()

  // Holds the real chapters refetch so the assertion below can only be satisfied by the placeholder
  let releaseChaptersFetch: () => void
  const chaptersFetchHeld = new Promise<void>((resolve) => {
    releaseChaptersFetch = resolve
  })
  await page.route('**/field-notes-chapters', async (route) => {
    await chaptersFetchHeld
    await route.continue()
  })

  await page.getByRole('button', { name: 'Add chapter' }).click()
  await expect(rows).toHaveCount(before + 1)

  releaseChaptersFetch!()
  await expect(rows).toHaveCount(before + 1)
})

test('an Escape on one chapter does not poison the next commit', async ({
  openBook,
  page,
  sandbox,
}) => {
  await openBook('field-notes')

  await createChapter(page, sandbox)
  const firstInput = page.locator('.chapter-nav-rename')
  await firstInput.fill('Should not be saved')
  await firstInput.press('Escape')
  await expect(firstInput).toHaveCount(0)

  const secondChapterFile = await createChapter(page, sandbox)
  const secondInput = page.locator('.chapter-nav-rename')
  await secondInput.fill('Second Chapter Title')
  await secondInput.press('Enter')
  await expect(secondInput).toHaveCount(0)

  await expect
    .poll(() => readFileSync(chapterPath(sandbox, 'field-notes', secondChapterFile), 'utf-8'))
    .toContain('title: "Second Chapter Title"')
})
