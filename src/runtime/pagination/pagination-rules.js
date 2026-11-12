// Custom paged.js break rules that plain CSS can't express.
// Paged.js parses `orphans` and `widows`, but does not enforce them during layout.
;(function () {
  const { ProtectParagraphEnding, BreakTokenDispatch } = window.PaginationRules

  // BreakTokenDispatch coordinates all break-token rules (break-token-dispatch.js)
  // so only one rule's mutation runs per break, by explicit priority.
  const handlers = [...(ProtectParagraphEnding ? [ProtectParagraphEnding] : []), BreakTokenDispatch]
  window.Paged.registerHandlers(...handlers)
})()
