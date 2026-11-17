import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { type ViteDevServer } from 'vite'

import { CONFIG_FILE } from '@/config/load-config'
import { type ShelfmadeConfig } from '@/config/types'

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

  if (typeof config !== 'object' || config === null || !('books' in config)) {
    throw new Error(`${CONFIG_FILE} must export default defineConfig({ books: { … } })`)
  }

  return config as ShelfmadeConfig
}
