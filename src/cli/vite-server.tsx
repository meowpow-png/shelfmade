import { createReadStream, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, resolve } from 'node:path'
import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { createServer, type Plugin, type ViteDevServer } from 'vite'

import { resolveBooksViaVite } from '@/engine/books'
import { renderPageSize, renderTopbar } from '@/engine/document'
import { PAGED_POLYFILL, RUNTIME_DIR } from '@/engine/render'

// src/ next to dist/ when built, or this package's own src/ in dev
const SRC_DIR = resolve(__dirname, '../../src')
const PACKAGE_ROOT = resolve(__dirname, '../..')

// Collapses a burst of module-invalidation events into one remount; not book-project configurable
const PREVIEW_REMOUNT_DEBOUNCE_MS = 200

// Served as-is, bypassing Vite's transform pipeline
const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

// Runs before Vite's static/transform middleware (via configureServer).
// pagedjs's Polisher re-fetches book stylesheets via a plain XHR (no Accept:
// text/css), so Vite would otherwise serve them as JS modules. Scoped to
// .css only - other book assets still need Vite's transform
function shelfmadeBookStylesheets(root: string): Plugin {
  return {
    name: 'shelfmade-book-stylesheets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const match =
          request.method === 'GET' ? /^\/books\/([^/]+)\/(.+\.css)$/.exec(request.url ?? '') : null
        const [, slug, assetPath] = match ?? []

        if (slug === undefined || assetPath === undefined) {
          next()
          return
        }

        serveBookAsset(server, root, slug, assetPath, response, next).catch((error: unknown) =>
          next(error instanceof Error ? error : new Error(String(error))),
        )
      })
    },
  }
}

export async function startViteServer(root: string, port: number): Promise<ViteDevServer> {
  const server = await createServer({
    root,
    // No index.html/SPA entry yet; routes are added below
    appType: 'custom',
    server: { port, host: '127.0.0.1', strictPort: true, fs: { allow: [root, PACKAGE_ROOT] } },
    resolve: { alias: { '@': SRC_DIR } },
    // shelfmade is file:-linked; treat it as a normal dependency, not local source
    ssr: { external: ['shelfmade'] },
    // Same linked-package issue for the browser: forces pre-bundling so
    // shelfmade's CJS named exports resolve
    optimizeDeps: { include: ['shelfmade'] },
    plugins: [
      shelfmadeBookStylesheets(root),
      react(),
      mdx({ remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: 'frontmatter' }]] }),
    ],
  })

  server.middlewares.use((request, response, next) => {
    if (request.method !== 'GET' || (request.url !== '/' && request.url !== '/index.html')) {
      next()
      return
    }

    serveIndexPage(server, root, request.url).then(
      (html) => {
        response.setHeader('Content-Type', 'text/html')
        response.end(html)
      },
      (error: unknown) => next(error instanceof Error ? error : new Error(String(error))),
    )
  })

  server.middlewares.use((request, response, next) => {
    const match = request.method === 'GET' ? /^\/([^/]+)\.html$/.exec(request.url ?? '') : null
    const [, slug] = match ?? []

    if (slug === undefined || slug === 'index') {
      next()
      return
    }

    serveBookPage(server, root, slug, request.url ?? `/${slug}.html`).then(
      (html) => {
        if (html === null) {
          response.statusCode = 404
          response.end('Not found')
          return
        }

        response.setHeader('Content-Type', 'text/html')
        response.end(html)
      },
      (error: unknown) => next(error instanceof Error ? error : new Error(String(error))),
    )
  })

  server.middlewares.use((request, response, next) => {
    const match = request.method === 'GET' ? /^\/shelfmade\/(.+)$/.exec(request.url ?? '') : null
    const [, assetPath] = match ?? []

    if (assetPath === undefined) {
      next()
      return
    }

    const path =
      assetPath === 'vendor/paged.polyfill.min.js'
        ? PAGED_POLYFILL
        : resolve(RUNTIME_DIR, assetPath)

    serveFile(path, response, next)
  })

  server.middlewares.use((request, response, next) => {
    const match =
      request.method === 'GET' ? /^\/books\/([^/]+)\/(.+)$/.exec(request.url ?? '') : null
    const [, slug, assetPath] = match ?? []

    if (slug === undefined || assetPath === undefined) {
      next()
      return
    }

    serveBookAsset(server, root, slug, assetPath, response, next).catch((error: unknown) =>
      next(error instanceof Error ? error : new Error(String(error))),
    )
  })

  server.middlewares.use((request, response, next) => {
    const match =
      request.method === 'PUT'
        ? /^\/books\/([^/]+)\/chapters\/([^/]+)$/.exec(request.url ?? '')
        : null
    const [, slug, chapterSlug] = match ?? []

    if (slug === undefined || chapterSlug === undefined) {
      next()
      return
    }

    saveChapter(server, root, slug, chapterSlug, request, response).catch((error: unknown) =>
      next(error instanceof Error ? error : new Error(String(error))),
    )
  })

  await server.listen()
  server.printUrls()

  return server
}

