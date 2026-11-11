;(function () {
  function countLines(range) {
    return range.getClientRects().length
  }

  // Resolves the paragraph a break falls in and
  // how many of its lines land before vs. in total,
  // so each rule only has to decide what to do about it.
  function measureBreak(breakToken) {
    if (!breakToken || !breakToken.node || breakToken.node.nodeType !== Node.TEXT_NODE) return null

    const textNode = breakToken.node
    const paragraph = textNode.parentElement && textNode.parentElement.closest('p')
    if (!paragraph) return null

    const fullRange = document.createRange()
    fullRange.selectNodeContents(paragraph)
    const totalLines = countLines(fullRange)

    const beforeRange = document.createRange()
    beforeRange.selectNodeContents(paragraph)
    beforeRange.setEnd(textNode, breakToken.offset)
    const linesBefore = countLines(beforeRange)

    return { paragraph, fullRange, totalLines, linesBefore }
  }

  window.PaginationRules = { ...window.PaginationRules, measureBreak }
})()
