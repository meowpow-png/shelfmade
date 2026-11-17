;(function () {
  const SAME_LINE_TOLERANCE = 1

  function lineRects(range) {
    const lines = []

    for (const rect of range.getClientRects()) {
      if (rect.width === 0 || rect.height === 0) continue

      const line = lines.find(
        (candidate) => Math.abs(candidate.top - rect.top) < SAME_LINE_TOLERANCE,
      )

      if (!line) {
        lines.push({ top: rect.top })
      }
    }

    return lines
  }

  function renderedParagraphFor(paragraph, rendered) {
    if (!rendered || !rendered.isConnected) return null

    const ref = paragraph.getAttribute('data-ref')
    if (!ref) return null

    for (const candidate of rendered.querySelectorAll('p[data-ref]')) {
      if (candidate.getAttribute('data-ref') === ref) return candidate
    }
    return null
  }

  function textOffsetWithin(element, node, offset) {
    const range = document.createRange()
    range.selectNodeContents(element)
    range.setEnd(node, offset)
    return range.toString().length
  }

  function textPositionAt(element, offset) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()

    while (node) {
      if (offset <= node.textContent.length) return { node, offset }
      offset -= node.textContent.length
      node = walker.nextNode()
    }
    return null
  }

  function mapTextPosition(fromElement, toElement, node, offset) {
    return textPositionAt(toElement, textOffsetWithin(fromElement, node, offset))
  }

  // Clones the full source paragraph into the layout clone's
  // position, so line counts aren't limited to whatever prefix
  // is rendered so far. Caller must remove it after measuring.
  function fullParagraphProbe(paragraph, layoutParagraph) {
    const probe = paragraph.cloneNode(true)
    probe.style.visibility = 'hidden'
    layoutParagraph.after(probe)
    return probe
  }

  function findLineStart(element, lineRect) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    const range = document.createRange()
    let node = walker.nextNode()

    while (node) {
      for (let offset = 0; offset < node.textContent.length; offset++) {
        range.setStart(node, offset)
        range.setEnd(node, offset + 1)
        const rect = range.getClientRects()[0]

        if (rect && Math.abs(rect.top - lineRect.top) < SAME_LINE_TOLERANCE) {
          return { node, offset }
        }
      }
      node = walker.nextNode()
    }
    return null
  }

  function overflowLinesWithin(overflow, element) {
    if (!(overflow instanceof Range)) return 0

    const scopedOverflow = overflow.cloneRange()
    try {
      scopedOverflow.setEnd(element, element.childNodes.length)
    } catch {
      return 0
    }
    return lineRects(scopedOverflow).length
  }

  // Firefox detaches source nodes during layout,
  // so measure paged.js's connected clone when
  // available and map corrections back to the source.
  function measureBreak(breakToken, overflow, rendered) {
    if (!breakToken || !breakToken.node || breakToken.node.nodeType !== Node.TEXT_NODE) return null

    const textNode = breakToken.node
    const paragraph = textNode.parentElement && textNode.parentElement.closest('p')
    if (!paragraph) return null

    const renderedParagraph = renderedParagraphFor(paragraph, rendered)
    const layoutParagraph = renderedParagraph || paragraph
    const sourceOffset = textOffsetWithin(paragraph, textNode, breakToken.offset)

    // The clone can be shorter than the break offset.
    // Measuring "before" lines against it undercounts
    // how many lines are really there, so this measures
    // against a full copy of the source paragraph instead,
    // then discards it. The real clone doesn't contain the probe's
    // content, so its coordinates can't be reused to locate or trim it.
    const truncated = sourceOffset > layoutParagraph.textContent.length
    const measureParagraph = truncated
      ? fullParagraphProbe(paragraph, layoutParagraph)
      : layoutParagraph

    const layoutPosition = textPositionAt(measureParagraph, sourceOffset)
    if (!layoutPosition) {
      if (truncated) measureParagraph.remove()
      return null
    }

    let beforeOffset = layoutPosition.offset
    while (/\s/.test(layoutPosition.node.textContent[beforeOffset - 1] || '')) beforeOffset--

    const beforeRange = document.createRange()
    beforeRange.selectNodeContents(measureParagraph)
    beforeRange.setEnd(layoutPosition.node, beforeOffset)
    const beforeLineRects = lineRects(beforeRange)

    // paged.js may extend the overflow range into
    // later elements. Count only the part belonging to
    // this paragraph or unrelated lines can mask a widow.
    let linesAfter = overflowLinesWithin(overflow, paragraph)

    if (linesAfter === 0) {
      const afterRange = document.createRange()
      afterRange.selectNodeContents(measureParagraph)
      afterRange.setStart(layoutPosition.node, layoutPosition.offset)
      linesAfter = lineRects(afterRange).length
    }

    if (truncated) measureParagraph.remove()

    return {
      paragraph,
      layoutParagraph,
      beforeLineRects,
      totalLines: beforeLineRects.length + linesAfter,
      linesBefore: beforeLineRects.length,
      linesAfter,
      // Unlike linesAfter/totalLines, immune to layoutParagraph truncation.
      hasTextAfter: sourceOffset < paragraph.textContent.length,
      // True when beforeLineRects came from the throwaway probe instead of
      // the real layoutParagraph. A fix must not target positions inside it.
      truncated,
    }
  }

  window.PaginationRules = {
    ...window.PaginationRules,
    findLineStart,
    mapTextPosition,
    measureBreak,
  }
})()
