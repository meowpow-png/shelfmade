import { resolve } from 'node:path'
import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { createServer, type ViteDevServer } from 'vite'

import { resolveBooksViaVite } from '@/engine/books'

// src/ next to dist/ when built, or this package's own src/ in dev
const SRC_DIR = resolve(__dirname, '../../src')
const PACKAGE_ROOT = resolve(__dirname, '../..')

export async function startViteServer(root: string, port: number): Promise<ViteDevServer> {
  const server = await createServer({
    root,
    // No index.html/SPA entry yet; routes are added below
    appType: 'custom',
    server: { port, host: '127.0.0.1', strictPort: true, fs: { allow: [root, PACKAGE_ROOT] } },
    resolve: { alias: { '@': SRC_DIR } },
    // shelfmade is file:-linked; treat it as a normal dependency, not local source
    ssr: { external: ['shelfmade'] },
    plugins: [
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

  await server.listen()
  server.printUrls()

  return server
}

async function serveIndexPage(server: ViteDevServer, root: string, url: string) {
  const books = (await resolveBooksViaVite(server, root)).map(({ slug, title }) => ({ slug, title }))
  const { renderIndexBody } = await server.ssrLoadModule(resolve(SRC_DIR, 'client/render-index.tsx'))
  const entryUrl = `/@fs${resolve(SRC_DIR, 'client/index-page.tsx')}`

  return server.transformIndexHtml(
    url,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Books</title>
  </head>
  <body>
    <div class="topbar">
      <p class="topbar-wordmark">Shelfmade</p>
      <div class="topbar-divider"></div>
      <span class="topbar-label">Books</span>
    </div>
    <div id="books-root">${renderIndexBody(books)}</div>
    <script>window.__SHELFMADE_BOOKS__ = ${JSON.stringify(books)}</script>
    <script type="module" src="${entryUrl}"></script>
  </body>
</html>
`,
  )
}
