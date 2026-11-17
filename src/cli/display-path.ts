import { relative } from 'node:path'

export function displayPath(path: string) {
  const relativePath = relative(process.cwd(), path)
  return relativePath.startsWith('..') ? path : relativePath
}
