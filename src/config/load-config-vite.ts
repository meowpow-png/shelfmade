import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { type ViteDevServer } from 'vite'

import { BOOK_CONFIG_FILE, CONFIG_FILE } from '@/config/load-config'
import { type BookConfig, type ShelfmadeConfig } from '@/config/types'

// Loads the book-project config the same way `loadConfig` does for `build`/`pdf`,
// but through Vite's own SSR module graph instead of a one-shot esbuild bundle.
// The caller's Vite server must have @vitejs/plugin-react configured so the
// config's component imports (.tsx) transform correctly.
export async function loadConfigViaVite(
  server: ViteDevServer,
  root: string,
): Promise<ShelfmadeConfig> {
  const configPath = resolve(root, CONFIG_FILE)

  if (!existsSync(configPath)) {
    throw new Error(`No ${CONFIG_FILE} found in ${root}`)
  }

  const module = await server.ssrLoadModule(configPath)
  const config = module.default

  if (typeof config !== 'object' || config === null) {
    throw new Error(`${CONFIG_FILE} must export default defineConfig({ … })`)
  }

  return config as ShelfmadeConfig
}

// Loads book.config.ts through Vite's SSR module graph instead of an esbuild bundle
export async function loadBookConfigViaVite(
  server: ViteDevServer,
  dir: string,
): Promise<BookConfig | undefined> {
  const configPath = join(dir, BOOK_CONFIG_FILE)

  if (!existsSync(configPath)) {
    return undefined
  }

  const module = await server.ssrLoadModule(configPath)
  const config = module.default

  if (typeof config !== 'object' || config === null) {
    throw new Error(`${BOOK_CONFIG_FILE} must export default defineBookConfig({ … })`)
  }

  return config as BookConfig
}
