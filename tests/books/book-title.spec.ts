import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

import { withTitle } from '../../src/engine/books'
import { readMdx } from '../../src/engine/mdx'

// Round-trips through the real parser so a "looks right as text" escaping bug still gets caught
function roundTrip(initialSource: string, title: string): unknown {
  const dir = mkdtempSync(join(tmpdir(), 'shelfmade-title-'))
  const path = join(dir, 'chapter.mdx')
  writeFileSync(path, withTitle(initialSource, title))

  try {
    const { frontmatter } = readMdx(path)
    return (frontmatter as Record<string, unknown> | undefined)?.title
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('a plain title round-trips unchanged', () => {
  expect(roundTrip('# Body\n', 'Chapter One')).toBe('Chapter One')
})

test('a colon in the title does not break the frontmatter block', () => {
  expect(roundTrip('---\norder: 1\n---\n\nBody\n', 'Trouble: A Story')).toBe('Trouble: A Story')
})

test('an embedded double quote round-trips correctly', () => {
  expect(roundTrip('', 'She said "hi"')).toBe('She said "hi"')
})

test('an empty title round-trips to an empty string, not undefined', () => {
  expect(roundTrip('---\norder: 1\n---\n\n', '')).toBe('')
})
