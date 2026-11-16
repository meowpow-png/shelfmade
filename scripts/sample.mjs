// Temporary stand-in for the Phase 5 CLI: renders the sample book project,
// then either serves it for preview or prints it to PDF.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { loadConfig, printBooks, renderBooks, resolveBooks } from 'shelfmade'

const ROOT = resolve(import.meta.dirname, '../examples/sample-book')
const OUT_DIR = join(ROOT, 'dist')
const PORT = 8080

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
}

function serve() {
  createServer((request, response) => {
    const path = join(OUT_DIR, decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname))
    const file = existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.html') : path

    if (!file.startsWith(OUT_DIR) || !existsSync(file)) {
      response.writeHead(404).end('Not found')
      return
    }

    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    })
    createReadStream(file).pipe(response)
  }).listen(PORT, () => console.log(`Serving ${OUT_DIR} at http://localhost:${PORT}`))
}

async function main() {
  const { config } = await loadConfig(ROOT)
  const books = resolveBooks(config, ROOT)
  renderBooks(books, OUT_DIR)
  console.log(`Rendered ${books.length} books to ${OUT_DIR}`)

  if (process.argv[2] === 'serve') {
    serve()
  } else if (process.argv[2] === 'pdf') {
    await printBooks(
      books.map(({ slug }) => slug),
      OUT_DIR,
    )
    console.log(`Printed ${books.length} books`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
