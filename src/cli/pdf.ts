import { build } from '@/cli/build'
import { displayPath } from '@/cli/display-path'
import { BrowserMissingError, installBrowser } from '@/engine/browser'
import { printBooks } from '@/engine/print'

export async function pdf(root: string) {
  const { books, outDir } = await build(root)
  const slugs = books.map(({ slug }) => slug)

  try {
    await printBooks(slugs, outDir)
  } catch (error) {
    if (!(error instanceof BrowserMissingError)) {
      throw error
    }

    console.log('Downloading Chromium for PDF printing (one-time setup)…')
    installBrowser()
    await printBooks(slugs, outDir)
  }

  console.log(`Printed ${books.length} book(s) to ${displayPath(outDir)}`)
}
