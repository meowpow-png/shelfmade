import { expect, test } from '../books/test'

test('clicking + New book opens the dialog with the title input focused and Create disabled', async ({
  bookCreateServer,
  page,
}) => {
  await page.goto(`${bookCreateServer.baseURL}/`)
  await page.getByRole('button', { name: '+ New book' }).click()

  await expect(page.getByPlaceholder('Book title')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Create' })).toBeDisabled()
})

test('submitting a title creates the book and navigates to its editor', async ({
  bookCreateServer,
  page,
}) => {
  await page.goto(`${bookCreateServer.baseURL}/`)
  await page.getByRole('button', { name: '+ New book' }).click()
  await page.getByPlaceholder('Book title').fill('My New Book')
  await page.getByRole('button', { name: 'Create' }).click()

  await page.waitForURL(`${bookCreateServer.baseURL}/my-new-book.html`)
  await expect(page.locator('.chapter-nav-item')).toHaveCount(0)
  await expect(page.locator('.editor-empty-title')).toHaveText('Your story starts here')
})

test('the empty state keeps the chapter nav collapsed until Add chapter is clicked', async ({
  bookCreateServer,
  page,
}) => {
  await page.goto(`${bookCreateServer.baseURL}/`)
  await page.getByRole('button', { name: '+ New book' }).click()
  await page.getByPlaceholder('Book title').fill('Nav Collapse Book')
  await page.getByRole('button', { name: 'Create' }).click()
  await page.waitForURL(`${bookCreateServer.baseURL}/nav-collapse-book.html`)

  const toggle = page.getByRole('button', { name: 'Toggle chapter list' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.chapter-nav')).toHaveCount(0)

  await page.getByRole('button', { name: '+ Add chapter' }).click()

  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.chapter-nav')).toBeVisible()
})

test('clicking + Add chapter updates the editor even if the background chapters refetch never resolves', async ({
  bookCreateServer,
  page,
}) => {
  await page.goto(`${bookCreateServer.baseURL}/`)
  await page.getByRole('button', { name: '+ New book' }).click()
  await page.getByPlaceholder('Book title').fill('Chapter Sync Book')
  await page.getByRole('button', { name: 'Create' }).click()
  await page.waitForURL(`${bookCreateServer.baseURL}/chapter-sync-book.html`)

  // Never resolves, isolating the create POST's own response as the only possible update source
  await page.route('**/chapter-sync-book-chapters', () => {})

  await page.getByRole('button', { name: '+ Add chapter' }).click()

  await expect(page.locator('.editor-empty-state')).toHaveCount(0)
  await expect(page.locator('.chapter-nav-item')).toHaveCount(1)
})

test('Escape closes the dialog with no create request sent', async ({ bookCreateServer, page }) => {
  await page.goto(`${bookCreateServer.baseURL}/`)

  let createRequestFired = false
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/books')) createRequestFired = true
  })

  await page.getByRole('button', { name: '+ New book' }).click()
  await page.getByPlaceholder('Book title').fill('Should not be created')
  await page.getByPlaceholder('Book title').press('Escape')

  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(createRequestFired).toBe(false)
})
