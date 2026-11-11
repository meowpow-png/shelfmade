// Custom paged.js break rules that plain CSS can't express.
// Paged.js parses `orphans` and `widows`, but does not enforce them during layout.
;(function () {
  const {
    ProtectParagraphEnding,
    KeepHeadingWithParagraph,
    KeepHyphenatedWordTogether,
    MinWidowLines,
    MinOrphanLines,
  } = window.PaginationRules

  // Handler dispatch stops when a handler returns
  // a corrected break token, so the specific heading
  // rule must run before generic paragraph rules.
  const handlers = [
    ...(ProtectParagraphEnding ? [ProtectParagraphEnding] : []),
    KeepHeadingWithParagraph,
    ...(KeepHyphenatedWordTogether ? [KeepHyphenatedWordTogether] : []),
    MinWidowLines,
    MinOrphanLines,
  ]
  window.Paged.registerHandlers(...handlers)
})()
