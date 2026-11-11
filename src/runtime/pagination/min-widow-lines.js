;(function () {
  const MIN_WIDOW_LINES = 2
  const {
    cloneBreakToken,
    deferToElementStart,
    findLineStart,
    mapTextPosition,
    measureBreak,
    trimRenderedContentFrom,
  } = window.PaginationRules

  class MinWidowLines extends window.Paged.Handler {
    onBreakToken(breakToken, overflow, rendered) {
      const measured = measureBreak(breakToken, overflow, rendered)
      if (!measured) return

      const { paragraph, layoutParagraph, beforeLineRects, totalLines, linesBefore, linesAfter } =
        measured
      if (totalLines < MIN_WIDOW_LINES) return

      if (linesAfter === 0 || linesAfter >= MIN_WIDOW_LINES) return

      const targetLinesBefore = linesBefore - (MIN_WIDOW_LINES - linesAfter)
      if (targetLinesBefore <= 0) {
        if (layoutParagraph !== paragraph) layoutParagraph.remove()
        return deferToElementStart(paragraph, breakToken)
      }

      const targetRect = beforeLineRects[targetLinesBefore]
      if (!targetRect) return

      const layoutPosition = findLineStart(layoutParagraph, targetRect)
      if (!layoutPosition) return

      const sourcePosition = mapTextPosition(
        layoutParagraph,
        paragraph,
        layoutPosition.node,
        layoutPosition.offset,
      )
      if (!sourcePosition) return

      if (layoutParagraph !== paragraph) {
        trimRenderedContentFrom(layoutParagraph, layoutPosition.node, layoutPosition.offset)
      }
      return cloneBreakToken(breakToken, sourcePosition.node, sourcePosition.offset)
    }
  }

  window.PaginationRules.MinWidowLines = MinWidowLines
})()
