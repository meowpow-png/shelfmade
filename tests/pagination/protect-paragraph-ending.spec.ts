import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'

declare global {
  interface Window {
    PAGED_READY?: boolean
  }
}

async function paginate(page: Page) {
  const fixture = path.join(__dirname, 'fixtures', 'protect-paragraph-ending.html')
  await page.goto(`file://${fixture}`)
  await page.waitForFunction(() => window.PAGED_READY === true)
  return page.locator('.pagedjs_page')
}

async function lineTop(locator: Locator) {
  return locator.evaluate((element) => Math.round(element.getBoundingClientRect().top))
}

async function textWithoutWordJoiners(locator: Locator) {
  const text = await locator.evaluate((element) => element.textContent ?? '')
  return text.replace(/\u2060/g, '')
}

// The protected word is plain text now, so locate it as the paragraph's last
// non-empty text node (pagedjs leaves an empty one after it) and use its
// rects' distinct tops as the wrap check.
async function lastWordLineTops(paragraph: Locator) {
  return paragraph.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let lastTextNode: Text | null = null
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if ((node as Text).textContent) lastTextNode = node as Text
    }
    if (!lastTextNode) return []

    const range = document.createRange()
    range.selectNodeContents(lastTextNode)
    return [...new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)))]
  })
}

test('binds a short final word to the preceding word', async ({ page }) => {
  const pages = await paginate(page)
  await expect(pages).toHaveCount(1)

  const paragraph = pages.locator('#short-ending')
  const previousWord = paragraph.locator('.previous-word')

  expect(await textWithoutWordJoiners(paragraph)).toContain('posljednja je')

  const lineTops = await lastWordLineTops(paragraph)
  expect(lineTops).toHaveLength(1)
  expect(await lineTop(previousWord)).toBe(lineTops[0])
})

test('keeps a final word with a hyphenation opportunity intact', async ({ page }) => {
  const pages = await paginate(page)
  const paragraph = pages.locator('#hyphenated-ending')

  const text = await paragraph.evaluate((element) => element.textContent ?? '')
  expect(text).not.toContain('\u00ad')
  expect(text.replace(/\u2060/g, '')).toBe('Ovo rjesenje ostaje najjednostavnije')

  const lineTops = await lastWordLineTops(paragraph)
  expect(lineTops).toHaveLength(1)
})

test('does not bind a longer final word to the preceding word', async ({ page }) => {
  const pages = await paginate(page)
  const paragraph = pages.locator('#long-ending')

  expect(await textWithoutWordJoiners(paragraph)).toBe('Ostaje ovdje zauvijek.')
})
