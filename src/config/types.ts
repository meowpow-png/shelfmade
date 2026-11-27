import { type ComponentType } from 'react'
import { type MDXComponents } from 'mdx/types'

export type Components = MDXComponents

export type Frontmatter = Record<string, unknown>

export type PageFormat = 'A4' | 'A5' | 'A6' | 'Letter' | { width: string; height: string }

export interface Chapter {
  slug: string
  frontmatter: Frontmatter
  content: string
  Body: ComponentType
}

export interface LayoutProps {
  title: string
  chapters: Chapter[]
}

export interface BookConfig {
  components?: Components
  App?: ComponentType<LayoutProps>
}

export interface ShelfmadeConfig {
  lang?: string
  titlePrefix?: string
  pageFormat?: PageFormat
  components?: Components
}
