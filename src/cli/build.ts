import { join } from 'node:path'

import { displayPath } from '@/cli/display-path'
import { loadConfig } from '@/config'
import { resolveBooks } from '@/engine/books'
import { renderBooks } from '@/engine/render'

export async function build(root: string) {
  const { config } = await loadConfig(root)
  const books = await resolveBooks(config, root)
  const outDir = join(root, 'dist')

  renderBooks(books, outDir)
  console.log(`Rendered ${books.length} book(s) to ${displayPath(outDir)}`)

  return { books, outDir }
}
