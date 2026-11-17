import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer, type ServerResponse } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'

const EVENTS_PATH = '/__shelfmade/events'

// Added to served HTML only, so files on disk stay identical to `build` output.
// It sits in <head> because paged.js reflows everything in <body> into pages.
const RELOAD_SCRIPT = `<script>new EventSource('${EVENTS_PATH}').addEventListener('reload', () => location.reload())</script>`

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
}

export interface DevServer {
  reload: () => void
}

export function startDevServer(outDir: string, port: number): Promise<DevServer> {
  const root = resolve(outDir)
  const clients = new Set<ServerResponse>()

  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost')

    if (pathname === EVENTS_PATH) {
      response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' })
      response.write(': connected\n\n')
      clients.add(response)
      request.on('close', () => clients.delete(response))
      return
    }

    const path = join(root, decodeURIComponent(pathname))
    const file = existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.html') : path

    if ((file !== root && !file.startsWith(root + sep)) || !existsSync(file)) {
      response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found')
      return
    }

    const type = CONTENT_TYPES[extname(file)] ?? 'application/octet-stream'
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' })

    if (extname(file) === '.html') {
      response.end(
        readFileSync(file, 'utf-8').replace('</head>', `    ${RELOAD_SCRIPT}\n  </head>`),
      )
    } else {
      createReadStream(file).pipe(response)
    }
  })

  return new Promise((resolvePromise, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) => {
      reject(
        error.code === 'EADDRINUSE'
          ? new Error(`Port ${port} is already in use; pass --port to use another`)
          : error,
      )
    })
    server.listen(port, '127.0.0.1', () =>
      resolvePromise({
        reload: () => {
          for (const client of clients) {
            client.write('event: reload\ndata:\n\n')
          }
        },
      }),
    )
  })
}
