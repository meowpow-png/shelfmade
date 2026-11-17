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

  function compute(breakToken, overflow, rendered) {
    const measured = measureBreak(breakToken, overflow, rendered)
    if (!measured) return

    const {
      paragraph,
      layoutParagraph,
      beforeLineRects,
      totalLines,
      linesBefore,
      linesAfter,
      truncated,
    } = measured
    if (totalLines < MIN_WIDOW_LINES) return

    if (linesAfter === 0 || linesAfter >= MIN_WIDOW_LINES) return

    const targetLinesBefore = linesBefore - (MIN_WIDOW_LINES - linesAfter)

    // A truncated render clone doesn't contain the target line yet.
    // Its lines exist only in the measurement probe, not in the
    // real clone a fix would trim. Defer the whole paragraph
    // instead of relocating into content that isn't there.
    if (targetLinesBefore <= 0 || truncated) {
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
