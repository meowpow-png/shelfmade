;(function () {
  function cloneBreakToken(breakToken, node, offset) {
    return Object.assign(Object.create(Object.getPrototypeOf(breakToken)), { node, offset })
  }
  // Pushes the break to the very start of an element,
  // deferring all of it and anything after it already
  // pending on the current page to the next page
  function deferToElementStart(element, breakToken) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    const firstText = walker.nextNode()
    return firstText ? cloneBreakToken(breakToken, firstText, 0) : undefined
  }

  window.PaginationRules = {
    ...window.PaginationRules,
    cloneBreakToken,
    deferToElementStart,
  }
})()
