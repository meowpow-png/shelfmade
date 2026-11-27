import { expect, test } from './test'

test('MinOrphanLines defers the whole paragraph when handed a truncated in-progress render clone', async ({
  page,
  openFixture,
}) => {
  await openFixture('min-orphan-lines-clone.html')

  const result = await page.evaluate(() => {
    const fullText = 'x'.repeat(60)
    const truncatedPrefix = fullText.slice(0, 10)

    // The source paragraph, detached, as it is while paged.js lays it out.
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
    // full source paragraph, the exact mismatch that broke measureBreak.
    const breakToken = { node: paragraph.firstChild as Node, offset: 40 }

    const candidate = window.PaginationRules.MinOrphanLines.compute(breakToken, null, rendered)
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
  expect(result.cloneRemovedBeforeApply).toBe(false)
  expect(result.cloneRemovedAfterApply).toBe(true)
})
