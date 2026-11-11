import path from 'node:path'
import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    PaginationRules: {
      MinOrphanLines: new () => {
        onBreakToken: (
          breakToken: { node: Node; offset: number },
          overflow: unknown,
          rendered: Element,
        ) => { node: Node; offset: number } | undefined
      }
    }
  }
}

test('MinOrphanLines defers the whole paragraph when handed a truncated in-progress render clone', async ({
  page,
}) => {
  const fixture = path.join(__dirname, 'fixtures', 'min-orphan-lines-clone.html')
  await page.goto(`file://${fixture}`)

  const result = await page.evaluate(() => {
    const fullText = 'x'.repeat(60)
    const truncatedPrefix = fullText.slice(0, 10)

    // The source paragraph, detached — as it is while paged.js lays it out.
    const paragraph = document.createElement('p')
    paragraph.dataset.ref = 'test-ref'
    paragraph.append(document.createTextNode(fullText))

    // paged.js's in-progress render clone: only the prefix laid out so far,
    // sharing the source's data-ref so renderedParagraphFor matches it.
    const rendered = document.createElement('div')
    const clone = document.createElement('p')
    clone.dataset.ref = 'test-ref'
    clone.append(document.createTextNode(truncatedPrefix))
    rendered.append(clone)
    document.body.append(rendered)

    // A break offset past the end of the truncated clone but inside the
    // full source paragraph — the mismatch that made measureBreak return
    // null before the fix.
    const breakToken = { node: paragraph.firstChild as Node, offset: 40 }

    const handler = new window.PaginationRules.MinOrphanLines()
    const corrected = handler.onBreakToken(breakToken, null, rendered)

    return {
      corrected: !!corrected,
      correctedIsParagraphStart:
        corrected?.node === paragraph.firstChild && corrected?.offset === 0,
      cloneRemoved: !clone.isConnected,
    }
  })

  expect(result.corrected).toBe(true)
  expect(result.correctedIsParagraphStart).toBe(true)
  expect(result.cloneRemoved).toBe(true)
})
