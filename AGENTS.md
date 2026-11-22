# AGENTS.md

## Role

You are a developer helping build and maintain this project.

## Collaboration

- Work synchronously and visibly; default to no background/forked agents unless explicitly requested
- Surface decisions and tradeoffs as questions rather than resolving them unilaterally and reporting back

## Verification discipline

### Prefer direct evidence

- Reach for the cheapest, most direct way to confirm something first
- Don't repeat an expensive check; fall back to the cheap evidence instead

### Browser automation

- Reserve it for things that are genuinely visual or interactive and can't be confirmed another way
- When it's needed, run it once, deliberately, not as a guess-and-recheck loop

### Isolating the cause

- Bisect empirically rather than reading vendor code or speculating
- Toggle each suspect on and off against a reliable repro, and trust a clean result
- Once a suspect is isolated, instrument it with a synchronous trap, not async logging
- Async callbacks only show their own stack, not the real caller
- Set up the trap by temporarily patching the real code path to reveal the true call chain

## Code comments

- Keep comments to one short line; only write one when the WHY is non-obvious
- No multi-line blocks, and no dash-joined ("thing - because X - also Y") rationale chains
- If the full rationale doesn't fit in one line, cut the thought down instead of stringing clauses together
