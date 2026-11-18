# Note: Mount pipeline blank page race

## Context

I'd previously confirmed a bug in the live book preview under shelfmade dev: loading a book page right as Vite's dependency optimizer reloaded on a cold start sometimes left the page blank. The DOM showed only pagedjs's default empty page scaffold, and the ready flag the preview sets still flipped to true, so nothing in the app itself reported an error. At that point I only had one confirmed trigger, the cold-start optimizer reload, and a guess that a second one existed: dev server logs had shown a Fast Refresh incompatibility warning on the module that resolves a book in the browser, which could be forcing a full reload on ordinary content edits too. I wanted to find out whether that second trigger was real, whether there were others, and most importantly what was actually happening inside the mount code that let content get lost in the first place.

## Observations

Reload-spamming the page, even right after restarting the dev server fresh, stopped reproducing the bug once I had logging and debugger traps in place. It turned out I had multiple browser tabs open on the same page, which was a confound in earlier manual testing. With a single tab, dozens of reloads produced no blank page at all.

Editing the sample book's first chapter repeatedly did reproduce it, reliably. Each save logged the exact Fast Refresh incompatibility warning I'd suspected, for the module that resolves a book in the browser:

```
[vite] invalidate .../resolve-book.tsx: Could not Fast Refresh ("resolveBookInBrowser" export is incompatible)
```

I instrumented the mount function with two debugger statements: one that fires if a second mount call starts while an earlier one is still running, and one that fires right before the rendered pages get swapped into the page if the pagedjs output has no text content. During one of the content edits, the second trap fired. The log line printed immediately before it showed the mount call had started with no other mount in flight. So this was a single, non-overlapping call that still produced empty output.

While paused at that trap I inspected the relevant values directly in the console. The offscreen scratch element that React had rendered the book's app component into had the full chapter text, headings, and images in its HTML. The resolved book object and its app component looked completely normal. But the document fragment that gets built by cloning the scratch element's children, the one that's handed to pagedjs, was empty.

## Analysis

The mount function renders the book's app component into an offscreen container, waits one animation frame, waits for any images to finish decoding, and only then clones the offscreen container's children into a fragment to feed into pagedjs. That single animation frame wait was standing in for "React has committed this render to the DOM." It is not a reliable signal for that. React's createRoot API can defer a commit past a single frame under extra work, and editing the content module triggers exactly that kind of extra work: the Fast Refresh fallback forces the resolver module to be swapped and re-executed, which adds work on the same event loop turn as the render.

Most of the time that extra work finishes quickly enough that the commit still lands within the one frame budget, which is why the bug was intermittent rather than constant. When it doesn't finish in time, the clone step runs against a still-empty scratch container, and pagedjs faithfully turns that empty input into its own default blank page markup. The ready flag being set true afterward isn't a bug in itself, it's just reporting that the pipeline finished, which it did, just with nothing in it.

This also explains why the original cold-start optimizer reload and the later reload-spam findings looked like separate bugs but weren't. They're different sources of the same kind of delay: anything that adds enough extra work between the render call and the animation frame callback can push the real commit past that one-frame window. The concurrency theory I'd been testing for, two mount calls overlapping and corrupting shared state, turned out not to be what was happening here. The trap for that case never fired on any of the many reload and edit cycles that did reproduce the blank page.

## Conclusions

Confirmed: the root cause is that the mount pipeline used a single requestAnimationFrame as a proxy for React's render having committed to the DOM, and cloned the render target's children immediately after. Under extra work on the same turn, most reliably triggered by editing a module that can't Fast Refresh and falls back to a forced reload of the component tree, the clone can run before the commit lands, producing an empty fragment that pagedjs turns into a blank page.

Ruled out: overlapping or re-entrant mount calls corrupting shared state. The animation frame wait was removed and replaced with flushSync wrapping the render call, which forces the commit to happen synchronously before the render call returns. The now-unused animation frame helper and the debugging instrumentation were removed afterward.

I verified the fix by repeating all three reproduction paths that had previously triggered the bug: consecutive content edits, adding and removing content, and reload-spamming the page. None of them produced a blank page afterward.

The useful general lesson here is that when a timing-dependent bug like this shows up again anywhere in this mount pipeline, the first thing to check is whether a fixed wait, a single frame, a timeout, anything like that, is being used as a stand in for a real completion signal, rather than assuming the trigger that happened to surface the bug is itself the root cause.
