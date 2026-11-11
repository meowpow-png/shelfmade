;(function () {
  const MIN_HEADING_PARAGRAPH_LINES = 2
  const { deferToElementStart, isHeading, measureBreak, renderedElementFor } =
    window.PaginationRules

  class KeepHeadingWithParagraph extends window.Paged.Handler {
    // noinspection JSUnusedGlobalSymbols
    onBreakToken(breakToken, _overflow, rendered) {
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

        const renderedHeading = renderedElementFor(heading, rendered)
        if (renderedHeading) renderedHeading.remove()
        return deferToElementStart(heading, breakToken)
      }

      const measured = measureBreak(breakToken)
      if (!measured) return

      const { paragraph, totalLines, linesBefore } = measured
      if (totalLines < MIN_HEADING_PARAGRAPH_LINES) return

      const heading = paragraph.previousElementSibling
      if (!isHeading(heading)) return

      if (linesBefore === 0 || linesBefore >= MIN_HEADING_PARAGRAPH_LINES) return

      const renderedHeading = renderedElementFor(heading, rendered)
      if (renderedHeading) renderedHeading.remove()
      return deferToElementStart(heading, breakToken)
    }
  }

  window.PaginationRules.KeepHeadingWithParagraph = KeepHeadingWithParagraph
})()
