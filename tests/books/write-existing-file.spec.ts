import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

import { writeExistingFile } from '../../src/cli/vite-server'
import { chapterPath, createBookSandbox } from '../book-sandbox'

test('writes to an existing file and returns true', () => {
  const sandbox = createBookSandbox()

  try {
    const path = chapterPath(sandbox, 'field-notes', 'chapter-1.mdx')

    const wrote = writeExistingFile(path, () => writeFileSync(path, 'replaced content'))

    expect(wrote).toBe(true)
    expect(readFileSync(path, 'utf-8')).toBe('replaced content')
  } finally {
    sandbox.cleanup()
  }
})

test('returns false without throwing when the target file is gone', () => {
  const sandbox = createBookSandbox()

  try {
    const path = chapterPath(sandbox, 'field-notes', 'does-not-exist.mdx')

    const wrote = writeExistingFile(path, () => {
      readFileSync(path, 'utf-8')
    })

    expect(wrote).toBe(false)
  } finally {
    sandbox.cleanup()
  }
})

test('still throws for errors other than a missing file', () => {
  const sandbox = createBookSandbox()

  try {
    const path = chapterPath(sandbox, 'field-notes', 'chapter-1.mdx')

    expect(() =>
      writeExistingFile(path, () => {
        throw Object.assign(new Error('boom'), { code: 'EACCES' })
      }),
    ).toThrow('boom')
  } finally {
    sandbox.cleanup()
  }
})
