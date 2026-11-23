# Note: Playwright cross-worker contention flakiness

## Context

The external-edit-conflict test suite failed intermittently, both in CI and locally, with no consistent pattern at first glance. The failures always hit either the full test timeout or a shorter assertion timeout, with no obvious defect in the conflict-detection or autosave code behind them. I needed to figure out whether this was a real logic bug in that mechanism or something environmental in how the tests themselves get scheduled and run.

## Observations

The two failures that prompted this investigation were both on the firefox project: one timed out after five seconds waiting for a conflict banner to appear after an external file edit, the other timed out after thirty seconds on the initial page load wait, before the test even reached its real assertions.

I forced a repro by running the whole spec file repeatedly under heavier load than normal, repeating each test twenty times with four parallel workers. That produced nine failures out of two hundred runs, a roughly 4.5 percent rate. None of those nine matched the original failure shapes. All nine hit the full thirty second test timeout, not the five second banner assertion, and they were spread across both the chromium and firefox projects, and across three different tests in the file rather than just the two originally reported.

I then reran the identical two hundred cases serially, with a single worker. That run produced zero failures.

## Analysis

The spread of the forced-repro failures across both browser engines and across tests that had never been reported as flaky pointed away from a firefox-specific timing quirk and toward something about how the test runner schedules work across workers.

Each worker that touches this spec file boots its own Vite dev server and a sandboxed copy of the book content, and every edit to a chapter triggers a full pagedjs pagination pass in the live preview. Running several of those concurrently, as happens whenever the test runner fans a file's tests out across multiple parallel workers, puts real CPU pressure on the machine. That pressure can push any of the suite's waits past its timeout under load, regardless of which browser engine is driving the page, which explains why the forced repro's failures were not confined to firefox.

The clean zero-failure result at a single worker is the strongest piece of evidence here: toggling that one variable and getting a clean pass is a reliable signal that contention, not a defect in the conflict banner or autosave logic, explains the observed failures. The original two specific failures were not reproduced in this form during the investigation, so I cannot claim with certainty that they share the exact same cause as the nine captured here, only that they belong to the same general class of parallelism-induced flakiness.

## Conclusions

Confirmed: cross-worker CPU contention, specifically multiple workers each running their own Vite dev server and pagedjs pagination pass at the same time, causes timeout failures in this spec file under parallel execution.

Ruled out: a logic defect in the conflict banner or autosave mechanism. That code behaved correctly in every run once contention was removed.

Not confirmed: whether the original firefox-only five second banner timeout shares the exact same root cause as the broader contention pattern, since it was not directly reproduced during this investigation.

The fix has two parts, both in the spec file and its shared sandbox helper.

```text
tests/book-editor-external-edit-conflict.spec.ts
tests/book-sandbox.ts
```

First, the file's tests are forced to run serially on a single worker per browser project, rather than letting the test runner fan them out across several workers within one project.

```ts
test.describe.configure({ mode: 'serial' })
```

Second, because serial mode only prevents fan-out within a single project, a chromium worker and a firefox worker could still run this file's setup concurrently with each other. A cross-process lock, implemented as an atomic directory creation, closes that gap by letting only one project's worker run the file's setup and tests at any given moment.

```ts
export async function acquireLock(name: string, timeoutMs = 120_000): Promise<() => void> {
  mkdirSync(LOCKS_DIR, { recursive: true })
  const lockPath = join(LOCKS_DIR, name)
  const start = Date.now()

  while (true) {
    try {
      mkdirSync(lockPath)
      return () => rmSync(lockPath, { recursive: true, force: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      // reclaim a lock abandoned by a killed process, then retry or time out
      ...
    }
  }
}
```

Two refinements round out the lock itself. If a process is killed before it releases the lock, a later run checks the lock directory's age and reclaims it once it is older than the timeout, rather than waiting out the full timeout on every subsequent attempt. And the test file's teardown releases the lock inside a finally block, so a partial setup failure during server startup cannot leave the lock stuck for every later run.
