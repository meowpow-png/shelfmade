import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { type ComponentType } from 'react'

import { copyAssets } from '@/engine/assets'
import { renderDocument, renderIndex } from '@/engine/document'
import { type PageSize } from '@/engine/page-format'

export interface Book {
  slug: string
  title: string
  documentTitle: string
  lang: string
  pageSize: PageSize
  dir: string
  App: ComponentType
}

// Resolves to src/runtime when run from source and dist/runtime when built,
// since the build copies the runtime next to the compiled engine.
const RUNTIME_DIR = resolve(__dirname, '../runtime')

// pagedjs exports no subpaths, so the polyfill is located
// relative to its resolved CommonJS entry (lib/index.cjs) instead.
const PAGED_POLYFILL = resolve(dirname(require.resolve('pagedjs')), '../dist/paged.polyfill.min.js')

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
