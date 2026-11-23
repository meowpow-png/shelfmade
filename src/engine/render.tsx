import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { type ComponentType } from 'react'

import { copyAssets } from '@/engine/assets'
import { renderDocument, renderIndex } from '@/engine/document'
import { BookOpenIcon } from '@/engine/BookOpenIcon'
import { type PageSize } from '@/engine/page-format'

export interface Book {
  slug: string
  title: string
  documentTitle: string
  lang: string
  pageSize: PageSize
  dir: string
  // Raw chapter text for the editor - separate from App, which only renders the compiled MDX.
  // path is server-side only (the save route's write target), never sent to the browser
  // order is only ever set by the dev-server's eager backfill, never by a static build
  chapters: { slug: string; title: string; content: string; path: string; order?: number }[]
  App: ComponentType
}

// src/runtime in dev, dist/runtime when built (copied next to the compiled engine)
export const RUNTIME_DIR = resolve(__dirname, '../runtime')

// pagedjs exports no subpaths, so the polyfill is located
// relative to its resolved CommonJS entry (lib/index.cjs) instead.
export const PAGED_POLYFILL = resolve(
  dirname(require.resolve('pagedjs')),
  '../dist/paged.polyfill.min.js',
)

export function renderBooks(books: Book[], outDir: string) {
  mkdirSync(join(outDir, 'shelfmade/vendor'), { recursive: true })
  copyAssets(RUNTIME_DIR, join(outDir, 'shelfmade'))
  copyFileSync(PAGED_POLYFILL, join(outDir, 'shelfmade/vendor/paged.polyfill.min.js'))

  for (const { slug, documentTitle, lang, pageSize, dir, App } of books) {
    const body = renderToStaticMarkup(<App />)
    copyAssets(dir, join(outDir, 'books', slug))

    const stylesheets = readdirSync(dir)
      .filter((file) => file.endsWith('.css'))
      .sort()
      .map((file) => `books/${slug}/${file}`)

    writeFileSync(
      join(outDir, `${slug}.html`),
      renderDocument({ title: documentTitle, lang, pageSize, stylesheets }, body),
    )
  }

  const index = renderToStaticMarkup(
    <div className="books-page">
      <div className="books-header">
        <h1 className="books-header-title">Your books</h1>
        <button type="button" className="new-book-button">
          + New book
        </button>
      </div>
      {books.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No books yet</p>
          <p className="empty-state-description">Create your first book to see it listed here.</p>
        </div>
      ) : (
        <ul className="book-list">
          {books.map(({ slug, title }) => (
            <li key={slug} className="book-row">
              <BookOpenIcon className="book-row-icon" />
              <div className="book-row-info">
                <p className="book-row-title">{title}</p>
                <p className="book-row-path">/books/{slug}</p>
              </div>
              <a className="book-row-open" href={`${slug}.html`}>
                Open
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>,
  )

  writeFileSync(join(outDir, 'index.html'), renderIndex(index))
}