// Function-form replace avoids values like "$1" being read as patterns
function fillTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (html, [token, value]) => html.replace(token, () => value),
    template,
  )
}

function serveFile(path: string, response: ServerResponse, next: () => void) {
  if (!existsSync(path)) {
    next()
    return
  }

  const contentType = MIME_TYPES[extname(path)]
  if (contentType) response.setHeader('Content-Type', contentType)
  createReadStream(path).pipe(response)
}

async function serveBookAsset(
  server: ViteDevServer,
  root: string,
  slug: string,
  assetPath: string,
  response: ServerResponse,
  next: () => void,
) {
  const books = await resolveBooksViaVite(server, root)
  const book = books.find((candidate) => candidate.slug === slug)

  if (!book) {
    next()
    return
  }

  serveFile(resolve(book.dir, assetPath), response, next)
}

async function saveChapter(
  server: ViteDevServer,
  root: string,
  slug: string,
  chapterSlug: string,
  request: IncomingMessage,
  response: ServerResponse,
) {
  const books = await resolveBooksViaVite(server, root)
  const book = books.find((candidate) => candidate.slug === slug)
  const chapter = book?.chapters.find((candidate) => candidate.slug === chapterSlug)

  if (!chapter) {
    response.statusCode = 404
    response.end('Not found')
    return
  }

  const content = await readRequestBody(request)
  writeFileSync(chapter.path, content)
  response.statusCode = 204
  response.end()
}

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf-8')))
    request.on('error', reject)
  })
}

async function serveBookPage(server: ViteDevServer, root: string, slug: string, url: string) {
  const books = await resolveBooksViaVite(server, root)
  const book = books.find((candidate) => candidate.slug === slug)

  if (!book) return null

  const { App } = book
  const { renderBookBody } = await server.ssrLoadModule(resolve(SRC_DIR, 'client/render-book.tsx'))
  const body = renderBookBody(App)
  const stylesheets = readdirSync(book.dir)
    .filter((file) => file.endsWith('.css'))
    .sort()
    .map((file) => `<link rel="stylesheet" href="books/${slug}/${file}" />`)
    .join('\n    ')
  const template = readFileSync(resolve(SRC_DIR, 'client/book.html'), 'utf-8')

  const html = fillTemplate(template, {
    __SHELFMADE_LANG__: book.lang,
    __SHELFMADE_TITLE__: book.documentTitle,
    __SHELFMADE_PAGE_SIZE__: renderPageSize(book.pageSize),
    __SHELFMADE_STYLESHEETS__: stylesheets,
    __SHELFMADE_BOOK_ROOT__: body,
    __SHELFMADE_TOPBAR__: renderTopbar('Visual Editor'),
    // path is the save route's write target - server-side only, never sent to the browser
    __SHELFMADE_CHAPTERS_JSON__: JSON.stringify(
      book.chapters.map(({ slug, title, content }) => ({ slug, title, content })),
    ),
    __SHELFMADE_SLUG_JSON__: JSON.stringify(slug),
    __SHELFMADE_DEBOUNCE_MS__: String(PREVIEW_REMOUNT_DEBOUNCE_MS),
    __SHELFMADE_ENTRY_URL__: `/@fs${resolve(SRC_DIR, 'client/book-page.tsx')}`,
  })

  // transformIndexHtml also injects Vite's HMR client, intercepted once remount logic lands
  return server.transformIndexHtml(url, html)
}

async function serveIndexPage(server: ViteDevServer, root: string, url: string) {
  const books = (await resolveBooksViaVite(server, root)).map(({ slug, title }) => ({
    slug,
    title,
  }))
  const { renderIndexBody } = await server.ssrLoadModule(
    resolve(SRC_DIR, 'client/render-index.tsx'),
  )
  const template = readFileSync(resolve(SRC_DIR, 'client/index.html'), 'utf-8')

  const html = fillTemplate(template, {
    __SHELFMADE_TOPBAR__: renderTopbar('Books'),
    __SHELFMADE_BOOKS_ROOT__: renderIndexBody(books),
    __SHELFMADE_BOOKS_JSON__: JSON.stringify(books),
    __SHELFMADE_ENTRY_URL__: `/@fs${resolve(SRC_DIR, 'client/index-page.tsx')}`,
  })

  return server.transformIndexHtml(url, html)
}
