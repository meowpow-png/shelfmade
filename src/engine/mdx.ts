import { readFileSync } from 'node:fs'
import { evaluateSync } from '@mdx-js/mdx'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'

import { type MDXModule } from 'mdx/types'

// Explicit return type: a spread object literal doesn't keep MDXModule's index
// signature on its own, which would drop access to the dynamically-injected
// `frontmatter` export
export function readMdx(path: string): MDXModule & { source: string } {
  const source = readFileSync(path, 'utf-8')

  try {
    const mdxModule = evaluateSync(source, {
      Fragment,
      jsx,
      jsxs,
      remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: 'frontmatter' }]],
    })
    return { ...mdxModule, source }
  } catch (error) {
    throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
