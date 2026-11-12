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

  // Pure: computes a correction without mutating anything. Returns
  // { token, apply } (apply performs the deferred mutation) or undefined.
  function compute(breakToken, overflow, rendered) {
    const measured = measureBreak(breakToken, overflow, rendered)
    if (!measured) return

    const { paragraph, layoutParagraph, beforeLineRects, totalLines, linesBefore, linesAfter } =
      measured
    if (totalLines < MIN_WIDOW_LINES) return

    if (linesAfter === 0 || linesAfter >= MIN_WIDOW_LINES) return

    const targetLinesBefore = linesBefore - (MIN_WIDOW_LINES - linesAfter)
    if (targetLinesBefore <= 0) {
      const token = deferToElementStart(paragraph, breakToken)
      if (!token) return

      return {
        token,
        apply() {
          if (layoutParagraph !== paragraph) layoutParagraph.remove()
        },
      }
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

    return {
      token: cloneBreakToken(breakToken, sourcePosition.node, sourcePosition.offset),
      apply() {
        if (layoutParagraph !== paragraph) {
          trimRenderedContentFrom(layoutParagraph, layoutPosition.node, layoutPosition.offset)
        }
      },
    }
  }

  window.PaginationRules.MinWidowLines = { compute }
})()
