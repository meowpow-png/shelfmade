import { expect, test } from './test'

test.use({ editorServerOptions: { portBase: 8199 } })

test('a book stylesheet does not leak into the editor chrome', async ({ openBook, page }) => {
  await openBook('field-notes')

  // Positive control: book.css really does override body's font-family
  const displayFrame = page.frames().find((frame) => frame.url().includes('-display-frame'))
  const bookFontFamily = await displayFrame!.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  )
  expect(bookFontFamily.toLowerCase()).toContain('georgia')

  // Book CSS should only ever load inside the iframes, never the main document
  const bookLinkCount = await page.evaluate(
    () => document.querySelectorAll('head link[href*="books/"]').length,
  )
  expect(bookLinkCount).toBe(0)
})
