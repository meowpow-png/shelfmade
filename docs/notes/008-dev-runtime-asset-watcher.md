# Note: dev runtime asset watcher

## Context

Found this while styling the editor's chapter title: a padding edit to the editor's stylesheet never showed up in the browser. That led to looking at how the dev server serves runtime assets, and from there into how far "hot reload" actually reaches in the current setup.

## Observations

Diffing the served stylesheet against the one on disk confirmed the browser was getting a stale, pre-edit copy. The static-asset route resolves its base directory from the compiled server's own location, which always points at the last build's output. Client script does not have this problem, since it goes through the dev server's live module graph; a plain stylesheet file bypasses that graph and is served raw, frozen at build time.

Mapping out what a full fix would take surfaced two more things. The live preview already remounts on its own, but only in response to the editor's own save flow, not an arbitrary file change. And the server-side rendering engine runs as plain Node code outside the module graph entirely, so editing it needs a process restart.

Also found, unrelated: editing a chapter's content file outside the editor updates the live preview (it participates in the module graph via a glob import) but not the open editor pane, which renders from data injected once at page load and deliberately keeps its own state across remounts. Noted as a known gap, not addressed here.

## Analysis

Three options for the staleness fix:

1. Point the static-asset route at live source instead of build output, like client script already does. Rejected: needs a reliable "running from source vs. installed" check that must fail safe toward the build-output behavior, since that's correct for real consumers. Getting it wrong risks serving the wrong assets to someone else's project.
2. A small watcher that copies the same directories the build step already copies, running alongside the dev server. Chosen. Lives entirely at the script level, so it can't add code that ships differently for real consumers.
3. Go further and remove the staleness at the source: load the engine through the dev server's live-reload mechanism instead of a plain import, and route the stylesheet through the same live path client script uses. Would also close the engine's restart-to-see-changes gap. Set aside: the preview runs in its own isolated document specifically so a book's stylesheet can't leak into the editor chrome, and the pagination library can't tolerate two of its instances in one document, which already caused a real crash once. Wiring a live-update channel into that isolated document risks reopening either. Worth revisiting once there's a strong enough reason, and only with both the leak and the crash backed by test cases first, not re-verified by eye.

Implementing the watcher was mechanical, with one correction caught by running it rather than assuming: I reached for a flag to make one process kill the other on failure, assuming it worked like a similarly-named flag on a different tool. The tool rejected it outright. Its default behavior already does this without any flag; a separate flag exists only to turn that default off.

Verified directly: started the dev session, edited the stylesheet, confirmed the edit landed in the build output within about a second.

## Conclusions

**Confirmed root cause:** the static-asset route resolves from the running server's compiled location, always pointing at the last build, not live source. Only affects developing the project against its own sample book; real consumers have no source directory to go stale against.

**Fix shipped:** a watcher, run alongside the dev server, mirrors the same directories the build step copies. Verified by a real edit propagating within about a second.

**Correction caught by running the fix:** the expected "kill everything on failure" flag doesn't exist on this tool; its default behavior already provides that without one.

**Set aside, with a reason to revisit:** routing the stylesheet and engine through the dev server's own live-reload mechanism is the better long-term shape, but stays set aside until there's a strong enough reason to risk the preview's document isolation again, and only with the CSS-leak and pagination-crash protections backed by tests first.

**Unrelated gap found, not fixed:** editing chapter content outside the editor updates the preview but not the open editor pane, risking a silent overwrite on the pane's next save.
