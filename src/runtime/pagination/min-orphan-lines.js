;(function () {
  const MIN_ORPHAN_LINES = 2
  const { deferToElementStart, measureBreak } = window.PaginationRules

  class MinOrphanLines extends window.Paged.Handler {
    onBreakToken(breakToken, overflow, rendered) {
      const measured = measureBreak(breakToken, overflow, rendered)
      if (!measured) return

      const { paragraph, layoutParagraph, totalLines, linesBefore } = measured
      if (totalLines < MIN_ORPHAN_LINES) return

      // A zero value means the whole paragraph is already deferred.
      // Otherwise, too few lines can only be fixed by moving the whole paragraph.
      if (linesBefore === 0 || linesBefore >= MIN_ORPHAN_LINES) return

      if (layoutParagraph !== paragraph) layoutParagraph.remove()
      return deferToElementStart(paragraph, breakToken)
    }
  }

  window.PaginationRules.MinOrphanLines = MinOrphanLines
})()
