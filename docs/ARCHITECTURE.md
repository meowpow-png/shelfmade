# Architecture

Shelfmade is a single npm package that a book project installs as a dev dependency. It ships a CLI, the rendering engine, the browser-side pagination runtime, and a Vite-served browser UI for its own pages. A book project contains only its content, design components and configuration; it never contains pipeline code.

Books are rendered via `react-dom/server` to static HTML, paginated in the browser by paged.js, and printed to PDF by Playwright.

Adding a new book means adding content and configuration to a book project, not changing Shelfmade.

## Project Structure

```text
bin/
    shelfmade.mjs
src/
    assets/
    cli/
    client/
    config/
    engine/
    runtime/
    index.ts
template/
```

| Module      | Responsibility                                                                          |
| ----------- | --------------------------------------------------------------------------------------- |
| `bin/`      | Executable entry point; hands off to `cli/`                                             |
| `assets/`   | Static assets (icons) shared between the engine's static render and the client UI       |
| `cli/`      | Command parsing and the `init`, `dev`, `build` and `pdf` commands                       |
| `client/`   | Vite-transformed browser UI: Shelfmade's own index page and the book preview client     |
| `config/`   | The book-project contract: `defineConfig`, config loading and its types                 |
| `engine/`   | Node-side rendering: book discovery, MDX reading, component injection, HTML documents   |
| `runtime/`  | Plain CSS and JS served to the browser as-is: engine tokens, preview styles, pagination |
| `index.ts`  | Public API exported to book projects                                                    |
| `template/` | The starter book project that `init` copies into a new directory                        |

## Book Projects

A book project is the data Shelfmade operates on. It provides a configuration file, its books' MDX content, and the React components and styles those books use. Components may be shared by every book in the project or belong to a single book.

Shelfmade discovers books and their content by convention from the configuration, so a book project needs no glue code to register chapters or components.

**Rules**

- Shelfmade must not depend on any specific book project
- A book project's code runs on the author's machine, never on shared infrastructure
- MDX content receives components by injection; it never imports them itself

## Engine

The engine turns a book project into one static HTML document per book, plus an index page linking to them. It reads the configuration, discovers each book's chapters, renders them with the project's components injected, and wraps the result in a document that loads the runtime.

**Rules**

- The engine must not depend on `cli/`
- Every book-specific value (title, language, page format, stylesheets) comes from configuration

Book and config resolution each have two paths: a plain Node path used by `build` and `pdf`, and a Vite-SSR path used by `dev` so that editing a component or the config file participates in Vite's module graph and triggers the right invalidation.

## Dev Server

`shelfmade dev` runs a Vite dev server that server-renders the index page and each book page on request and hydrates them in the browser, rather than serving pre-built output. This is what gives live reload and HMR without a separate build step.

**Rules**

- A book's own stylesheets are served unprocessed, not through Vite's transform pipeline; see `docs/notes/003-vite-dev-server-css-serving-gotchas.md` for why

## Runtime

The runtime is everything the rendered documents load in the browser: engine tokens, preview styles and the pagination rules that extend paged.js. These files are not compiled; they are copied into the output and loaded through `<link>` and `<script>` tags.

**Rules**

- Runtime files must not depend on Node or on any build step
- paged.js is pinned to an exact version because the pagination rules depend on its behaviour; upgrade it deliberately and run the pagination tests before releasing
- Runtime styles define only engine concerns (page size, preview layout); a book's look belongs to its project

## Styling

Styles are colocated with the components they belong to as plain CSS. Class names follow this convention to avoid collision:

```text
component-name / component-name-part
```

Engine design tokens are CSS custom properties on `:root`, loaded before all other stylesheets. Book projects define their own tokens for colours and fonts.

## Imports

Imports are grouped by purpose:

1. Runtime dependencies
2. Type-only imports
3. Static assets

A module is imported through `index.ts` once it has more than one exported member. Flat single-file modules have no `index.ts` and are imported directly instead.

## Dependency Rules

```text
bin
    ↓
cli
    ↓
engine, config

engine
    ↓
config

index
    ↓
config
```

**Rules**

- `config/` must not depend on any other module
- `engine/` must not depend on `cli/`
- `runtime/` is loaded by rendered documents, never imported by TypeScript modules
- `client/` is Vite-transformed browser source referenced by file path from `cli/`'s dev server, never imported as a TypeScript module
