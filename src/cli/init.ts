import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, sep } from 'node:path'

import { displayPath } from '@/cli/display-path'

// dist/cli/init.js sits two levels below the package root
const PACKAGE_ROOT = join(__dirname, '../..')
const TEMPLATE_DIR = join(PACKAGE_ROOT, 'template')

// npm leaves .gitignore files out of published packages,
// so the template stores it under another name.
const RENAMES: Record<string, string> = { gitignore: '.gitignore' }

interface PackageJson {
  version: string
  devDependencies: Record<string, string>
}

export function init(root: string, link: boolean) {
  const name = basename(root)
  const slug = slugify(name)
  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as PackageJson
  const values: Record<string, string> = {
    slug,
    // Escaped for the JSON string in book.json
    title: title(name, slug).replace(/[\\"]/g, '\\$&'),
    // A link points at this checkout, for trying Shelfmade before it's published
    shelfmade: link ? `file:${linkPath(root)}` : `^${pkg.version}`,
    typesReact: pkg.devDependencies['@types/react'] ?? 'latest',
  }

  const files = templateFiles().map((file) => ({
    from: join(TEMPLATE_DIR, file),
    to: join(root, rename(file, slug)),
  }))

  const existing = files.filter(({ to }) => existsSync(to)).map(({ to }) => relative(root, to))
  if (existing.length > 0) {
    throw new Error(
      `Not creating a book project, these files already exist: ${existing.join(', ')}`,
    )
  }

  for (const { from, to } of files) {
    mkdirSync(dirname(to), { recursive: true })
    writeFileSync(to, fill(readFileSync(from, 'utf-8'), values))
  }

  const location = displayPath(root)
  const steps = [...(location ? [`cd ${shellQuote(location)}`] : []), 'npm install', 'npm run dev']
  console.log(`Created a book project in ${location || name}\n\nNext:`)
  console.log(steps.map((step) => `  ${step}`).join('\n'))
}

function templateFiles() {
  return readdirSync(TEMPLATE_DIR, { recursive: true, encoding: 'utf-8' })
    .filter((file) => statSync(join(TEMPLATE_DIR, file)).isFile())
    .sort()
}

// The template's books/book directory becomes
// books/<slug>, where the config looks for the book by default.
function rename(file: string, slug: string) {
  const name = basename(file)
  const dir = dirname(file).split(sep)
  if (dir[0] === 'books' && dir[1] === 'book') {
    dir[1] = slug
  }
  return join(...dir, RENAMES[name] ?? name)
}

function fill(text: string, values: Record<string, string>) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match)
}

// Relative, so the link survives moving both folders, unless the absolute path is shorter
function linkPath(root: string) {
  const path = relative(root, PACKAGE_ROOT).split(sep).join('/')
  return path.length < PACKAGE_ROOT.length ? path : PACKAGE_ROOT
}

export function slugify(name: string) {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
  return slug || 'my-book'
}

// A folder named like a slug becomes "My Book"; any other name is kept as typed
function title(name: string, slug: string) {
  if (name !== slug) {
    return name
  }

  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function shellQuote(path: string) {
  return /^[\w./-]+$/.test(path) ? path : `'${path.replace(/'/g, `'\\''`)}'`
}
