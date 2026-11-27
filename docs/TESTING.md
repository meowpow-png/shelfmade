# Testing

This document covers project-specific instructions for writing, running, and maintaining tests.

## Test types and when to use them

All tests use Playwright, but they do different jobs:

| Test type                                | What it does                                                               | Use it for                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Unit-style tests**                     | Call the code directly, without starting a browser or server               | Focused engine behavior, including cases that only need an isolated filesystem sandbox |
| **Browser pagination tests**             | Open small HTML/CSS fixtures and check the generated pages                 | Pagination rules and layout regressions                                                |
| **Server-backed book integration tests** | Start Vite with an isolated book sandbox and drive the HTTP or editor flow | Server, file changes, editor interactions, or request handlers                         |

Start with the smallest layer that covers the change: test direct logic directly, reach for a pagination fixture when layout matters, and use a server-backed sandbox only when the running book or editor flow matters.

## Fixtures and sandboxes

Each test area has shared Playwright fixtures that handle its setup. Keep specs focused on the behavior under test: use fixtures to open layout fixtures, wait for pagination, start a test server, navigate the editor, or work with test content. Add shared setup to the relevant fixture rather than repeating it across specs.

Tests that read or write a book must create an isolated book sandbox through the shared sandbox helper. A sandbox is a temporary copy of the example book's source content and configuration, with the local package linked in. It is cleaned up with the fixture after the test or worker finishes.

Never mutate `examples/sample-book`. It is source material for sandboxes and local development, not a test workspace. Make all test-only edits in the sandbox.

Some server and editor fixtures are shared for the lifetime of a worker. If a test changes shared sandbox state, reset the needed baseline before the next test.

## Server-backed book integration tests

Server-backed book tests run only in the dedicated Chromium and Firefox book-integration projects. Each project has one worker, so its server-backed tests run serially instead of competing with one another. The normal browser projects skip these tests and remain fully parallel.

The project configuration explicitly matches the chapter-reorder spec and all editor specs. When adding a server-backed book spec, add it to that matcher so it runs in the book-integration projects rather than the normal browser projects.

One worker per project does not stop the Chromium and Firefox projects from overlapping. Shared server fixtures guard against this with a cross-process **book-integration lock**, taken before creating a sandbox and starting Vite, and released during teardown:

- Retries without blocking the event loop
- Reclaims stale locks from interrupted runs
- Times out rather than waiting forever

## Order-lock behavior

Chapter-order writes use a per-content-directory lock (the **order lock** — distinct from the book-integration lock above). It protects both eager order backfill and runtime reorder requests, so concurrent processes cannot write competing chapter orders.

**When it's taken:**

- Only when needed — fully ordered content skips it, and static builds never backfill or write source files
- Once acquired, the process re-reads the chapters before writing, so it works from the latest state

**Waiting behavior** — preserve these properties when changing any runtime behavior that writes chapter order:

- Cooperative: a blocked caller retries asynchronously, yielding to the event loop between attempts
- Stale locks from interrupted processes are reclaimed
- Acquisition times out rather than hanging forever

**Regression coverage** checks:

- Order assignment and preservation
- No-op reads and writes
- Static-build safety
- Lock-free reads for ordered content
- Event-loop yielding while waiting
- One-writer-at-a-time behavior

Reorder coverage also checks the resulting file changes through the running server.

## Running tests

| Command                                      | Where to run it      | What it does                                                                                                                                      |
| -------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx playwright test <path-to-test.spec.ts>` | Anywhere             | Runs focused test; the Playwright config routes unit-style and server-backed specs to the appropriate browser projects                            |
| `just test`                                  | Host only            | Starts dedicated Playwright container and runs the full suite. Agents already running in a Docker container cannot run this nested Docker command |
| `npm test`                                   | Inside the container | What `just test` runs under the hood                                                                                                              |

## Adding or changing tests

- [ ] Choose the smallest test layer that covers the behavior.
- [ ] Reuse or extend the relevant shared fixture instead of repeating setup.
- [ ] Use an isolated sandbox for any book reads or writes; never edit the example book.
- [ ] Add server-backed specs to the book-integration matcher.
- [ ] Reuse the shared server fixture and lock; reset shared worker state between tests, and use serial mode only when tests genuinely depend on order.
- [ ] Run the focused spec. Run `just test` from the host for shared infrastructure or cross-cutting changes.
