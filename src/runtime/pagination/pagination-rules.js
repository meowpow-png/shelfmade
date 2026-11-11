// Custom paged.js break rules that plain CSS can't express.
// Paged.js parses `orphans` and `widows`, but does not enforce them during layout.
;(function () {
  const { ProtectParagraphEnding, KeepHeadingWithParagraph, MinWidowLines, MinOrphanLines } =
    window.PaginationRules

  // Handler dispatch stops when a handler returns
  // a corrected break token, so the specific heading
  // rule must run before generic paragraph rules.
  const breakHandlers = [KeepHeadingWithParagraph, MinWidowLines, MinOrphanLines]
  const handlers = ProtectParagraphEnding
    ? [ProtectParagraphEnding, ...breakHandlers]
    : breakHandlers
  window.Paged.registerHandlers(...handlers)
})()
