import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build, type Loader, type Plugin } from 'esbuild'

import { type BookConfig, type ShelfmadeConfig } from '@/config/types'

export const CONFIG_FILE = 'shelfmade.config.ts'
export const BOOK_CONFIG_FILE = 'book.config.ts'

// Imports of these always resolve to Shelfmade's own copies, so a book project
// renders with exactly one React no matter how Shelfmade is installed
const SHARED_PACKAGES = /^(react|react-dom|shelfmade)(\/.*)?$/

const LOADERS: Record<string, Loader> = {
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.mts': 'ts',
  '.cts': 'ts',
  '.js': 'js',
  '.jsx': 'jsx',
  '.mjs': 'js',
  '.cjs': 'js',
}

export interface LoadedConfig {
  config: ShelfmadeConfig
  // Every local file the config imports, for watching
  dependencies: string[]
}

export async function loadConfig(root: string): Promise<LoadedConfig> {
  const configPath = resolve(root, CONFIG_FILE)

  if (!existsSync(configPath)) {
    throw new Error(`No ${CONFIG_FILE} found in ${root}`)
  }

  const result = await bundleModule(root, configPath)
  const config = importBundle(root, result.text)
  if (typeof config !== 'object' || config === null) {
    throw new Error(`${CONFIG_FILE} must export default defineConfig({ … })`)
  }

  return {
    config: config as ShelfmadeConfig,
    dependencies: Object.keys(result.inputs).map((input) => resolve(root, input)),
  }
}

// A missing book.config.ts is fine; a missing root config is not
export async function loadBookConfig(root: string, dir: string): Promise<BookConfig | undefined> {
  const configPath = join(dir, BOOK_CONFIG_FILE)

  if (!existsSync(configPath)) {
    return undefined
  }

  const result = await bundleModule(root, configPath)
  const config = importBundle(root, result.text)
  if (typeof config !== 'object' || config === null) {
    throw new Error(`${BOOK_CONFIG_FILE} must export default defineBookConfig({ … })`)
  }

  return config as BookConfig
}

async function bundleModule(
  root: string,
  entryPath: string,
): Promise<{ text: string; inputs: string[] }> {
  const result = await build({
    absWorkingDir: root,
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    metafile: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    jsx: 'automatic',
    packages: 'external',
    logLevel: 'silent',
    define: {
      'import.meta.url': '__shelfmade_import_meta_url',
      'import.meta.dirname': '__shelfmade_dirname',
      'import.meta.filename': '__shelfmade_filename',
      __dirname: '__shelfmade_dirname',
      __filename: '__shelfmade_filename',
    },
    plugins: [sharedPackages(), rejectCss(), originalPaths()],
  })

  const [output] = result.outputFiles
  if (!output) {
    throw new Error(`Bundling ${entryPath} produced no output`)
  }

  return { text: output.text, inputs: Object.keys(result.metafile.inputs) }
}

// The bundle is written inside the project's node_modules so the imports left
// external resolve from the book project, as they would from the config itself
function importBundle(root: string, code: string): unknown {
  const dir = join(root, 'node_modules/.shelfmade')
  const file = join(dir, `config-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`)

  mkdirSync(dir, { recursive: true })
  writeFileSync(file, code)

  try {
    // Node 22.12+ loads ES modules through require(), which tsc leaves
    // intact where it would rewrite a dynamic import() for CommonJS output
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require(file) as { default?: unknown }).default
  } finally {
    delete require.cache[file]
    rmSync(file, { force: true })
  }
}

function sharedPackages(): Plugin {
  return {
    name: 'shelfmade-shared-packages',
    setup(build) {
      build.onResolve({ filter: SHARED_PACKAGES }, ({ path }) => ({
        path: pathToFileURL(require.resolve(path)).href,
        external: true,
      }))
    },
  }
}

function rejectCss(): Plugin {
  return {
    name: 'shelfmade-reject-css',
    setup(build) {
      build.onResolve({ filter: /\.css$/ }, () => ({
        errors: [
          {
            text: 'CSS imports are not supported yet; put stylesheets in the book directory instead',
          },
        ],
      }))
    },
  }
}

// Bundled code runs from a temporary file, so file-relative values are pinned
// to each source file's original location. Only files that use them get the
// constants, which shift columns on their first line in error messages.
function originalPaths(): Plugin {
  return {
    name: 'shelfmade-original-paths',
    setup(build) {
      build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, ({ path }) => {
        const loader = LOADERS[extname(path)]
        if (/[\\/]node_modules[\\/]/.test(path) || !loader) {
          return undefined
        }

        const contents = readFileSync(path, 'utf-8')
        if (!/__dirname|__filename|import\.meta/.test(contents)) {
          return { contents, loader }
        }

        const constants = [
          `const __shelfmade_filename = ${JSON.stringify(path)};`,
          `const __shelfmade_dirname = ${JSON.stringify(dirname(path))};`,
          `const __shelfmade_import_meta_url = ${JSON.stringify(pathToFileURL(path).href)};`,
        ].join('')

        return { contents: constants + contents, loader }
      })
    },
  }
}
