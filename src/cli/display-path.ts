import { relative } from 'node:path'

// Relative to the working directory, unless that would climb out of it
export function displayPath(path: string) {
  const relativePath = relative(process.cwd(), path)
  return relativePath.startsWith('..') ? path : relativePath
}
