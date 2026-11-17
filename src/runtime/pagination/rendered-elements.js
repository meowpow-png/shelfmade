;(function () {
  function isHeading(node) {
    return !!node && /^H[1-6]$/.test(node.tagName)
  }

  function renderedElementFor(sourceElement, rendered) {
    if (!sourceElement || !rendered) return null
    if (rendered.contains(sourceElement)) return sourceElement

    const ref = sourceElement.getAttribute('data-ref')
    if (ref) {
      const matches = rendered.querySelectorAll('[data-ref]')
      for (const match of matches) {
        if (match.getAttribute('data-ref') === ref) return match
      }
    }

    // The fixture/source DOM does not necessarily carry
    // paged.js's clone metadata. Search the current page
    // and choose the matching element nearest the break.
    const candidates = rendered.querySelectorAll(sourceElement.tagName.toLowerCase())
    const sourceText = sourceElement.textContent
    for (let index = candidates.length - 1; index >= 0; index--) {
      if (candidates[index].textContent === sourceText) return candidates[index]
    }
    return null
  }

  window.PaginationRules = { ...window.PaginationRules, isHeading, renderedElementFor }
})()
