import { readdirSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { readMdx } from '@/engine/mdx'
import { resolvePageSize } from '@/engine/page-format'
import { type Book } from '@/engine/render'
import { type Chapter, type Components, type LayoutProps, type ShelfmadeConfig } from '@/config'

export function resolveBooks(config: ShelfmadeConfig, root: string): Book[] {
  return Object.entries(config.books).map(([slug, book]) => {
    const dir = resolve(root, book.dir ?? join('books', slug))
    const components = { ...config.components, ...book.components }
    const chapters = readChapters(resolve(dir, book.content ?? 'content'), components)
    const Layout = book.App ?? DefaultLayout

    return {
      slug,
      title: book.title,
      documentTitle: config.titlePrefix ? `${config.titlePrefix} — ${book.title}` : book.title,
      lang: book.lang ?? config.lang ?? 'en',
      pageSize: resolvePageSize(book.pageFormat ?? config.pageFormat ?? 'A5'),
      dir,
      App: () => <Layout title={book.title} chapters={chapters} />,
    }
  })
}

function readChapters(contentDir: string, components: Components): Chapter[] {
  return (
    readdirSync(contentDir)
      .filter((file) => file.endsWith('.mdx'))
      // Numeric collation keeps chapter-10 after chapter-9
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((file) => {
        const { default: Content, frontmatter } = readMdx(join(contentDir, file))

        return {
          slug: basename(file, '.mdx'),
          frontmatter: (frontmatter ?? {}) as Chapter['frontmatter'],
          Body: () => <Content components={components} />,
        }
      })
  )
}

function DefaultLayout({ chapters }: LayoutProps) {
  return chapters.map(({ slug, Body }) => (
    <section key={slug} className="chapter">
      <Body />
    </section>
  ))
}
