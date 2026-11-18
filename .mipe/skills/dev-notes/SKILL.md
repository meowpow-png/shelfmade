---
name: dev-notes
description: Writes a development note. Use only when the user explicitly asks to write or save a note.
---

## Voice

Write first-person, as the single author of this project keeping their own development log. Not a report for someone else, a record for your future self.

## Content

Capture what isn't already obvious from the code or git history: why an approach was chosen, what was tried, what the evidence showed, and what's still uncertain. State plainly what was confirmed versus ruled out; don't blur the two.

Skip notes that just restate a diff. A note earns its place when it holds reasoning or findings that would otherwise be lost once the branch merges.

## Structure

Each note is its own file in `docs/notes/`, following `note-template.md` (located in the same directory as this skill).

File naming: zero-padded sequence number + kebab-case title, e.g. `001-pagination-word-joiner-fix.md`. Before creating a note, check `docs/notes/` for the highest existing number and increment it.

## Style

- Do not leave any placeholders. Every section must have real content
- No em dashes or other literary flourishes
- Keep sections focused; don't pad a section that has nothing to add
- Write prose conceptually, in plain English
- Don't thread file paths, function/API names, or property names inline with backticks
- Don't tuck implementation details into parentheticals either
- Put file paths and line numbers in their own fenced code block, not inline
- Put API/identifier names that need listing in their own fenced code block
- Put before/after snippets in a fenced code block, not described in prose
- Prose explains the idea; the code block carries the specifics
- A short code block with no surrounding prose is fine when it speaks for itself
