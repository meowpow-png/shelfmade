// Imported directly, not via the @/config barrel, which also pulls in
// Node-only loadConfig (esbuild, node:fs) that would otherwise reach
// browser preview bundles
export { defineConfig } from '@/config/define-config'
export type {
  BookConfig,
  Chapter,
  Components,
  Frontmatter,
  LayoutProps,
  PageFormat,
  ShelfmadeConfig,
} from '@/config/types'
