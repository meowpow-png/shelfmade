# Shelfmade

Shelfmade is a command-line tool for building print-ready books. You write content in MDX and design in reusable components, preview the result with live reload, and export a paginated, print-accurate PDF.

## What is Shelfmade?

Shelfmade takes book content written in MDX and design elements built as reusable components, then turns them into a paginated, print-accurate book. A chapter opener, a pull quote, a sidebar, a cover layout: each is a component you can reuse within a book or across a whole series, so every title shares the same look.

Everything currently runs through the command line: scaffold a project, preview it while you write, and export to PDF.

## Pages done right

Print has a lot of small rules that are easy to get wrong by hand. Shelfmade takes care of them for you:

- No widows or orphans (single lines stranded at the top or bottom of a page)
- Headings stay with the paragraph that follows them
- Paragraphs don't end with a lonely fragment on a new page
- Hyphenated words are never split across pages

## What you see is what prints

`shelfmade dev` doesn't show you an approximation. It builds and serves the same paginated output that `pdf` prints, and rebuilds it every time you save. If a change breaks the build, the error is printed and the preview keeps showing the last good version until the next save fixes it.

## Your books are yours

Books live in an ordinary folder on your machine: plain text content, design components and a small configuration file. There's no proprietary format and no hosted service involved. You can open, back up, move or version your books like any other files.

## Not built yet

Two pieces described in the project's longer-term plans don't exist yet:

- **A visual editor.** A two-pane app with your content and design on one side and a live preview on the other, instead of working from the terminal.
- **AI-assisted design and drafting.** Describing a design or handing over a mockup and getting matching components, plus AI help drafting and refining content.

See [docs/ROADMAP.md](docs/ROADMAP.md) for where things stand.

## Usage

Shelfmade is distributed as an [npm package](https://www.npmjs.com/package/shelfmade) that a book project installs. Start a new book project with:

```sh
npx shelfmade init my-book
cd my-book
npm install
```

Then, inside the project:

```sh
npx shelfmade dev     # preview with live reload
npx shelfmade build   # render all books
npx shelfmade pdf     # export print-ready PDFs
```

See [docs/USAGE.md](docs/USAGE.md) for the full guide.

## Licence

Licensed under [MIT Licence](LICENSE).
