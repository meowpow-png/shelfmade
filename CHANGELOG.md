# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-21

### Added

- Index page for browsing books
- Two-pane book editor that allows editing chapter content with live preview
- Autosave that allows editing chapters without manually saving
- Vite-powered dev server for instant index page and book preview updates
- CI workflow that allows the project to run automated checks on every change

### Fixed

- Firefox losing paragraph-ending content during pagination
- Blank page race when mounting a book preview
- Style flash when loading a book preview
- Preview flicker/hang on remount after an edit

## [0.1.0] - 2026-11-17

### Added

- `shelfmade init` to scaffold a new book project
- `shelfmade dev` to preview a book with live reload while editing
- `shelfmade build` to render all books in a project
- `shelfmade pdf` to export a print-ready, print-accurate PDF
- Content written in MDX, with design built as reusable components
- Automatic, print-accurate pagination, handling widows, orphans, and other print layout rules
- Support for multiple books and stylesheets in one project
- MIT licence

[Unreleased]: https://github.com/meowpow-png/shelfmade/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/meowpow-png/shelfmade/releases/tag/v0.2.0
[0.1.0]: https://github.com/meowpow-png/shelfmade/releases/tag/v0.1.0
