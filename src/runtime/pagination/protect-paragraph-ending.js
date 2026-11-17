;(function () {
  const MAX_SHORT_WORD_LENGTH = 3
  const WORD = /[\p{L}\p{M}\p{N}]+(?:[\u00ad\-'\u2019\u2010\u2011][\p{L}\p{M}\p{N}]+)*/gu

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

  function wordsIn(element) {
    return [...element.textContent.matchAll(WORD)]
  }

  function bindShortLastWord(paragraph, words) {
    const lastWord = words.at(-1)
    const previousWord = words.at(-2)
    if (!lastWord || !previousWord) return

    const wordLength = [...lastWord[0]].filter((character) =>
      /[\p{L}\p{N}]/u.test(character),
    ).length
    if (wordLength > MAX_SHORT_WORD_LENGTH) return

    const separatorStart = previousWord.index + previousWord[0].length
    const separator = paragraph.textContent.slice(separatorStart, lastWord.index)
    const trailingWhitespace = separator.match(/\s+$/u)
    if (!trailingWhitespace) return

    const whitespaceStart = lastWord.index - trailingWhitespace[0].length
    const start = textPositionAt(paragraph, whitespaceStart)
    const end = textPositionAt(paragraph, lastWord.index)
    if (!start || !end) return

    const range = document.createRange()
    range.setStart(start.node, start.offset)
    range.setEnd(end.node, end.offset)
    if (range.cloneContents().querySelector('br')) return

    range.deleteContents()
    range.insertNode(document.createTextNode('\u00a0'))
  }

  function keepLastWordIntact(paragraph) {
    const lastWord = wordsIn(paragraph).at(-1)
    if (!lastWord) return

    const start = textPositionAt(paragraph, lastWord.index)
    const end = textPositionAt(paragraph, lastWord.index + lastWord[0].length)
    if (!start || !end) return

    const range = document.createRange()
    range.setStart(start.node, start.offset)
    range.setEnd(end.node, end.offset)

    const wrapper = document.createElement('span')
    wrapper.className = 'pagination-intact-ending'
    wrapper.append(range.extractContents())
    range.insertNode(wrapper)
  }

  class ProtectParagraphEnding extends window.Paged.Handler {
    afterParsed(content) {
      for (const paragraph of content.querySelectorAll('p')) {
        const words = wordsIn(paragraph)
        bindShortLastWord(paragraph, words)
        keepLastWordIntact(paragraph)
      }
    }
  }

  window.PaginationRules = { ...window.PaginationRules, ProtectParagraphEnding }
})()
