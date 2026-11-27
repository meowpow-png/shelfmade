# Release

## Prerequisites

- npm account with publish access
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

## Prepare release

1. Turn `[Unreleased]` in `CHANGELOG.md` into `[X.Y.Z] - <date>`
2. Update the comparison links at the bottom of `CHANGELOG.md`
3. Confirm the version in `package.json` and `package-lock.json` is `X.Y.Z`
4. Run `npm run qualitycheck`, confirm it's clean
5. Run `npm test`, confirm it's clean

## Release

1. Merge `dev` into `main` with commit message `Release vX.Y.Z`
2. Tag the release: annotated, with message `Release vX.Y.Z`
3. Push `main` and the tag to origin repository

**Notes:**

- Merge with no fast-forward: a fast-forward merge produces no new commit, so there'd be nothing to carry the merge commit message
- No co-authorship trailer on the release commit or tag

## Publish

1. Run `npm whoami`; if it reports that you are not logged in, run `npm login` and then `npm whoami` again
2. Run `npm publish --dry-run` and confirm the package contents and version
3. Publish the package on npm (`npm publish`)

**Notes:**

- Order matters: merge, then tag, then publish. Publishing first would ship a package with no corresponding commit on `main` yet, and an npm version can't be republished if something needs fixing

## Start next release

1. Fast-forward `dev` to `main`
2. Bump the version in `package.json` and `package-lock.json` to the next planned release version
