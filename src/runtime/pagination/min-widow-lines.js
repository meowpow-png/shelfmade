;(function () {
  const MIN_WIDOW_LINES = 2
  const { cloneBreakToken, deferToElementStart, measureBreak } = window.PaginationRules

  class MinWidowLines extends window.Paged.Handler {
    // noinspection JSUnusedGlobalSymbols
    onBreakToken(breakToken) {
      const measured = measureBreak(breakToken)
      if (!measured) return

      const { paragraph, fullRange, totalLines, linesBefore } = measured
      if (totalLines < MIN_WIDOW_LINES) return

      const linesAfter = totalLines - linesBefore
      if (linesAfter === 0 || linesAfter >= MIN_WIDOW_LINES) return

      const targetLinesBefore = linesBefore - (MIN_WIDOW_LINES - linesAfter)
      if (targetLinesBefore <= 0) return deferToElementStart(paragraph, breakToken)

      const targetRect = fullRange.getClientRects()[targetLinesBefore]
      if (!targetRect) return

      const caret = document.caretPositionFromPoint(
        targetRect.left + 1,
        targetRect.top + targetRect.height / 2,
      )
      return caret ? cloneBreakToken(breakToken, caret.offsetNode, caret.offset) : undefined
    }
  }

  window.PaginationRules.MinWidowLines = MinWidowLines
})()
