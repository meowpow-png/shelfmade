// Prevent a word from being split between pages at a hyphenation opportunity.
;(function () {
  const { cloneBreakToken, mapTextPosition, measureBreak, trimRenderedContentFrom } =
    window.PaginationRules

  function isWordPart(character) {
    return (
      typeof character === 'string' &&
      /[\p{L}\p{M}\p{N}\u00ad\-'\u2019\u2010\u2011]/u.test(character)
    )
  }

  function textOffsetWithin(element, node, offset) {
    const range = document.createRange()
    range.selectNodeContents(element)
    range.setEnd(node, offset)
    return range.toString().length
  }

  function textPositionAt(element, offset) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()

    while (node) {
      if (offset <= node.textContent.length) return { node, offset }
      offset -= node.textContent.length
      node = walker.nextNode()
    }
    return null
  }

  function hasHyphenationMarker(text, wordStart) {
    let wordEnd = wordStart
    while (wordEnd < text.length && isWordPart(text[wordEnd])) wordEnd++
    return /[\u00ad\-\u2010\u2011]/u.test(text.slice(wordStart, wordEnd))
  }

  function compute(breakToken, _overflow, rendered) {
    if (!breakToken?.node || breakToken.node.nodeType !== Node.TEXT_NODE) return

    const measured = measureBreak(breakToken, _overflow, rendered)
    const paragraph = measured?.paragraph || breakToken.node.parentElement?.closest('p')
    if (!paragraph) return

    const breakOffset = textOffsetWithin(paragraph, breakToken.node, breakToken.offset)
    const text = paragraph.textContent
    if (!isWordPart(text[breakOffset - 1]) || !isWordPart(text[breakOffset])) return

    let wordStart = breakOffset
    while (wordStart > 0 && isWordPart(text[wordStart - 1])) wordStart--
    if (wordStart === breakOffset) return
    if (!hasHyphenationMarker(text, wordStart)) return

    const sourcePosition = textPositionAt(paragraph, wordStart)
    if (!sourcePosition) return

    // Firefox lays out a detached clone. Remove the partial word from that
    // clone before asking paged.js to resume from the word's source position.
    const renderedParagraph = measured?.layoutParagraph
    if (renderedParagraph && renderedParagraph !== paragraph) {
      const renderedPosition = textPositionAt(renderedParagraph, wordStart)
      if (!renderedPosition) return

      const mappedSourcePosition = mapTextPosition(
        renderedParagraph,
        paragraph,
        renderedPosition.node,
        renderedPosition.offset,
      )
      if (!mappedSourcePosition) return

      return {
        token: cloneBreakToken(breakToken, mappedSourcePosition.node, mappedSourcePosition.offset),
        apply() {
          trimRenderedContentFrom(renderedParagraph, renderedPosition.node, renderedPosition.offset)
        },
      }
    }

    return {
      token: cloneBreakToken(breakToken, sourcePosition.node, sourcePosition.offset),
      apply() {},
    }
  }

  window.PaginationRules = { ...window.PaginationRules, KeepHyphenatedWordTogether: { compute } }
})()
