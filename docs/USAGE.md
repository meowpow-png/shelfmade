# Usage

Shelfmade turns books built from React components and MDX content into paginated, print-ready output. It runs inside a book project, installed as a dev dependency.

There are three commands:

- `dev` — open the editor with a live preview
- `build` — render each book to HTML
- `pdf` — print each book to PDF

Every command operates on every book configured in the project in one go, writing separate output files per book.

## Setup

Enable Corepack once per environment, so npm matches the version pinned in your project's `package.json` `packageManager` field:

```sh
corepack enable npm
```

Without this, npm falls back to whatever version ships with your installed Node, which can silently drift from the version `package-lock.json` was generated with.

Then install Shelfmade in your book project:

```sh
npm install --save-dev shelfmade
```

## Development

```sh
npx shelfmade dev
```

Opens the editor: content and design on the left, a live preview on the right. The preview switches between a fast draft view that follows your typing and an exact paged view that matches print output.

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

## Output

All commands write into `dist/`, which is generated and should be gitignored, one file per book:

- `dist/<book>.html` — the rendered pages
- `dist/index.html` — links to every rendered book, for development
- `dist/<book>.pdf` — the printed PDFs

## Adding a new book

Add the book's content and configuration to your book project. No changes to Shelfmade are needed — every command picks up every configured book automatically.
