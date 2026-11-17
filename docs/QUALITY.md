# Quality

Quality check passes when:

- the project builds
- code is formatted, linted, and type-checked
- there are no unused exports or dependencies

Run all quality checks:

```sh
npm run qualitycheck
```

That runs all quality checks sequentially. It keeps going even if one of them fails, so you see everything that's wrong in one pass instead of one at a time.

## Formatting

Formatting uses Prettier, catching spacing, quotes, that kind of thing.

Instead of fixing it by hand, run:

```sh
npm run format
```

## Linting

Linting uses ESLint for JS/TS and Markdown, catching real bugs Prettier won't touch. ESLint doesn't understand CSS though, so Stylelint covers that instead.

Most of it can be fixed automatically too:

```sh
npm run lint:fix
```

## Type checking

Type checking uses plain `tsc --noEmit`. There's no auto-fix here, you actually have to fix the types:

```sh
npm run typecheck
```

## Build

The build script runs `tsc`, then `tsc-alias`, then copies `src/runtime` into `dist/runtime`. So it doubles as a check that path aliases resolve correctly, not just that types are valid, and it's also what makes the published package runnable: the engine loads the runtime's pagination rules and styles from that copied output.

```sh
npm run build
```

## Exports and dependencies

Knip is used for flagging unused files, exports, and dependencies. No auto-fix here, if it flags something you either delete it or it's a false positive:

```sh
npm run knip
```

## Tests

Tests use Playwright, checking the pagination rules against the fixtures in `tests/fixtures/` in both Chromium and Firefox. They aren't part of `qualitycheck`, so run them separately, on your machine or in the Playwright container, which has both browsers installed:

```sh
npm test
just test
```

## Sample book

`examples/sample-book/` is a book project structured like a real one, linked to this repository with a `file:` dependency. Preview it at `http://localhost:8080` with live reload:

```sh
npm run sample
```

Render it with the CLI only, without serving:

```sh
npm run sample:build
```

Print it to PDF, on your machine or in the Playwright container, writing into `examples/sample-book/dist/`:

```sh
npm run sample:pdf
just sample-pdf
```

To try `init` before Shelfmade is published, pass `--link`: the new project depends on this checkout through a `file:` link instead of the npm release:

```sh
npm run build
node bin/shelfmade.mjs init ../my-book --link
```

## Git hooks

Lefthook runs quality checks before every `git push`, so a broken build or failing check never leaves your machine.

Hooks are installed automatically by the `prepare` script, which runs on `npm install` and `npm ci`, so there's nothing to set up by hand.

## CI

GitHub Actions runs CI on pushes and pull requests targeting `main` and `dev` when relevant files change, and it can also be started manually. There are two jobs:

- **Quality Checks** runs the same checks as `npm run qualitycheck`
- **Test** runs the Playwright tests in both browsers, then builds the sample book

Docs-only changes skip the **Test** job. Each job runs all of its checks even if one fails, then reports the results in the job summary.

In CI, a failing test is retried up to two times and `test.only` fails the run. When tests fail, the report and traces are uploaded as the `playwright-results` artifact.
