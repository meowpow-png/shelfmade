# Note: Example book order-field drift

## Context

While writing chapter-reorder and chapter-deletion tests, I needed a sandbox with a specific order state, including chapters without an order field yet, to exercise the backfill and filename-sort fallback paths. I expected the example book, and therefore any sandbox copied from it, to be in a known state I could rely on.

## Observations

The sandbox helper copies the example book's content directory as is, so a sandbox only ever starts in whatever state is currently checked in. Checking that state, every chapter in the example book already carries an order field. That field was added in one commit:

```text
0411229 Order example book chapters
```

That commit is dated two days before the dev-server verification step recorded for the chapter-nav collapse toggle work, so that specific session isn't what caused it.

## Analysis

The order backfill writes a missing order field to disk the first time the dev server loads a chapter that doesn't have one yet, so the filename-sort fallback stays a one-time migration instead of permanent coexisting logic. Running the dev server directly against the example book, rather than against a sandbox, triggers that backfill against the checked-in fixture itself. Some such run happened before the commit above. Which one isn't established, and I can't point to a specific session that caused it.

## Conclusions

Confirmed: the example book is not a stable order-less fixture, and a sandbox copied from it is only as order-less as whatever happens to be checked in at the time.

Confirmed: the order backfill mechanism is capable of producing exactly this kind of diff, an eager disk write triggered the first time a chapter without an order field is loaded.

Ruled out: randomness in the sandbox copy itself, the copy is a plain deterministic file copy. Also ruled out: the collapse-toggle verification session recorded in the chapter-nav work, since it's dated after this commit.

Not established: which dev-server session produced the commit, or whether it ran against the example book directly versus some other path that also reaches the backfill.

Tests that need a specific order state, ordered, order-less, or filename-ordered, have to set that state up explicitly inside the sandbox rather than relying on the example book's current content.
