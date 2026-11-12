;(function () {
  const MIN_ORPHAN_LINES = 2
  const { deferToElementStart, measureBreak } = window.PaginationRules

  // Pure: computes a correction without mutating anything. Returns
  // { token, apply } (apply performs the deferred mutation) or undefined.
  function compute(breakToken, overflow, rendered) {
    const measured = measureBreak(breakToken, overflow, rendered)
    if (!measured) return

    const { paragraph, layoutParagraph, linesBefore, hasTextAfter } = measured
    if (!hasTextAfter) return

    // A zero value means the whole paragraph is already deferred.
    // Otherwise, too few lines can only be fixed by moving the whole paragraph.
    if (linesBefore === 0 || linesBefore >= MIN_ORPHAN_LINES) return

    const token = deferToElementStart(paragraph, breakToken)
    if (!token) return

    return {
      token,
      apply() {
        if (layoutParagraph !== paragraph) layoutParagraph.remove()
      },
    }
  }

  window.PaginationRules.MinOrphanLines = { compute }
})()
