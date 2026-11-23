# Note: Vite full reload on reused chapter path

## Context

I was chasing a second bug in the same add-chapter flow: deleting a chapter file directly on disk, then creating a new chapter in the visual editor, forced a full page reload instead of the usual hot update. The count of forced reloads on later clicks exactly matched the count of chapters deleted since the last time things were settled, one reload consumed per subsequent creation, which ruled out a one-time fluke from the start.

## Observations

- The browser console showed nothing but a fresh connecting/connected pair, no visible reload message at all, since a real page reload tears down the JS context that would have logged anything just before it.
- A trap on location.reload, location.assign, and location.replace failed outright with a non-configurable property error. These are spec-unforgeable on Location objects, by design, so no browser will ever let application code override them.
- A beforeunload listener needed no patching and caught the real event, giving a synchronous call stack ending in Vite's own client code, specifically its debounced reload handler reacting to a WebSocket message, not anything in our own application code.
- An earlier console read also surfaced a misleading line about the dev server's connection being lost and polling for a restart. This turned out to be leftover noise from an unrelated earlier session in the same browser tab, not part of this repro; the server process's own PID stayed constant throughout with no crash in its log.
- The real evidence came from the dev server's own terminal output, not the browser: a line reading page reload, naming the exact chapter file that had just been deleted and recreated under the same filename.
- This reproduced 4 for 4 across a clean test: three separately deleted-then-recreated filenames each independently produced their own named full reload, while a brand-new filename that had never existed before only produced a normal hot update.

## Analysis

The chapter nav's content directory is kept in Vite's module graph by one small file whose only job is an eager glob import of every chapter file, purely as a side effect so that ordinary chapter edits trigger HMR at all. Vite compiles an eager glob into a fixed, static list of imports generated from whatever files match the pattern at transform time. When a file disappears and a different file later reappears at that exact same path, regenerating that import list isn't something ESM hot-swapping can apply in place, so Vite's own fallback for that specific case is a full reload scoped to that one file rather than a hot update.

Chapter creation picked its next filename purely from a fresh disk scan, taking one more than the highest numbered chapter file currently present. Deleting the highest numbered chapters made that scan's maximum fall back down, so the very next created chapter landed on a filename Vite had already pruned from its graph, triggering exactly this per-file full reload. The staggered pattern falls out naturally: each deleted filename only retriggers the reload the first time something reoccupies it, and chapter creation reoccupies freed numbers one at a time, lowest first.

## Conclusions

Confirmed: the mechanism is Vite's own eager glob import requiring a full reload specifically when a previously known, since removed file path reappears, verified directly from the dev server's own log line naming the exact file and reproduced cleanly across both the reused and the brand-new case.

Ruled out: a crashed or restarted dev server process, and the possibility that Vite logs its reload decision anywhere in the browser console under any circumstance.

Fix: stopped deriving the next chapter filename purely from a live disk scan. Added an in-memory, per-content-directory record of the highest index ever handed out during the life of the running dev server process:

```ts
// before
function nextChapterIndex(contentDir: string): number {
  const indices = /* ...scan disk... */
  return indices.length > 0 ? Math.max(...indices) + 1 : 1
}

// after
const chapterIndexHighWaterMarks = new Map<string, number>()

function nextChapterIndex(contentDir: string): number {
  const indices = /* ...scan disk... */
  const diskMax = indices.length > 0 ? Math.max(...indices) : 0
  const next = Math.max(diskMax, chapterIndexHighWaterMarks.get(contentDir) ?? 0) + 1
  chapterIndexHighWaterMarks.set(contentDir, next)
  return next
}
```

This deliberately isn't persisted anywhere, since it only needs to survive as long as Vite's own module graph does, and both reset together on a dev server restart.

The general lesson worth keeping: when a Vite dev server reload has no explanation in the browser console, check the terminal running the server before chasing it through devtools. The narrower lesson specific to this codebase: anywhere a filename or path is both freshly derived from a disk scan and also sitting inside a directory watched by an eager glob import, deleting and then reissuing that same name will trigger this same reload. The fix pattern is to remember issued names in memory rather than re-deriving them purely from whatever currently exists on disk.
