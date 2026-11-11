import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { type ComponentType } from 'react'

import { copyAssets } from '@/engine/assets'
import { renderDocument, renderIndex } from '@/engine/document'

export interface Book {
  slug: string
  title: string
  lang: string
  dir: string
  stylesheet?: string
  App: ComponentType
}

// Resolves to src/runtime when run from source and dist/runtime when built,
// since the build copies the runtime next to the compiled engine.
const RUNTIME_DIR = resolve(__dirname, '../runtime')

// pagedjs exports no subpaths, so the polyfill is located relative to its
// resolved CommonJS entry (lib/index.cjs) instead.
const PAGED_POLYFILL = resolve(dirname(require.resolve('pagedjs')), '../dist/paged.polyfill.min.js')

export function renderBooks(books: Book[], outDir: string) {
  mkdirSync(join(outDir, 'shelfmade/vendor'), { recursive: true })
  copyAssets(RUNTIME_DIR, join(outDir, 'shelfmade'))
  copyFileSync(PAGED_POLYFILL, join(outDir, 'shelfmade/vendor/paged.polyfill.min.js'))

  for (const { slug, title, lang, dir, stylesheet, App } of books) {
    const body = renderToStaticMarkup(<App />)
    copyAssets(dir, join(outDir, 'books', slug))

    const stylesheets = ['shelfmade/tokens.css', 'shelfmade/pagination/pagination.css']
    if (stylesheet) stylesheets.push(`books/${slug}/${stylesheet}`)

    writeFileSync(join(outDir, `${slug}.html`), renderDocument({ title, lang, stylesheets }, body))
  }

  const index = renderToStaticMarkup(
    <ul>
      {books.map(({ slug, title }) => (
        <li key={slug}>
          <a href={`${slug}.html`}>{title}</a>
        </li>
      ))}
    </ul>,
  )

  writeFileSync(join(outDir, 'index.html'), renderIndex(index))
}
