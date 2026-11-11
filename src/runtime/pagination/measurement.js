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

  // Firefox detaches source nodes during layout, so measure paged.js's
  // connected clone when available and map corrections back to the source.
  function measureBreak(breakToken, overflow, rendered) {
    if (!breakToken || !breakToken.node || breakToken.node.nodeType !== Node.TEXT_NODE) return null

    const textNode = breakToken.node
    const paragraph = textNode.parentElement && textNode.parentElement.closest('p')
    if (!paragraph) return null

    const renderedParagraph = renderedParagraphFor(paragraph, rendered)
    const layoutParagraph = renderedParagraph || paragraph
    const sourceOffset = textOffsetWithin(paragraph, textNode, breakToken.offset)
    const layoutPosition = textPositionAt(layoutParagraph, sourceOffset)
    if (!layoutPosition) return null

    let beforeOffset = layoutPosition.offset
    while (/\s/.test(layoutPosition.node.textContent[beforeOffset - 1] || '')) beforeOffset--

    const beforeRange = document.createRange()
    beforeRange.selectNodeContents(layoutParagraph)
    beforeRange.setEnd(layoutPosition.node, beforeOffset)
    const beforeLineRects = lineRects(beforeRange)

    const overflowLineRects = overflow instanceof Range ? lineRects(overflow) : []
    let linesAfter = overflowLineRects.length

    if (linesAfter === 0) {
      const afterRange = document.createRange()
      afterRange.selectNodeContents(layoutParagraph)
      afterRange.setStart(layoutPosition.node, layoutPosition.offset)
      linesAfter = lineRects(afterRange).length
    }

    return {
      paragraph,
      layoutParagraph,
      beforeLineRects,
      totalLines: beforeLineRects.length + linesAfter,
      linesBefore: beforeLineRects.length,
      linesAfter,
    }
  }

  window.PaginationRules = {
    ...window.PaginationRules,
    findLineStart,
    mapTextPosition,
    measureBreak,
  }
})()
