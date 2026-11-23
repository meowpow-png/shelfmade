import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { type ViteDevServer } from 'vite'

import { readMdx } from '@/engine/mdx'
import { resolvePageSize } from '@/engine/page-format'
import { type Book } from '@/engine/render'
import {
  loadConfigViaVite,
  type Chapter,
  type Components,
  type LayoutProps,
  type ShelfmadeConfig,
} from '@/config'

// Mirrors resolveBooks, but loads the config through Vite's SSR module graph
// so component imports participate in Vite's live resolution and invalidation.
export async function resolveBooksViaVite(server: ViteDevServer, root: string): Promise<Book[]> {
  const config = await loadConfigViaVite(server, root)
  return resolveBooks(config, root, { backfillOrder: true })
}

// backfillOrder is dev-server only - a build must never write to source content
export async function resolveBooks(
  config: ShelfmadeConfig,
  root: string,
  { backfillOrder = false }: { backfillOrder?: boolean } = {},
): Promise<Book[]> {
  return Promise.all(
    Object.entries(config.books).map(async ([slug, book]) => {
      const dir = resolve(root, book.dir ?? join('books', slug))
      const contentDir = resolve(dir, book.content ?? 'content')
      const components = { ...config.components, ...book.components }
      const chapters = await readChapters(contentDir, components, backfillOrder)
      const Layout = book.App ?? DefaultLayout

      return {
        slug,
        title: book.title,
        documentTitle: config.titlePrefix ? `${config.titlePrefix} — ${book.title}` : book.title,
        lang: book.lang ?? config.lang ?? 'en',
        pageSize: resolvePageSize(book.pageFormat ?? config.pageFormat ?? 'A5'),
        dir,
        // path is for vite-server.tsx's save route only - never sent to the browser
        chapters: chapters.map(({ slug, frontmatter, content }) => ({
          slug,
          title: typeof frontmatter.title === 'string' ? frontmatter.title : slug,
          content,
          path: join(contentDir, `${slug}.mdx`),
          order: typeof frontmatter.order === 'number' ? frontmatter.order : undefined,
        })),
        App: () => <Layout title={book.title} chapters={chapters} />,
      }
    }),
  )
}

const LOCK_STALE_MS = 30_000
const LOCK_WAIT_MS = 10_000
const LOCK_RETRY_MS = 50

// Atomic mkdir as a cross-process mutex against the backfill below
export async function withOrderLock<T>(contentDir: string, fn: () => T | Promise<T>): Promise<T> {
  const lockPath = join(contentDir, '.order.lock')
  const start = Date.now()

  while (true) {
    try {
      mkdirSync(lockPath)
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      if (Date.now() - statSync(lockPath).mtimeMs > LOCK_STALE_MS) {
        try {
          rmSync(lockPath, { recursive: true })
        } catch {
          // Reclaimed by another process - fine, just retry
        }
      }
      if (Date.now() - start > LOCK_WAIT_MS)
        throw new Error(`Timed out acquiring order lock: ${contentDir}`)
      await new Promise((resolveDelay) => setTimeout(resolveDelay, LOCK_RETRY_MS))
    }
  }

  try {
    return await fn()
  } finally {
    rmSync(lockPath, { recursive: true, force: true })
  }
}

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n*/

// Edits the order line as text, to avoid needing a YAML serializer
export function withOrder(source: string, order: number): string {
  const match = source.match(FRONTMATTER_PATTERN)
  if (!match) return `---\norder: ${order}\n---\n\n${source}`

  const inner = match[1] ?? ''
  const nextInner = /^order:/m.test(inner)
    ? inner.replace(/^order:.*$/m, `order: ${order}`)
    : `${inner}\norder: ${order}`

  return `---\n${nextInner}\n---\n\n${source.slice(match[0].length)}`
}

// Quoted/escaped since a user-typed title, unlike order's number, can contain YAML-breaking characters
export function withTitle(source: string, title: string): string {
  const value = `"${title.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  const match = source.match(FRONTMATTER_PATTERN)
  if (!match) return `---\ntitle: ${value}\n---\n\n${source}`

  const inner = match[1] ?? ''
  const nextInner = /^title:/m.test(inner)
    ? inner.replace(/^title:.*$/m, `title: ${value}`)
    : `${inner}\ntitle: ${value}`

  return `---\n${nextInner}\n---\n\n${source.slice(match[0].length)}`
}

async function readChapters(
  contentDir: string,
  components: Components,
  backfillOrder: boolean,
): Promise<Chapter[]> {
  const chapters = readChaptersUnlocked(contentDir, components, false)
  if (!backfillOrder || chapters.every((chapter) => typeof chapter.frontmatter.order === 'number'))
    return chapters

  // Re-read after locking so concurrent backfills see the latest orders.
  return withOrderLock(contentDir, () => readChaptersUnlocked(contentDir, components, true))
}

function readChaptersUnlocked(
  contentDir: string,
  components: Components,
  backfillOrder: boolean,
): Chapter[] {
  const parsed = readdirSync(contentDir)
    .filter((file) => file.endsWith('.mdx'))
    // Numeric collation keeps chapter-10 after chapter-9
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => {
      const path = join(contentDir, file)
      const { default: Content, frontmatter, source } = readMdx(path)
      const chapterFrontmatter = (frontmatter ?? {}) as Chapter['frontmatter']
      return {
        path,
        slug: basename(file, '.mdx'),
        frontmatter: chapterFrontmatter,
        source,
        Content,
      }
    })

  const existingOrders = parsed
    .map((chapter) => chapter.frontmatter.order)
    .filter((order): order is number => typeof order === 'number')
  let nextOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1

  // Eager backfill: assigns and writes a missing order immediately
  const chapters = backfillOrder
    ? parsed.map((chapter) => {
        if (typeof chapter.frontmatter.order === 'number') return chapter

        const order = nextOrder++
        const source = withOrder(chapter.source, order)
        writeFileSync(chapter.path, source)
        return { ...chapter, frontmatter: { ...chapter.frontmatter, order }, source }
      })
    : parsed

  // Order-less chapters sort last, tie-broken by parsed's existing filename order
  return chapters
    .sort((a, b) => {
      const orderA = typeof a.frontmatter.order === 'number' ? a.frontmatter.order : Infinity
      const orderB = typeof b.frontmatter.order === 'number' ? b.frontmatter.order : Infinity
      return orderA - orderB
    })
    .map(({ path, slug, frontmatter, source, Content }) => ({
      slug,
      frontmatter,
      content: source,
      // Called directly rather than rendered as <Content />, so errors MDX
      // raises while rendering (like a missing component) name the chapter
      Body: () => {
        try {
          return Content({ components })
        } catch (error) {
          throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`)
        }
      },
    }))
}

function DefaultLayout({ chapters }: LayoutProps) {
  return chapters.map(({ slug, Body }) => (
    <section key={slug} className="chapter">
      <Body />
    </section>
  ))
}
