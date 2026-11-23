import { expect, test } from './test'

test('BreakTokenDispatch keeps a heading with its paragraph over a competing orphan/widow fix', async ({
  page,
  openFixture,
}) => {
  await openFixture('break-token-dispatch-collision.html')

  const result = await page.evaluate(() => {
    // Forces the exact 3-way collision: linesBefore === 1 (heading rule,
    // orphan rule) and linesAfter === 1 (widow rule), all on one break.
    const rendered = document.createElement('div')
    const heading = document.createElement('h2')
    heading.append(document.createTextNode('Heading'))
    const paragraph = document.createElement('p')
    paragraph.append(document.createTextNode('Target'))
    rendered.append(heading, paragraph)
    document.body.append(rendered)

    window.__TEST_MEASURED__ = {
      paragraph,
      layoutParagraph: paragraph,
      beforeLineRects: [{ top: 0 }],
      totalLines: 2,
      linesBefore: 1,
      linesAfter: 1,
      hasTextAfter: true,
    }

    const breakToken = { node: paragraph.firstChild as Node, offset: 3 }

    // compute() is pure, so call each rule directly first to prove all
    // three actually fire here, independent of the dispatcher.
    const headingComputed = !!window.PaginationRules.KeepHeadingWithParagraph.compute(
      breakToken,
      null,
      rendered,
    )
    const widowComputed = !!window.PaginationRules.MinWidowLines.compute(breakToken, null, rendered)
    const orphanComputed = !!window.PaginationRules.MinOrphanLines.compute(
      breakToken,
      null,
      rendered,
    )
    const nothingMutatedYet = heading.isConnected && paragraph.isConnected

    // Spy on apply, then run the real dispatcher: it short-circuits at
    // the first matching rule, so only that rule's apply fires.
    function spyOnApply(ruleName: 'KeepHeadingWithParagraph' | 'MinWidowLines' | 'MinOrphanLines') {
      const rule = window.PaginationRules[ruleName]
      const originalCompute = rule.compute
      const calls = { applied: false }
      rule.compute = (...args) => {
        const candidate = originalCompute(...args)
        if (!candidate) return candidate
        const originalApply = candidate.apply
        candidate.apply = () => {
          calls.applied = true
          originalApply()
        }
        return candidate
      }
      return calls
    }

    const headingSpy = spyOnApply('KeepHeadingWithParagraph')
    const widowSpy = spyOnApply('MinWidowLines')
    const orphanSpy = spyOnApply('MinOrphanLines')

    const dispatcher = new window.PaginationRules.BreakTokenDispatch()
    const token = dispatcher.onBreakToken(breakToken, null, rendered)

    return {
      headingComputed,
      widowComputed,
      orphanComputed,
      nothingMutatedYet,
      headingApplied: headingSpy.applied,
      widowApplied: widowSpy.applied,
      orphanApplied: orphanSpy.applied,
      resultIsHeadingStart: token?.node === heading.firstChild && token?.offset === 0,
      headingRemoved: !heading.isConnected,
      paragraphRemoved: !paragraph.isConnected,
    }
  })

  // All three rules fire on this measurement, and compute() mutated nothing.
  expect(result.headingComputed).toBe(true)
  expect(result.widowComputed).toBe(true)
  expect(result.orphanComputed).toBe(true)
  expect(result.nothingMutatedYet).toBe(true)

  // The dispatcher short-circuits at the winner; only its mutation runs.
  expect(result.headingApplied).toBe(true)
  expect(result.widowApplied).toBe(false)
  expect(result.orphanApplied).toBe(false)

  // The heading moves with its paragraph, not the paragraph alone.
  expect(result.resultIsHeadingStart).toBe(true)
  expect(result.headingRemoved).toBe(true)
  expect(result.paragraphRemoved).toBe(false)
})
