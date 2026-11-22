# Note: firefox rAF throttling pagination stall

## Context

Note 005 shipped a two-frame architecture for the editor's live preview: a hidden compute frame runs pagedjs's manual pagination pass, and a separate display frame shows the result. That note left one open item: Chrome loaded the preview in about a second, but Firefox took roughly seven to ten seconds for the same load, with no investigation beyond noting it as speculation. This session picked that open item back up.

## Observations

A headless Firefox instance launched through Playwright loaded the same editor page in about 1.2 seconds, no stall at all. A real, windowed Firefox on the user's machine consistently showed a stall of eight to ten seconds, with the preview iframe sitting blank the whole time. This sandbox has no display server, so a real windowed Firefox could not be run here directly, only the headless build.

That split was itself informative: whatever was happening did not reproduce under headless Firefox, only under a real windowed one.

## Analysis

Following the house convention of instrumenting a suspect with a synchronous trap rather than reading vendor source, I patched the compute frame's `requestAnimationFrame` to log the time delta between successive calls, then had the user reload the page in their real Firefox. The console output showed a repeating pattern: two calls roughly five milliseconds apart, then a gap of about a second, repeating around nine times:

```text
delta 478.0
delta 1005.0
delta 4.0
delta 998.0
delta 6.0
delta 998.0
...
```

Nine gaps of roughly a second each lines up almost exactly with the eight to ten second stall the user saw. That confirmed Firefox was throttling the compute frame's animation frames to roughly once per second, and pagedjs's manual pagination loop burns one frame per step, so each step cost a full second instead of a normal frame's worth of time.

I removed the delta trap and replaced it with a plain elapsed-time log around the actual pagination call, giving a baseline of 8554ms in real Firefox, then tried four candidate fixes against that baseline:

```text
1. raise compute frame opacity from 0 to 0.01        -> no change
2. give the compute frame real pixel dimensions      -> no change
3. move the frame off-screen instead of opacity:0    -> no change (8520ms)
4. override requestAnimationFrame with setTimeout     -> 86ms
```

Note 005's own fix for an earlier instance of this same throttling class was to keep the frame on-screen at one pixel by one pixel and hide it with opacity rather than visibility or off-screen positioning. That was apparently sufficient in the browser conditions tested at the time, but none of the three variations on hiding technique (opacity level, size, position) made any difference here. Only bypassing rAF entirely did.

## Conclusions

Root cause confirmed: Firefox throttles `requestAnimationFrame` to roughly once per second for this hidden compute frame, independent of how the frame is hidden. Opacity, size, and position were all ruled out as levers that could avoid it.

The fix overrides `requestAnimationFrame` with `setTimeout` inside the document rendering function, but only for the manual-pagination case:

```text
src/engine/document.ts
```

The override is gated on the same flag that already distinguishes the compute frame from every other use of that function, rather than on whether scripts are included at all. The first version of the fix used the wrong gate and would have also disabled real frame timing on the static build and PDF export path, which still needs genuine `requestAnimationFrame` timing for pagination accuracy. That was caught before shipping, not after.

A regression test locks in the scoping:

```text
tests/render-document-raf-override.spec.ts
```

It asserts the override appears only when the manual-pagination flag is set, never appears on the default (static build and PDF) path, and never appears on the scriptless display frame. I confirmed the test is not vacuous by temporarily widening the gate back to the incorrect condition and watching it fail.

The headless-versus-headed split also ruled something out along the way: this was never a Chrome-versus-Firefox engine difference in how pagedjs runs, since headless Firefox did not throttle at all. The throttling is tied to real page visibility or focus heuristics that headless mode does not emulate, which is why only a real windowed browser could reproduce it.
