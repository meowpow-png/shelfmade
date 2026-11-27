# Release

## Prerequisites

- npm account with publish access, logged in (`npm whoami`)
- push access to `main` on the GitHub repo

## Changelog entries

- Keep entries short and specific
- Describe the user-facing outcome, not the implementation
- Use: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`
- Clearly flag breaking changes and required migration steps

**Include:**

- User-visible features
- Behavior changes
- Bug fixes
- Compatibility changes
- Deprecations, removals, and security fixes

**Exclude:**

- Internal refactors
- Tests and CI
- Dependency updates
- Formatting and docs-only work, unless users are affected

## Process

1. Turn `[Unreleased]` in `CHANGELOG.md` into `[X.Y.Z] - <date>`
2. Update the comparison links at the bottom of `CHANGELOG.md`
3. Bump the version in `package.json` and `package-lock.json`
4. Run `npm run qualitycheck`, confirm it's clean
5. Run `npm test`, confirm it's clean
6. Merge `dev` into `main` with commit message `Release vX.Y.Z`
7. Tag the release: annotated, with message `Release vX.Y.Z`
8. Push `main` and the tag to origin repository
9. Publish the package on npm (`npm publish`)

## Notes

- Order matters: merge, then tag, then publish. Publishing first would ship a package with no corresponding commit on `main` yet, and an npm version can't be republished if something needs fixing
- Merge with no fast-forward: a fast-forward merge produces no new commit, so there'd be nothing to carry the merge commit message
- No co-authorship trailer on the release commit or tag
