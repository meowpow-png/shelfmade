import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { type ComponentType } from 'react'

import { copyAssets } from '@/engine/assets'
import { renderDocument } from '@/engine/document'

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

export function renderBooks(books: Book[], outDir: string) {
  mkdirSync(outDir, { recursive: true })
  copyAssets(RUNTIME_DIR, join(outDir, 'shelfmade'))

  for (const { slug, title, lang, dir, stylesheet, App } of books) {
    const body = renderToStaticMarkup(<App />)
    copyAssets(dir, join(outDir, 'books', slug))

    const stylesheets = ['shelfmade/tokens.css']
    if (stylesheet) stylesheets.push(`books/${slug}/${stylesheet}`)

    writeFileSync(join(outDir, `${slug}.html`), renderDocument({ title, lang, stylesheets }, body))
  }
}
