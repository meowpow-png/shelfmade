# Architecture

Shelfmade is a single npm package that a book project installs as a dev dependency. It ships a CLI, the rendering engine, the browser-side pagination runtime and the editor. A book project contains only its content, design components and configuration; it never contains pipeline code.

Books are rendered via `react-dom/server` to static HTML, paginated in the browser by paged.js, and printed to PDF by Playwright. The editor is the only part with a client runtime.

Adding a new book means adding content and configuration to a book project, not changing Shelfmade.

## Project Structure

```text
bin/
    shelfmade.mjs
src/
    cli/
    config/
    engine/
    runtime/
    editor/
    index.ts
templates/
```

| Module       | Responsibility                                                                          |
| ------------ | --------------------------------------------------------------------------------------- |
| `bin/`       | Executable entry point; hands off to `cli/`                                             |
| `cli/`       | Command parsing and the `dev`, `build` and `pdf` commands                               |
| `config/`    | The book-project contract: `defineConfig`, config loading and its types                 |
| `engine/`    | Node-side rendering: book discovery, MDX reading, component injection, HTML documents   |
| `runtime/`   | Plain CSS and JS served to the browser as-is: engine tokens, preview styles, pagination |
| `editor/`    | The two-pane editor app: content editor, draft preview and paged preview                |
| `index.ts`   | Public API exported to book projects                                                    |
| `templates/` | Files scaffolded into book projects: agent instructions and AI skills                   |

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

- The engine must not depend on `cli/` or `editor/`
- Every book-specific value (title, language, page format, stylesheets) comes from configuration

## Runtime

The runtime is everything the rendered documents load in the browser: engine tokens, preview styles and the pagination rules that extend paged.js. These files are not compiled; they are copied into the output and loaded through `<link>` and `<script>` tags.

**Rules**

- Runtime files must not depend on Node or on any build step
- paged.js is pinned to an exact version because the pagination rules depend on its behaviour; upgrade it deliberately and run the pagination tests before releasing
- Runtime styles define only engine concerns (page size, preview layout); a book's look belongs to its project

## Editor

The editor is a Vite + React app launched by `shelfmade dev`. Its left pane edits content and design, and its right pane previews the book in one of two modes:

- **Draft** — continuous scroll without paged.js, fast enough to follow typing
- **Paged** — exact pagination via the runtime, matching print output

Pagination is destructive and non-incremental, so it never runs in the typing path.

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
editor, engine, config

editor
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
- `engine/` must not depend on `editor/` or `cli/`
- `editor/` must not depend on `cli/`
- `runtime/` is loaded by rendered documents, never imported by TypeScript modules
