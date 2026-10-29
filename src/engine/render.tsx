import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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

export function renderBooks(books: Book[], outDir: string) {
  mkdirSync(outDir, { recursive: true })

  for (const { slug, title, lang, dir, stylesheet, App } of books) {
    const body = renderToStaticMarkup(<App />)
    copyAssets(dir, join(outDir, 'books', slug))

    const stylesheets = stylesheet ? [`books/${slug}/${stylesheet}`] : []

    writeFileSync(join(outDir, `${slug}.html`), renderDocument({ title, lang, stylesheets }, body))
  }
}
