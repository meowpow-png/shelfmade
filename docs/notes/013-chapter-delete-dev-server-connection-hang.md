# Note: Chapter-delete dev server connection hang

## Context

The chapter row delete spec failed intermittently with a thirty second timeout, always inside the fixture that waits for a freshly opened book's root element to become visible. It only showed up under the full book integration suite, never when running that one spec file alone. I needed to find out whether this was a real defect in the delete feature or something environmental about how the tests interact with each other.

The failure always landed right after a test that deliberately holds a delete request open before letting it resolve, immediately followed by a test that navigates to a different book. I confirmed the pairing had to happen back to back, inside the same spec file, under the full suite, for it to show up at all.

## Observations

An early attempt to narrow this down by skipping one test looked promising after a couple of clean runs, but turned out to be a false positive from too small a sample. A fix I tried based on that lead, waiting for the held request to resolve before letting the next test navigate, changed nothing, since the file writes behind that request already complete before its response goes out, leaving nothing in flight for that wait to protect.

Turning on trace recording made the hang stop reproducing entirely, three clean runs in a row. Trace recording adds screenshots, DOM snapshots, and network recording around every action, and that overhead was enough to widen whatever timing window the bug needed. This ruled out the trace recorder as a diagnostic tool here, so I reached for lighter, synchronous instrumentation instead: console markers, file-appended logs, and Playwright's own event listeners.

Several rounds of that instrumentation worked outward from the application code and ruled out:

- Server-side SSR reloading, the three routes that serve the book document, and the pagination library's own preview call, all of which completed in well under a second during a reproduced hang
- The client-side page mount code, since markers I placed at every await boundary never fired during the hang, meaning that code never started running at all
- A malformed document: the HTML actually served for the stalled request was byte-structurally normal
- A query parameter the dev server appends to force a fresh fetch after a hot reload, which looked like a possible tell since it seemed to be missing from the stalled request, but turned out to vary on ordinary successful loads too and carried no real signal

Watching the browser's own request and response events during a reproduction surfaced the real shape of the problem. One small file in the client sources does an eager glob import across every sample book's content, purely so that editing any chapter triggers hot reload at all. That import keeps all three sample books live in the dev server's module graph, not just whichever one is currently open, so any edit anywhere causes a fan-out refetch of everything.

In the brief window where one test's held delete request finally resolves and the next test begins, this fan-out fires twenty or more requests at once to the same origin. One of them, for the exact chapter file the previous test had just deleted, failed with a cancelled-by-navigation error. Immediately after, the next test's own page navigation request was never even sent. The server never saw it.

I then added socket-level connection counting and a request log at the very first server middleware. This confirmed the new page's own document request, when it did arrive, was answered in under ten milliseconds every time. But one sibling connection opened as part of the same refetch burst never had any request logged on it at all, and was never closed by anything except Playwright's own test timeout forcibly tearing down the page.

## Analysis

I ran two toggle experiments to isolate the trigger:

- **Kill the whole burst.** Disabling the eager glob import entirely stopped the hang in three clean runs, but broke six unrelated tests that depend on that same all-books tracking for real functionality. Confirms the burst itself was involved, but it is too blunt a target to fix directly.
- **Remove just the abort.** Emitting the watcher's own unlink event synchronously, immediately after deleting the file on disk, instead of waiting for the filesystem watcher to notice asynchronously later. This front-runs that one file's hot reload invalidation so it finishes inside the delete request's own handling, before the next test's navigation has a chance to start. Four full suite runs with this change showed no hang and no broken tests, and measuring every connection's lifetime directly found the longest at just over a second, with nothing left open past that.

This explains the trigger precisely: the deleted chapter's own refetch, caught mid-flight by the next test's navigation, is what starts the failure. It does not explain why that specific abort leaves a different, unrelated connection from the same burst stuck open rather than cleanly failing or timing out on its own. I considered two candidate explanations but did not settle on either:

- A per-origin connection limit in the browser
- The dev server holding something open past the abort internally

Settling which of those it actually is would need serving over a different protocol or disabling connection keep-alive as further probes. I deliberately did not run either, since the practical trigger was already isolated and fixable without knowing the deeper mechanism.

Later, I checked one remaining risk directly: since the synthetic emit only runs ahead of the filesystem watcher's own detection, that real detection still arrives on its own moments later for the same file. Watching for it, I confirmed it does sometimes fire a second time for the same path, but it produces no second visible effect. The client log showed exactly one page reload message per deleted file even when the server-side log showed the event firing twice, meaning the second pass found nothing left to invalidate and did nothing.

I also considered extending the same synchronous emit to the other routes that write chapter files: saving, renaming, reordering, and creating. All of them go through the same watcher, so the same kind of race is structurally possible there too, but I kept the fix scoped to deletion only:

- Saving, renaming, and reordering fire a change event rather than an unlink. A change event causes the dev server to recompute and push a full update, not just prune a removed module, so firing it early and then again from the real filesystem event would likely double that update. Each one retriggers a full repagination of the whole book in the live preview, a cost already expensive enough on its own.
- Creating a chapter fires an add event, which the same eager glob import typically handles with a full page reload rather than a targeted update. Double firing that risks two reloads landing close together, which looks like a different shape of the exact bug just fixed rather than a safe precaution.
- None of the four other routes had ever actually shown this hang, and the same runs I used to check the duplicate-processing question also showed no connection left dangling on any of them. That is weak evidence at best, since none of those routes gets exercised back to back with a cross-book navigation the way the delete spec does, so it does not rule out a dormant version of the same race. It was not strong enough on its own to justify copying the fix forward, but combined with the mechanistic risk above it was enough to leave the other routes alone.

## Conclusions

Confirmed: the trigger is the deleted chapter's own hot-reload refetch being cancelled by the next test's page navigation while still in flight. Preventing that one refetch from ever racing navigation, by handling the file's invalidation synchronously inside the delete request instead of waiting on the filesystem watcher, removes the hang. I reran the full suite ten more times afterward, plus five on the other supported browser engine which I had not exercised during the investigation, and all passed cleanly.

Ruled out: any defect in server-side rendering, the document-serving routes, the pagination library itself, or the delete feature's own application code. I directly instrumented and exonerated all of these during a live reproduction.

Confirmed safe: the filesystem watcher's own real event for the same deleted file still arrives later and sometimes fires a second time, but the dev server's own invalidation logic is already idempotent against that. I observed this directly, with no duplicate client effect and no errors.

Still open: why the aborted refetch specifically leaves a different, unrelated connection from the same burst stuck open, rather than that connection failing or recovering on its own. I found and used a reliable causal lever without needing to resolve this.

The fix itself is small:

```ts
unlinkSync(chapter.path)
// Front-run chokidar's async pickup so HMR invalidation can't race a later navigation
server.watcher.emit('unlink', chapter.path)
```

Lessons worth keeping:

- **General:** when a timing bug disappears under trace recording or any other heavy instrumentation, that disappearance is itself a clue that the window is narrow. The right response is lighter synchronous instrumentation, not giving up on reproducing it.
- **Specific to this codebase:** the sample books all share one dev server module graph through a single eager glob import, so any file edit during tests causes a refetch burst across all of them, not just the book being edited. Worth remembering before chasing unrelated-looking request activity in a future investigation.
- **Scope discipline:** the same fix pattern used here should not be copied onto the other chapter-mutating routes without a concrete reproduction first. The event each of them fires behaves differently enough from a plain deletion that the same change is as likely to introduce a new race as to prevent one.
