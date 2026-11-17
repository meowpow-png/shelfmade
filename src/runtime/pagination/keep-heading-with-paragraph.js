;(function () {
  const MIN_HEADING_PARAGRAPH_LINES = 2
  const { deferToElementStart, isHeading, measureBreak, renderedElementFor } =
    window.PaginationRules

  function compute(breakToken, overflow, rendered) {
    // A token at offset zero on the paragraph element means paged.js has
    // already deferred the whole paragraph. Pull its heading back too.
    if (
      breakToken &&
      breakToken.node &&
      breakToken.node.nodeType === Node.ELEMENT_NODE &&
      breakToken.node.tagName === 'P' &&
      breakToken.offset === 0
    ) {
      const heading = breakToken.node.previousElementSibling
      if (!isHeading(heading)) return

      const token = deferToElementStart(heading, breakToken)
      if (!token) return

      return {
        token,
        apply() {
          const renderedHeading = renderedElementFor(heading, rendered)
          if (renderedHeading) renderedHeading.remove()
        },
      }
    }

    const measured = measureBreak(breakToken, overflow, rendered)
    if (!measured) return

    const { paragraph, layoutParagraph, totalLines, linesBefore } = measured
    if (totalLines < MIN_HEADING_PARAGRAPH_LINES) return

    const heading = paragraph.previousElementSibling
    if (!isHeading(heading)) return

    if (linesBefore === 0 || linesBefore >= MIN_HEADING_PARAGRAPH_LINES) return

    const token = deferToElementStart(heading, breakToken)
    if (!token) return

    return {
      token,
      apply() {
        const renderedHeading = renderedElementFor(heading, rendered)
        if (renderedHeading) renderedHeading.remove()
        if (layoutParagraph !== paragraph) layoutParagraph.remove()
      },
    }
  }

  window.PaginationRules.KeepHeadingWithParagraph = { compute }
})()
