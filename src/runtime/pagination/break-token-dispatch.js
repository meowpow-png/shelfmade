// Runs each rule's pure compute() against the same unmutated break token
// and applies only the winner's mutation, so rules can't disable each other.
;(function () {
  class BreakTokenDispatch extends window.Paged.Handler {
    onBreakToken(breakToken, overflow, rendered) {
      const {
        KeepHeadingWithParagraph,
        KeepHyphenatedWordTogether,
        MinWidowLines,
        MinOrphanLines,
      } = window.PaginationRules

      // Priority order: earlier rules win when both match the same break.
      // KeepHyphenatedWordTogether is optional, not all fixtures load it.
      const rules = [
        KeepHeadingWithParagraph,
        KeepHyphenatedWordTogether,
        MinWidowLines,
        MinOrphanLines,
      ].filter(Boolean)

      for (const rule of rules) {
        const candidate = rule.compute(breakToken, overflow, rendered)
        if (!candidate) continue

        candidate.apply()
        return candidate.token
      }
    }
  }

  window.PaginationRules.BreakTokenDispatch = BreakTokenDispatch
})()
