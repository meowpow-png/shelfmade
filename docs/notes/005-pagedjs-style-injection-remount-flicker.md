# Note: pagedjs style injection remount flicker

## Context

On content edits in shelfmade dev, the book preview showed a fast three-stage glitch on remount: the page snapped to the bottom-left corner, corrected to centered, then the text updated. It never happened on a fresh load (F5), only on edit-triggered remounts. Nine earlier attempts at fixing this had failed. I wanted to find the actual root cause instead of trying a tenth guess.

Following the house convention for isolating causes, I set up a synchronous trap rather than reaching for logging or reading through pagedjs's source speculatively. I patched the real DOM methods pagedjs would use, so I could catch the call in the act and see the true call stack, not just an async callback's own frame.

## Observations

I patched the DOM methods responsible for inserting a node into the document head, filtered down to catches where the inserted node was a style tag. That isolated the moment precisely.

```text
Node.prototype.appendChild
Node.prototype.insertBefore
target === document.head
node.tagName === "STYLE"
```

Three things about prior mitigation attempts fell into place once I saw the trap fire:

- No MutationObserver on the book root ever caught the glitch, because the thing changing was a new global stylesheet affecting computed style elsewhere, not a mutation to the book root's own subtree.
- The book root's bounding rect never moved. The shift happened to pre-existing content through the cascade, not to the container itself.
- Pre-painting the offscreen render target did nothing, because the bug had nothing to do with the new content's readiness. It was about the old, still-visible content getting restyled out from under itself.

## Analysis

The trap showed that pagedjs's preview method inserts its own generated style tag straight into the live document head as a side effect of pagination, and it does this mid-pass, before the old page's styles are cleaned up or the DOM swap happens. I confirmed the timing by checking pagedjs's own ready flag and the book root's child count at the moment of insertion:

```text
window.PAGED_READY === false
bookRoot.children.length === 1   // still just the old page
```

Because that injected stylesheet is global and unscoped, it recomputes layout on the still-visible old page the instant it lands in the head. That is the glitch: pagedjs's own pagination styles briefly apply to content that hasn't been swapped out yet.

## Conclusions

Root cause confirmed: pagedjs writes its pagination styles into the live document head mid-pass, not into an isolated scope, so they affect whatever is currently on screen before the swap happens.

Fix shipped, in the client's book page component:

```text
src/client/book-page.tsx
```

The entire pagedjs preview pass now runs inside a hidden, isolated iframe, built once and cached across remounts in the dev-server hot module state rather than rebuilt per edit:

```text
hot.data.previewFramePromise
```

The iframe's head mirrors the main document's book stylesheets, the pagedjs polyfill, and all nine of its pagination plugin scripts. pagedjs's injected styles can now only ever land in that frame's own head. At the exact instant of swap, the finished page DOM is moved into the main document with adoptNode, and the frame's generated page-box CSS is explicitly copied into the main document's head alongside it. Both steps are required: copying only the DOM left pages cropped with no padding or footer, since that CSS does not travel with adopted nodes on its own.

Three pitfalls surfaced while building the iframe isolation, worth remembering for similar work:

1. Cloning a script element carries over the spec's "already started" flag if the original already ran once, which was the case here since the main document had already executed each script on page load. The clone then silently never executes and never fires a load or error event, which hangs any code waiting on that event, including a combined wait across all the scripts, forever. The fix is to build a fresh script element and copy its attributes and text by hand instead of cloning:

```text
importNode / cloneNode        // carries over "already started", breaks silently
document.createElement("script")   // fresh element, the fix
```

2. An inline script with no source attribute never fires load or error at all, only external scripts do. A naive loop that waits for every script's load event will hang on these.
3. Browsers throttle requestAnimationFrame in iframes they judge not visible. Both hiding a frame with visibility and positioning it off-screen can each independently trigger this throttling:

```css
visibility: hidden
left: -10000px
```

Since pagedjs's pagination loop runs on requestAnimationFrame, either one caused the preview pass to hang or take around ten seconds instead of resolving quickly. The fix is to keep the frame on-screen at a one pixel by one pixel size and hide it with opacity instead.

This fix is committed, typechecks and lints and builds clean, and is confirmed working against the real dev server: the flicker, the hang, and the cropped-page styling are all gone.
