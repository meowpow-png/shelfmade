# Note: Dev-Preview Truncation from a Hidden Staging Container Leak

## Context

After migrating the live book preview to a double-buffered remount (render off-screen, paginate, swap into the visible container), chapter 1 of the sample book truncated mid-sentence at the end of page 2 in dev mode, with page 3 rendering completely empty and page 4 resuming cleanly at the next chapter. The static build never showed this, only the dev-mode preview path.

## Observations

The user caught it via devtools: the missing content was actually present in the DOM, but floated and relocated while scrolling, effectively invisible. Plain text-content checks on the page all reported the content as present, which is why earlier automated checks found nothing wrong. A visual/devtools check and a DOM-content check were catching different aspects of the same bug.

## Analysis

First theory: a page-count CSS custom property set by the pagination engine's chunker fires an early, intermediate value before pagination truly finishes, so the one-time snapshot swap could be capturing an incomplete page set. Dead end: that variable defaults to zero, so a wait condition keyed on it resolves instantly regardless of real progress. Polling the actual rendered page count over time instead showed the real swap is atomic and correct on fresh loads, ruling this out.

Checking the static build directly (loaded headless, waiting on its own ready signal) showed the chapter flowing correctly past the same content point, confirming the bug was specific to the dev-mode double-buffer path, not the pagination rule scripts or chunking logic itself.

Root cause: the dev-mode mount code passed its own hidden staging container, itself styled off-screen and invisible, as the content root into the pagination engine:

```js
// before
previewer.preview(scratch, ...)   // scratch: position: fixed; visibility: hidden
```

The engine's ancestor-rebuilding step walks every real DOM ancestor of a node when reconstructing a page's wrapper chain, with no concept of where the intended content root stops. It eventually reached and cloned the staging container, injecting its off-screen and hidden style straight into the next page's content. The content was genuinely in the DOM, just invisible and mispositioned. The static build never hits this because its content root is a template-content document fragment, which has no parent node, stopping the ancestor walk immediately.

## Conclusions

**Fix:** build a plain document fragment from deep clones of the staging container's children and hand that fragment to the pagination engine instead of the container itself, mirroring the static build's own pattern:

```js
// after
const fragment = document.createDocumentFragment()
fragment.append(...[...scratch.children].map((el) => el.cloneNode(true)))
previewer.preview(fragment, ...)
```

Verified across multiple browsers and incognito or cache-cleared sessions: all pages render in normal flow, with no blank or truncated pages.

**Confirmed:** the bug applies to any content root passed to the pagination engine that itself has a real parent chain carrying positioning or visibility styles; the engine clones those styles into whatever page the ancestor walk reaches. Any future off-screen staging container used with this engine needs to be a parentless fragment, not a styled element still attached to the document.

**Two secondary fixes landed in the same change, not root causes on their own:**

1. Image decoding is now awaited before handing content to the pagination engine, so it never measures against unloaded images. Hardening, not confirmed to have caused any observed symptom.
2. The stylesheet cache was moved from a plain module-scope variable to one that persists across hot-reload updates, since module scope resets on every accepted update. Without this, a remount re-ran the style-stripping step and got an empty result back, which was a confirmed real crash before the fix.

**Related, verification incomplete:** a resize-observer leak was also found and patched (old pagination instances' per-page observers fired on now-detached DOM after a remount, throwing uncaught errors) by disconnecting them before swapping in new pages. This fix's correctness was never cleanly confirmed: automated retests showed a stuck single-page result after hot-reload remounts, but this coincided with the dev server's own dependency-optimizer reload firing at the same moment as the test's file touch, and disabling the fix reproduced the same broken result, pointing at a test-harness race rather than the fix itself. Treat as applied but not rigorously verified.
