import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test as base, type APIResponse } from '@playwright/test'

import { startViteServer } from '../../src/cli/vite-server'
import { resolveBooks, withOrder } from '../../src/engine/books'
import {
  acquireBookIntegrationLock,
  chapterPath,
  createBookSandbox,
  type BookSandbox,
} from '../book-sandbox'

const FIELD_NOTES_FILES = ['chapter-1.mdx', 'chapter-2.mdx', 'chapter-3.mdx'] as const

interface FieldNotesFixture {
  bytes: (file: string) => Buffer
  files: readonly string[]
  load: (backfillOrder?: boolean) => ReturnType<typeof resolveBooks>[number]
  orderOf: (file: string) => number
  sandbox: BookSandbox
  setOrder: (file: string, order: number) => void
  source: (file: string) => string
}

interface BookOrderServerFixture {
  baseURL: string
  reorder: (chapterSlug: string, order: number) => Promise<APIResponse>
}

interface BookFixtures {
  bookOrderServer: BookOrderServerFixture
  fieldNotes: FieldNotesFixture
}

function clearOrder(sandbox: BookSandbox, file: string) {
  const path = chapterPath(sandbox, 'field-notes', file)
  writeFileSync(path, readFileSync(path, 'utf-8').replace(/^order:.*\n/m, ''))
}

export const test = base.extend<BookFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires object destructuring.
  fieldNotes: async ({}, provide) => {
    const sandbox = createBookSandbox()

    // The copied example content is not guaranteed to be order-less or filename-ordered.
    FIELD_NOTES_FILES.forEach((file) => clearOrder(sandbox, file))

    const pathOf = (file: string) => chapterPath(sandbox, 'field-notes', file)
    const source = (file: string) => readFileSync(pathOf(file), 'utf-8')

    try {
      await provide({
        bytes: (file) => readFileSync(pathOf(file)),
        files: FIELD_NOTES_FILES,
        load: (backfillOrder = true) => {
          const [book] = resolveBooks(
            { books: { 'field-notes': { title: 'Field Notes' } } },
            sandbox.root,
            { backfillOrder },
          )
          return book!
        },
        orderOf: (file) => Number(source(file).match(/^order:\s*(\d+)/m)?.[1]),
        sandbox,
        setOrder: (file, order) => writeFileSync(pathOf(file), withOrder(source(file), order)),
        source,
      })
    } finally {
      sandbox.cleanup()
    }
  },
  bookOrderServer: async ({ fieldNotes, request }, provide, testInfo) => {
    const releaseLock = await acquireBookIntegrationLock()
    const port = 8899 + testInfo.workerIndex

    try {
      const server = await startViteServer(fieldNotes.sandbox.root, port)
      const baseURL = `http://127.0.0.1:${port}`

      // Warm eager backfill so assertions measure only the reorder's writes.
      await request.get(`${baseURL}/field-notes-chapters`)

      try {
        await provide({
          baseURL,
          reorder: (chapterSlug, order) =>
            request.put(`${baseURL}/books/field-notes/chapters/${chapterSlug}/order`, {
              data: String(order),
            }),
        })
      } finally {
        await server.close()
      }
    } finally {
      releaseLock()
    }
  },
})

export { expect }
