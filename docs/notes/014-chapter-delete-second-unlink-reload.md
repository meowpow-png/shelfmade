# Note: Chapter delete second unlink reload

## Context

I was following up on a report that deleting a chapter in the editor visually looked like a page reload, with a flicker and a layout shift. This touches the same chapter delete code path that note 013 investigated and fixed a dev server connection hang in. I needed to find out whether the flicker was an actual browser reload or just something that looked like one, since going in I assumed it might just be a visual side effect of a legitimate partial update.

## Observations

- A trap on the dev server's own hot update channel, logging a stack trace whenever a full reload message was about to be sent, confirmed this is a genuine full browser reload, not an illusion. The browser console showed a fresh connecting and connected pair right as the flicker happened, which only prints on a real reload.
- The same trap, run against a plain API call with no browser ever having opened the editor, produced nothing at all on either create or delete. Warming up the module graph first, by actually loading the editor in a browser before triggering a delete, turned out to be necessary before either signal meant anything.
- With the module graph warmed up, a single delete produced two separate raw unlink events on the server side, about a hundred milliseconds apart. The first resolved cleanly with a hot update to the page's own module. The second, slightly later one, produced the full reload.
- Creating a chapter through the editor's add-chapter button never produced a full reload in this setup, confirmed independently on two different machines. Note 013 had assumed, without directly testing it, that chapter creation typically forced a reload through the same glob mechanism as deletion.

## Analysis

Note 013 added a line that fires unlink synchronously right after deleting a chapter's file, specifically to make the filesystem watcher's own, later detection of the same deletion happen too late to race a subsequent navigation. That note checked for a second visible effect from the real, later unlink and found none, concluding the two were effectively idempotent.

They are not. The early, synthetic unlink does succeed cleanly, propagating through the self accepting module that the chapter content lives behind.

But resolving that update changes some state in the dev server's module graph. By the time the real unlink arrives on its own, slightly later, that changed state is enough to make the update mechanism decide it can no longer patch things safely, so it falls back to a full reload instead.

I first tried removing the early notification's effect on that reload decision entirely, keeping only the part that updates the module graph without broadcasting anything to the browser. That stopped the reload, but it reopened exactly the hang that note 013 had fixed, because the early broadcast was also what made the browser's resulting refetch of chapter data happen early enough to finish before a subsequent navigation could race it.

The two bugs turned out to be fixed by the same mechanism working correctly, not by two independent mechanisms that could be pulled apart that simply.

The fix that actually worked keeps the early synthetic unlink exactly as note 013 left it, so the hang stays fixed. It adds a short lived record of chapter paths that have just been handled this way, and swallows the filesystem watcher's own real unlink for any path already in that record before it ever reaches the dev server's internal handling of that event.

The existing delete tests in the editor suite all passed both before and after this fix, which was itself a finding worth keeping. They only check the eventual state after a delete, such as which row disappears and which chapter becomes selected, and a full reload arrives at that exact same correct end state, just more disruptively along the way. None of them would ever have caught this regressing.

## Conclusions

Confirmed: deleting a chapter fires two separate unlink events against the filesystem watcher, about a hundred milliseconds apart, and the two are not idempotent. The first resolves cleanly. The second, arriving after the first has already changed the module graph's state, is what forces the full page reload.

Ruled out:

- Note 013's conclusion that firing the unlink event twice had no second visible effect. That was true for the specific hang it was checking for, but not for every effect of firing the event twice.
- Chapter creation forcing a full reload through the same glob mechanism, which note 013 had assumed rather than directly tested.

Fix: kept note 013's early synthetic unlink in place, since it is still what prevents the original connection hang, and added a short lived suppression so the filesystem watcher's own later detection of the same deletion is swallowed instead of reaching the dev server's internal handling a second time:

```ts
const suppressedUnlinks = new WeakMap<ViteDevServer, Set<string>>()

function installUnlinkSuppression(server: ViteDevServer) {
  const suppressed = new Set<string>()
  suppressedUnlinks.set(server, suppressed)
  const realEmit = server.watcher.emit.bind(server.watcher)
  server.watcher.emit = ((event: string, ...args: unknown[]) => {
    if (event === 'unlink' && suppressed.delete(args[0] as string)) return true
    return realEmit(event, ...args)
  }) as typeof server.watcher.emit
}
```

Added a regression test that sets a marker in the page's own JavaScript state before deleting a chapter, then asserts it survived shortly after the delete completes. A real reload wipes that state the same way it would wipe anything else the browser was holding; a clean update does not.
