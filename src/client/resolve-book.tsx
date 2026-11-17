import { type ComponentType, type FunctionComponent } from 'react'

import { resolvePageSize, type PageSize } from '@/engine/page-format'
import {
  type Chapter,
  type Components,
  type Frontmatter,
  type LayoutProps,
  type ShelfmadeConfig,
} from '@/config'

export interface ClientBook {
  slug: string
  title: string
  documentTitle: string
  lang: string
  pageSize: PageSize
  App: ComponentType
}

interface MdxModule {
  default: FunctionComponent<{ components: Components }>
  frontmatter?: Frontmatter
}

// Tracks every chapter in Vite's module graph, so edits invalidate this
// entry (the Node engine just re-reads via fs instead)
const CHAPTER_MODULES = import.meta.glob<MdxModule>('/**/*.mdx')

export async function resolveBookInBrowser(slug: string): Promise<ClientBook | null> {
  // Literal specifier so Vite can track the config in its HMR graph. Path
  // only exists in the served book project, not this package's TS program,
  // so the type is asserted instead.
  // @ts-expect-error -- see above
  const { default: config } = (await import('/shelfmade.config.ts')) as {
    default: ShelfmadeConfig
  }
  const book = config.books[slug]

  if (!book) return null

  const dir = `/${(book.dir ?? `books/${slug}`).replace(/^\/+/, '')}`
  const contentDir = `${dir}/${book.content ?? 'content'}`
  const components = { ...config.components, ...book.components }
  const chapters = await resolveChapters(contentDir, components)
  const Layout = book.App ?? DefaultLayout

  return {
    slug,
    title: book.title,
    documentTitle: config.titlePrefix ? `${config.titlePrefix} — ${book.title}` : book.title,
    lang: book.lang ?? config.lang ?? 'en',
    pageSize: resolvePageSize(book.pageFormat ?? config.pageFormat ?? 'A5'),
    App: () => <Layout title={book.title} chapters={chapters} />,
  }
}

async function resolveChapters(contentDir: string, components: Components): Promise<Chapter[]> {
  const paths = Object.keys(CHAPTER_MODULES)
    .filter((path) => path.startsWith(`${contentDir}/`))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  const chapters: Chapter[] = []

  for (const path of paths) {
    const load = CHAPTER_MODULES[path]
    if (!load) continue

    const { default: Content, frontmatter } = await load()
    const slug = path.slice(contentDir.length + 1).replace(/\.mdx$/, '')

    chapters.push({
      slug,
      frontmatter: frontmatter ?? {},
      Body: () => Content({ components }),
    })
  }

  return chapters
}

function DefaultLayout({ chapters }: LayoutProps) {
  return chapters.map(({ slug, Body }) => (
    <section key={slug} className="chapter">
      <Body />
    </section>
  ))
}
