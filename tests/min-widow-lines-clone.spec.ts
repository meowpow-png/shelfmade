import path from 'node:path'
import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    PaginationRules: {
      MinWidowLines: {
        compute: (
          breakToken: { node: Node; offset: number },
          overflow: Range,
          rendered: Element,
        ) => { token: { node: Node; offset: number }; apply: () => void } | undefined
      }
    }
  }
}

// MinWidowLines relies on measureBreak's linesBefore count. A severely
// truncated render clone can make it look like there isn't enough content
// to evaluate, leaving a genuine widow unprotected.
test('MinWidowLines still defers a genuine widow when handed a render clone with no lines rendered yet', async ({
  page,
}) => {
  const fixture = path.join(__dirname, 'fixtures', 'min-widow-lines-clone.html')
  await page.goto(`file://${fixture}`)

  const result = await page.evaluate(() => {
    // Source paragraph, connected as it is while paged.js lays it out, with
    // 3 deterministic lines via <br>. linesBefore=2, linesAfter=1 once
    // broken at the start of P3: a genuine single-line widow.
    const paragraph = document.createElement('p')
    paragraph.dataset.ref = 'test-ref'
    for (const [index, text] of ['P1', 'P2', 'P3'].entries()) {
      if (index > 0) paragraph.append(document.createElement('br'))
      paragraph.append(document.createTextNode(text))
    }
    document.body.append(paragraph)

    // paged.js's in-progress render clone, with nothing rendered for this
    // paragraph yet. Shares the source's data-ref so renderedParagraphFor
    // matches it.
    const rendered = document.createElement('div')
    const clone = document.createElement('p')
    clone.dataset.ref = 'test-ref'
    rendered.append(clone)
    document.body.append(rendered)

    const p3Node = paragraph.lastChild as Text // text node 'P3'
    const breakToken = { node: p3Node, offset: 0 }

    const overflow = document.createRange()
    overflow.setStart(p3Node, 0)
    overflow.setEnd(p3Node, p3Node.textContent!.length)

    const candidate = window.PaginationRules.MinWidowLines.compute(breakToken, overflow, rendered)
    const cloneRemovedBeforeApply = !clone.isConnected
    candidate?.apply()

    return {
      computed: !!candidate,
      correctedIsParagraphStart:
        candidate?.token.node === paragraph.firstChild && candidate?.token.offset === 0,
      cloneRemovedBeforeApply,
      cloneRemovedAfterApply: !clone.isConnected,
    }
  })

  expect(result.computed).toBe(true)
  expect(result.correctedIsParagraphStart).toBe(true)
  // compute() must be pure; the mutation only happens once apply() runs.
  expect(result.cloneRemovedBeforeApply).toBe(false)
  expect(result.cloneRemovedAfterApply).toBe(true)
})

// A break that already satisfies the widow rule must stay a no-op, even
// when the render clone hasn't rendered anything for this paragraph yet.
test('MinWidowLines leaves a break alone when the widow rule is already satisfied, even with a truncated render clone', async ({
  page,
}) => {
  const fixture = path.join(__dirname, 'fixtures', 'min-widow-lines-clone.html')
  await page.goto(`file://${fixture}`)

  const result = await page.evaluate(() => {
    // Source paragraph, connected, with 4 deterministic lines via <br>.
    // linesBefore=2, linesAfter=2 once broken at the start of P3, already
    // satisfying the rule (>= 2 lines after the break).
    const paragraph = document.createElement('p')
    paragraph.dataset.ref = 'test-ref'
    for (const [index, text] of ['P1', 'P2', 'P3', 'P4'].entries()) {
      if (index > 0) paragraph.append(document.createElement('br'))
      paragraph.append(document.createTextNode(text))
    }
    document.body.append(paragraph)

    // paged.js's in-progress render clone, with nothing rendered for this
    // paragraph yet. Shares the source's data-ref so renderedParagraphFor
    // matches it.
    const rendered = document.createElement('div')
    const clone = document.createElement('p')
    clone.dataset.ref = 'test-ref'
    rendered.append(clone)
    document.body.append(rendered)

    const p3Node = paragraph.childNodes[4] as Text // text node 'P3'
    const breakToken = { node: p3Node, offset: 0 }

    const overflow = document.createRange()
    overflow.setStart(p3Node, 0)
    overflow.setEnd(p3Node, p3Node.textContent!.length)

    const candidate = window.PaginationRules.MinWidowLines.compute(breakToken, overflow, rendered)

    return { computed: !!candidate }
  })

  expect(result.computed).toBe(false)
})
