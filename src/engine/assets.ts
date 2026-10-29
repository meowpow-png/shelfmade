import { cpSync, mkdirSync, statSync } from 'node:fs'

const SOURCE_EXTENSIONS = /\.(tsx?|mdx)$/

export function copyAssets(from: string, to: string) {
  mkdirSync(to, { recursive: true })
  cpSync(from, to, {
    recursive: true,
    filter: (source) => statSync(source).isDirectory() || !SOURCE_EXTENSIONS.test(source),
  })
}
