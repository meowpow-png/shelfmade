import path from 'node:path'
import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    PaginationRules: {
      KeepHeadingWithParagraph: {
        compute: (
          breakToken: { node: Node; offset: number },
          overflow: Range,
          rendered: Element,
        ) => { token: { node: Node; offset: number }; apply: () => void } | undefined
      }
    }
  }
}

// KeepHeadingWithParagraph relies on measureBreak's linesBefore
// count. A truncated render clone can make it think too few
// paragraph lines stayed with the heading when plenty actually did.
test('KeepHeadingWithParagraph leaves the break alone when enough lines already follow, even with a truncated render clone', async ({
  page,
}) => {
  const fixture = path.join(__dirname, 'fixtures', 'heading-paragraph-clone.html')
  await page.goto(`file://${fixture}`)

  const result = await page.evaluate(() => {
    // Heading + source paragraph, connected, with 5 deterministic lines
    // via <br>. linesBefore=3, linesAfter=2 once broken at the start of P4,
    // already satisfying the rule (>= 2 lines stay with the heading), so this is a no-op.
    const heading = document.createElement('h2')
    heading.textContent = 'Heading'
    const paragraph = document.createElement('p')
    paragraph.dataset.ref = 'test-ref'
    for (const [index, text] of ['P1', 'P2', 'P3', 'P4', 'P5'].entries()) {
      if (index > 0) paragraph.append(document.createElement('br'))
      paragraph.append(document.createTextNode(text))
    }
    document.body.append(heading, paragraph)

    // paged.js's in-progress render clone, with only the first line laid out
    // so far. Shares the source's data-ref so renderedParagraphFor matches
    // it.
    const rendered = document.createElement('div')
    const clone = document.createElement('p')
    clone.dataset.ref = 'test-ref'
    clone.append(document.createTextNode('P1'))
    rendered.append(clone)
    document.body.append(rendered)

    const p4Node = paragraph.childNodes[6] as Text // text node 'P4'
    const breakToken = { node: p4Node, offset: 0 }

    const overflow = document.createRange()
    overflow.setStart(p4Node, 0)
    overflow.setEnd(p4Node, p4Node.textContent!.length)

    const candidate = window.PaginationRules.KeepHeadingWithParagraph.compute(
      breakToken,
      overflow,
      rendered,
    )
    candidate?.apply()

    return { computed: !!candidate }
  })

  // 3 real lines already stay with the heading, so the break stays put.
  expect(result.computed).toBe(false)
})

// A genuine heading/paragraph violation must still be caught,
// even when the render clone hasn't rendered anything for this paragraph yet.
test('KeepHeadingWithParagraph still moves the heading and paragraph together when too few lines follow, even with a truncated render clone', async ({
  page,
}) => {
  const fixture = path.join(__dirname, 'fixtures', 'heading-paragraph-clone.html')
  await page.goto(`file://${fixture}`)

  const result = await page.evaluate(() => {
    // Heading + source paragraph, connected, with 3 deterministic lines via
    // <br>. linesBefore=1, linesAfter=2 once broken at the start of P2: a
    // genuine violation, since only 1 line would stay with the heading.
    const heading = document.createElement('h2')
    heading.textContent = 'Heading'
    const paragraph = document.createElement('p')
    paragraph.dataset.ref = 'test-ref'
    for (const [index, text] of ['P1', 'P2', 'P3'].entries()) {
      if (index > 0) paragraph.append(document.createElement('br'))
      paragraph.append(document.createTextNode(text))
    }
    document.body.append(heading, paragraph)

    // paged.js's in-progress render clone, with nothing
    // rendered for this paragraph yet. Shares the source's
    // data-ref so renderedParagraphFor matches it.
    const rendered = document.createElement('div')
    const clone = document.createElement('p')
    clone.dataset.ref = 'test-ref'
    rendered.append(clone)
    document.body.append(rendered)

    const p2Node = paragraph.childNodes[2] as Text // text node 'P2'
    const breakToken = { node: p2Node, offset: 0 }

    const overflow = document.createRange()
    overflow.setStart(p2Node, 0)
    overflow.setEnd(p2Node, p2Node.textContent!.length)

    const candidate = window.PaginationRules.KeepHeadingWithParagraph.compute(
      breakToken,
      overflow,
      rendered,
    )
    const cloneRemovedBeforeApply = !clone.isConnected
    candidate?.apply()

    return {
      computed: !!candidate,
      correctedIsHeadingStart:
        candidate?.token.node === heading.firstChild && candidate?.token.offset === 0,
      cloneRemovedBeforeApply,
      cloneRemovedAfterApply: !clone.isConnected,
    }
  })

  expect(result.computed).toBe(true)
  expect(result.correctedIsHeadingStart).toBe(true)
  // compute() must be pure; the mutation only happens once apply() runs.
  expect(result.cloneRemovedBeforeApply).toBe(false)
  expect(result.cloneRemovedAfterApply).toBe(true)
})
