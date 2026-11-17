# Usage

Shelfmade turns books built from React components and MDX content into paginated, print-ready output. It runs inside a book project, installed as a dev dependency.

There are four commands:

- `init` — create a book project
- `dev` — preview the books with live reload
- `build` — render each book to HTML
- `pdf` — print each book to PDF

Apart from `init`, every command operates on every book configured in the project in one go, writing separate output files per book.

Commands run on the book project in the current directory. Pass `--root <dir>` to run on a project elsewhere; output still goes to that project's `dist/`:

```sh
npx shelfmade build --root ../my-books
```

## Setup

Enable Corepack once per environment, so npm matches the version pinned in your project's `package.json` `packageManager` field:

```sh
corepack enable npm
```

Without this, npm falls back to whatever version ships with your installed Node, which can silently drift from the version `package-lock.json` was generated with.

A project created with `init` (see below) already lists [Shelfmade](https://www.npmjs.com/package/shelfmade). To add it to an existing book project instead:

```sh
npm install --save-dev shelfmade
```

## Starting a book project

```sh
npx shelfmade init my-book
```

Creates `my-book/` with a working book project: a `shelfmade.config.ts`, a `package.json` with `dev`, `build` and `pdf` scripts, and one book with a chapter, a stylesheet and an example component. Run it without a name to set up the current directory instead. The book is named after the directory. Existing files are never overwritten; if any would be, nothing is created.

Then install and start the preview:

```sh
cd my-book
npm install
npm run dev
```

## Development

```sh
npx shelfmade dev
```

Builds every book, serves them at `http://localhost:8080` and rebuilds whenever a file in the book project changes; open pages reload by themselves. Use `--port <n>` for another port. If a change breaks the build, the error is printed and the browser keeps the last good version until the next save fixes it.

A two-pane editor will replace this preview: content and design on the left, a live preview on the right, switching between a fast draft view that follows your typing and an exact paged view that matches print output.

## Rendering to HTML

```sh
npx shelfmade build
```

This writes one static file per book, so you can open any of them directly in a browser to check before printing.

## Printing to PDF

```sh
npx shelfmade pdf
```

This does the same render, then prints every book using headless Chromium via Playwright.

The first run downloads Chromium once (about 300 MB unpacked) into Playwright's per-user cache, `~/.cache/ms-playwright/` on Linux; nothing is installed system-wide. Later runs reuse it. If the download fails, for example offline, install it manually and run `pdf` again:

```sh
npx playwright install chromium --only-shell
```

On Linux, Chromium needs common desktop libraries (NSS, GTK accessibility, X11, Mesa). If one is missing, the error names it; install it with your system's package manager.

Text is laid out with the fonts available to Chromium. For identical PDFs on every machine, ship a book's fonts in its directory instead of relying on system fonts.

## Output

All commands write into `dist/`, which is generated and should be gitignored, one file per book:

- `dist/<book>.html` — the rendered pages
- `dist/index.html` — links to every rendered book, for development
- `dist/<book>.pdf` — the printed PDFs

## Book projects

A book project is a folder with a `shelfmade.config.ts` at its root and one directory per book:

```text
shelfmade.config.ts
components/
books/
    <slug>/
        App.tsx
        *.css
        content/
            chapter-1.mdx
            chapter-2.mdx
```

### Configuration

```ts
import { defineConfig } from 'shelfmade'

import * as components from './components'
import { App } from './books/ebook-1/App'
import { ZodiacBanner } from './books/ebook-1/ZodiacBanner'

export default defineConfig({
  lang: 'hr',
  titlePrefix: 'Slađana Wolf',
  pageFormat: 'A5',
  components,
  books: {
    'ebook-1': {
      title: 'Kako horoskop utječe na vaše financije',
      components: { ZodiacBanner },
      App,
    },
  },
})
```

Project-level options apply to every book; a book can override `lang` and `pageFormat`.

| Option        | Level         | Default                 | Description                                                                     |
| ------------- | ------------- | ----------------------- | ------------------------------------------------------------------------------- |
| `books`       | project       | —                       | Books keyed by slug; the slug names the output files                            |
| `titlePrefix` | project       | none                    | Prepended to every book's document title (`<prefix> — <title>`)                 |
| `components`  | project, book | none                    | Components available to MDX content; a book's map is merged over the shared one |
| `lang`        | project, book | `'en'`                  | Document language (`<html lang>`)                                               |
| `pageFormat`  | project, book | `'A5'`                  | `'A4'`, `'A5'`, `'A6'`, `'Letter'` or `{ width, height }` in CSS lengths        |
| `title`       | book          | —                       | Book title, shown in the document title and the index page                      |
| `dir`         | book          | `books/<slug>`          | Book directory, relative to the project root                                    |
| `content`     | book          | `content`               | Chapter directory, relative to the book directory                               |
| `App`         | book          | one section per chapter | Layout component wrapping the chapters                                          |

### Content

Every `.mdx` file in a book's content directory is a chapter, ordered by filename with numbers compared numerically (`chapter-9` before `chapter-10`). YAML frontmatter is passed to the layout as-is.

MDX files never import components. Every component in the merged `components` map is available in every chapter of that book by name:

```mdx
---
chapter: Poglavlje 3
---

<ZodiacBanner signName="Ovan" element="fire" />

Postoje ljudi koji prije svake veće kupnje…
```

### Layout

`App` receives the book's `title` and its `chapters`, each with a `slug`, its `frontmatter` and a `Body` component that renders the chapter with components injected:

```tsx
import { type LayoutProps } from 'shelfmade'

export function App({ title, chapters }: LayoutProps) {
  return chapters.map(({ slug, frontmatter, Body }) => (
    <section key={slug} className="chapter" data-chapter={String(frontmatter.chapter)}>
      <Body />
    </section>
  ))
}
```

Without `App`, each chapter is rendered in a `<section class="chapter">`.

### Code

Shelfmade compiles `shelfmade.config.ts` and every component it imports itself, so a book project has no build step. Book projects don't install React: every `react` import uses Shelfmade's own copy. Install `@types/react` as a dev dependency for editor type checking. Any other package a component imports must be installed in the book project.

Components can't import CSS yet; put stylesheets in the book directory instead.

### Styles and assets

Every `.css` file directly in a book's directory is loaded into that book's document, in filename order, after Shelfmade's own styles. Every other file in the book directory except `.ts`, `.tsx` and `.mdx` is copied to `dist/books/<slug>/`, so assets are referenced as `books/<slug>/<path>`.

## Adding a new book

Add a directory with its content and an entry under `books` in `shelfmade.config.ts`. No changes to Shelfmade are needed — every command picks up every configured book automatically.
