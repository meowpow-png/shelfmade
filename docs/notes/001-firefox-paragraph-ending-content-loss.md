# Note: Firefox Paragraph-Ending Content Loss

## Context

Reported as duplicated or garbled text at a page boundary in the live preview. The real symptom was narrower: the client-side pagination engine silently dropped a paragraph's final word plus trailing punctuation at one specific page break. Reproduced with a stress-test fixture, a run-on sentence engineered to force a page break near the paragraph's end:

```
examples/sample-book/books/field-notes/content/chapter-1.mdx:29
```

## Observations

Content was present at every layer up to the pagination pass: the source document, the raw server-rendered HTML, and the DOM immediately before pagination all had the full text. After pagination, the live DOM was genuinely missing the last word on the affected page; the following page correctly started with the next paragraph. This rules out a parsing, server-rendering, or dev-server race explanation.

The bug was Firefox-only and did not reproduce in Chrome. Since the exported PDF always renders through a Chromium-based pipeline, it was never affected regardless of which browser an author previews in.

## Analysis

Toggling each pagination rule handler off one at a time isolated the cause to the paragraph-ending protection rule: disabling it alone fixed the bug, re-enabling it broke it again. Its CSS was ruled out separately by disabling just that property while keeping the element-wrapping behavior active.

To catch the actual drop, the DOM mutation primitives were monkey-patched for the duration of one pagination pass, logging a stack trace on any mutation touching the affected text:

```
Node.prototype.removeChild
Element.prototype.remove
CharacterData.prototype.remove
Range.prototype.deleteContents
Range.prototype.extractContents
```

A `MutationObserver` was tried first but batches asynchronously and loses the real call stack, worth remembering for similar cases. The patch caught the pagination engine's own overflow-removal step correctly removing the overflowing text from the full page, but never reinstating it on the next one.

Follow-up experiments confirmed this is a precise fit-or-no-fit threshold rather than a general layout failure: the page never visibly overflowed its box, word length and content were irrelevant, and changing the word or the preceding text by a single character flipped the outcome. The trigger is purely whether the computed overflow boundary lands exactly at the start of the wrapping element, not anything about the word itself.

Two CSS-only fixes had no effect, since the pagination engine makes break decisions for inline content at the line level and never consults block fragmentation properties on an inline element:

```
break-before: avoid
display: inline-block
```

A detect-and-recover fix (snapshot the wrapper and trailing content before pagination runs, reinsert it after layout if missing) worked but introduced a widow/orphan violation: the recovered content landed as a lone word starting a new page, since the recovery runs after layout is finalized and can't reflow surrounding pages.

## Conclusions

**Root cause, confirmed:** the pagination engine correctly removes overflow from the current page but fails to produce a resuming break token when the overflow boundary lands exactly at the start of an element rather than mid-text. Ordinary paragraph endings don't hit this because natural break points almost always fall inside a text node; wrapping the last word in its own element is what creates an element-boundary break point in the first place.

**Ruled out:** the pagination engine's infinite-break-loop guard (fires only on whole-page repeats, errors loudly, wrong symptom shape); a stale-range corruption theory involving our own rules racing the engine's overflow removal (DOM range boundaries are spec'd to relocate sensibly on node removal, and a fix for this theory would have broken existing passing tests); and any parsing, server-rendering, or dev-server cause.

**Decision:** given the narrow scope (Firefox preview only, PDF export unaffected, requires an artificially extreme paragraph ending), the detect-and-recover fix was reverted rather than shipped with a new orphan violation. Left root-caused but intentionally unfixed at that point.

**Eventual fix:** replace the wrapping element with word-joiner characters (U+2060) spliced directly into the word's text, suppressing wrap and hyphenation without introducing any element. This removes the bug's precondition entirely rather than working around it.
