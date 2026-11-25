# Roadmap

## CLI book builder

### End-to-end workflow

**Steps:**

- [x] Scaffold a new book project with one command
- [x] Write content in MDX and design in reusable components
- [x] Preview a book with live reload while editing
- [x] Paginate books cleanly, with no awkward breaks
- [x] Export a print-ready, print-accurate PDF

**Done when:**

You can go from an idea to a print-ready PDF without leaving the terminal.

### Proven on a real book

**Steps:**

- [ ] Publish a real title end-to-end through Shelfmade
- [ ] Confirm the exported PDF matches the book's previous output

**Done when:**

A real book has shipped through Shelfmade, with the same page count and breaks as before.

### Public release

**Steps:**

- [x] Choose a licence
- [x] Publish the package on npm

**Done when:**

Anyone can install and start a book without a local checkout of Shelfmade.

## Visual editor

A two-pane app replaces the terminal workflow: write content on one side and watch an accurate, paginated preview update on the other.

**Steps:**

- [x] Browse your books from a visual index, instead of a folder listing
- [x] Open a book into a two-pane editor: content on one side, a live paginated preview on the other
- [x] Edit chapter content and have it save automatically, with the preview staying in sync
- [x] Switch between chapters from a collapsible sidebar, instead of scrolling through all of them at once
- [x] Add a new chapter from the editor, instead of creating the file by hand
- [ ] See a clear saved/unsaved status while editing
- [ ] Recover gracefully when a save fails

**Done when:**

You can write and preview an entire book from the editor, without touching the terminal.

## AI design & drafting

Describe a book's look or hand over a mockup and get matching components, then have AI help refine the design, draft the content, and review the prose, all guided by style notes you keep with the book.
