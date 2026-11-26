import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

import { init } from '../../src/cli/init'

test('a quote in the project name round-trips through book.json as valid JSON', () => {
  const parent = mkdtempSync(join(tmpdir(), 'shelfmade-init-'))
  const root = join(parent, 'Marin"s Book')

  try {
    init(root, false)

    const [slug] = readdirSync(join(root, 'books'))
    const bookJson = readFileSync(join(root, 'books', slug!, 'book.json'), 'utf-8')

    expect(JSON.parse(bookJson)).toEqual({ title: 'Marin"s Book' })
  } finally {
    rmSync(parent, { recursive: true, force: true })
  }
})
