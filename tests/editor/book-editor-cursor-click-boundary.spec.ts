import { type Locator, type Page } from '@playwright/test'

import { expect, test } from './test'

// Tall enough that CM6 doesn't virtualize chapter lines out of the DOM
test.use({ viewport: { width: 1280, height: 4000 } })
test.use({ editorServerOptions: { portBase: 8399 } })

async function clickedLine(page: Page) {
  return page.evaluate(() => {
    const anchor = document.getSelection()?.anchorNode
    const element = anchor
      ? anchor.nodeType === Node.TEXT_NODE
        ? anchor.parentElement
        : (anchor as Element)
      : null
    const line = element?.closest('.cm-line')
    return { text: line?.textContent ?? null, className: line?.className ?? null }
  })
}

// Targets a fraction of the box, not its center, which can sit exactly on a padding boundary
async function clickAtFraction(locator: Locator, xFraction: number, yFraction: number) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('target line is not rendered')
  await locator.click({ position: { x: box.width * xFraction, y: box.height * yFraction } })
}

test('clicking the heading-margin dead zone or the heading text lands the cursor in the heading', async ({
  chapter,
  openBook,
  page,
}) => {
  await openBook('field-notes')

  const heading = chapter('Chapter One').locator('.cm-heading-2', {
    hasText: 'Reading the water',
  })

  // Top of the heading's own box - used to be an unclaimed margin gap
  await clickAtFraction(heading, 0.5, 0.05)
  expect(await clickedLine(page)).toMatchObject({ text: '## Reading the water' })

  // The heading's visible text itself
  await clickAtFraction(heading, 0.5, 0.5)
  expect(await clickedLine(page)).toMatchObject({ text: '## Reading the water' })
})

test('clicking the blank lines around a heading lands the cursor on that blank line, not the heading', async ({
  chapter,
  openBook,
  page,
}) => {
  await openBook('field-notes')

  const heading = chapter('Chapter One').locator('.cm-heading-2', {
    hasText: 'Reading the water',
  })
  const blankBefore = heading.locator('xpath=preceding-sibling::*[1]')
  const blankAfter = heading.locator('xpath=following-sibling::*[1]')

  await clickAtFraction(blankBefore, 0.5, 0.5)
  expect(await clickedLine(page)).toMatchObject({ text: '' })

  // Top of the after-heading line's own box - the other half of the split boundary
  await clickAtFraction(blankAfter, 0.5, 0.15)
  const afterHeadingClick = await clickedLine(page)
  expect(afterHeadingClick.text).toBe('')
  expect(afterHeadingClick.className).toContain('cm-after-heading')
})
