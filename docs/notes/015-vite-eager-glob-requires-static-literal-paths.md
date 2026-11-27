# Note: Vite eager glob requires static literal paths

## Context

While following up on the chapter-delete connection hang from note 013, I looked at whether the glob import behind it could be scoped down. It eagerly imports every book's MDX content, so an edit in any one book retriggers hot reload for all of them, not just the one open in the editor. This isn't a quirk of the sample project either: a real multi-book project edits content that genuinely lives under a separate folder per book, so a real editing session refetches unrelated books on every edit. I wanted to know whether scoping that glob to just the currently open book was a reasonable thing to build.

## Observations

The obvious fix looked like a one-line change: filter the glob pattern down to the open book's slug. That didn't work, because the slug is only known at runtime, and Vite requires glob patterns to be static string literals it can analyze at transform time. A runtime value can't be interpolated into the pattern directly.

Two real alternatives did exist:

1. Drop the eager flag and manually call the returned import function only for paths matching the open book's slug, at module load time.
2. Write a small Vite plugin that synthesizes a per-book virtual module on demand, with a literal eager glob scoped to that one book baked into its generated source, the same hook pattern already used elsewhere in this project for serving book stylesheets.

I checked whether the slug being set at runtime could itself be a blocker, since the slug comes from a global set by an inline script in the page. It isn't: that inline script runs and blocks before the module script that needs the slug ever loads, so the value is reliably available in time for either alternative.

## Analysis

The first alternative looked simpler, so I examined it more closely before deciding. It rests on an assumption I couldn't verify: that manually calling a lazy glob's import function makes Vite track that file as a real hot-reload dependency going forward, the same as an eager import would.

There's a structural difference that matters more than that assumption, though. An eager import blocks module evaluation until every matched file has loaded. A manual call to the lazy version is asynchronous, which opens a gap between when the module starts evaluating and when that import actually resolves. An edit landing in that gap could go untracked.

That gap is the same category of problem as the one that caused the chapter-delete connection hang in the first place: a narrow window where a file event and a module's readiness to react to it aren't properly ordered. Reopening a version of that problem, in the same code path that just took real investigation effort to stabilize, is a bad trade for a dev-mode efficiency improvement that has no correctness benefit.

The second alternative avoids that specific risk, since it keeps the eager, blocking-until-loaded semantics of the glob, just scoped to one book instead of all of them. But it adds a new, permanent piece of build-time machinery for a benefit that is small next to the actual dominant cost in this editing flow, which is a full repagination of the whole book on every edit, measured separately at close to five seconds for a decent-sized book. Shrinking a glob refetch from several books to one is invisible next to that.

## Conclusions

Confirmed: Vite's glob import only accepts static string literal patterns, so a pattern can't be narrowed using a value only known at runtime, like an open book's slug. Any attempt to scope it dynamically has to go around that constraint rather than through it, either by giving up the eager loading guarantee or by generating the literal pattern at build time instead of reading it at runtime.

Ruled out: the straightforward-looking fix of just filtering the existing glob call. It isn't available as written, and the workaround that gets closest to it (a lazy glob with a manual import call) trades away the one property, synchronous-before-use loading, that matters most in a code path that has already been the site of a hard-to-reproduce timing bug.

Key insight worth keeping: when a timing-sensitive bug has just been closed in some code path, treat any further change to that same path as carrying a multiplier on its usual risk, even when the change looks unrelated to the original bug. An async gap that would be an acceptable tradeoff anywhere else in the codebase isn't automatically acceptable here, because the failure mode it reopens is the exact one that was expensive to find the first time.

Worth flagging on its own: this proposal is not what fixed the chapter-delete connection hang from note 013. That hang's actual fix is the synchronous watcher emit added inside the delete route itself. Scoping this glob down would only have reduced how often the hang's trigger condition occurs, in a system where the race is already closed another way. The two should not be conflated, since doing so risks crediting the wrong change for that fix.

Revisit this decision if the refetch burst is ever shown to cause a real, concrete problem on its own, not just that it looks excessive, or if a future redesign of per-chapter pagination caching ends up touching this same glob anyway, which could make scoping it trivial as a side effect.
