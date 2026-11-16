import { join, relative } from 'node:path'

import { loadConfig } from '@/config'
import { resolveBooks } from '@/engine/books'
import { renderBooks } from '@/engine/render'

export async function build(root: string) {
  const { config } = await loadConfig(root)
  const books = resolveBooks(config, root)
  const outDir = join(root, 'dist')

  renderBooks(books, outDir)
  console.log(`Rendered ${books.length} book(s) to ${displayPath(outDir)}`)
}

function displayPath(path: string) {
  const relativePath = relative(process.cwd(), path)
  return relativePath.startsWith('..') ? path : relativePath
}
