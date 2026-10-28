import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { type ComponentType } from 'react'

import { renderDocument } from '@/engine/document'

export interface Book {
  slug: string
  title: string
  lang: string
  App: ComponentType
}

export function renderBooks(books: Book[], outDir: string) {
  mkdirSync(outDir, { recursive: true })

  for (const { slug, title, lang, App } of books) {
    const body = renderToStaticMarkup(<App />)

    writeFileSync(join(outDir, `${slug}.html`), renderDocument({ title, lang }, body))
  }
}
