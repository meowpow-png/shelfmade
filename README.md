# Shelfmade

Describe how your book should look, write it yourself or draft it with AI, and get beautifully designed, print-ready books — one title or a whole series.

> **Status:** early development. The command line works: it creates book projects, previews them with live reload and prints them to PDF. The editor and the AI workflow described below are not built yet.

## What is Shelfmade?

Shelfmade is a book studio for people who want to publish designed books without being designers or experienced developers. You work alongside an AI assistant: it turns your ideas into a book's visual design, helps you draft and refine the text, and Shelfmade turns the result into a paginated, print-accurate book you can export.

Every design element you create — a chapter opener, a pull quote, a sidebar, a cover layout — becomes a reusable building block. Use it in one book, or across a whole catalogue so every title in a series shares the same look.

## How it works

1. **Describe the design.** Explain to the AI what your book should look like, or hand it a mockup you already have.
2. **Get building blocks.** The AI creates the design as reusable components that any of your books can use.
3. **Refine it.** Adjust colours, typography and layout until it looks right, with the AI making the changes for you.
4. **Add the words.** Write the content yourself, or have the AI draft it following voice and style instructions you keep alongside your books.
5. **Preview and export.** See every page exactly as it will print, then export print-ready files.

## The editor

Shelfmade runs on your own computer as a two-pane editor:

- **Left:** your content and design.
- **Right:** a live preview of the book.

The preview has two modes: a fast, continuous view that keeps up while you type, and an exact page-by-page view that shows precisely where every page breaks.

## Typography that cares about pages

Good-looking books depend on details most tools ignore. Shelfmade's pagination engine handles them for you:

- No widows or orphans — single lines stranded at the top or bottom of a page
- Headings stay with the paragraph that follows them
- Paragraphs don't end with a lonely fragment on a new page
- Hyphenated words are never split across pages

## Your books are yours

Books live in an ordinary folder on your machine — plain text content, design components and a small configuration file. Nothing is locked into a proprietary format or a hosted service: you can open, back up, move or version your books like any other files.

## Usage

Shelfmade is distributed as an npm package that a book project installs. Start a new book project with:

```sh
npx shelfmade init my-book
cd my-book
npm install
```

Then, inside the project:

```sh
npx shelfmade dev     # preview with live reload (the editor later)
npx shelfmade build   # render all books
npx shelfmade pdf     # export print-ready PDFs
```

Shelfmade isn't published on npm yet. See [docs/USAGE.md](docs/USAGE.md) for the full guide.

A guided, no-setup version that doesn't require working with folders or commands is a longer-term goal.

## Licence

To be decided.
