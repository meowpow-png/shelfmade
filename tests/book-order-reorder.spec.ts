import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { type ViteDevServer } from 'vite'

import { startViteServer } from '../src/cli/vite-server'
import { chapterPath, createBookSandbox, type BookSandbox } from './book-sandbox'

async function setupServer(request: APIRequestContext) {
  const sandbox = createBookSandbox()
  // The real content this copies from isn't guaranteed to be order-less or filename-ordered
  for (const file of ['chapter-1.mdx', 'chapter-2.mdx', 'chapter-3.mdx']) {
    const path = chapterPath(sandbox, 'field-notes', file)
    writeFileSync(path, readFileSync(path, 'utf-8').replace(/^order:.*\n/m, ''))
  }
  const port = 8899 + test.info().workerIndex
  const server = await startViteServer(sandbox.root, port)
  const baseURL = `http://127.0.0.1:${port}`
  // Warms the eager backfill first, so later assertions measure only the reorder's own writes
  await request.get(`${baseURL}/field-notes-chapters`)
  return { sandbox, server, baseURL }
}

async function teardown(sandbox: BookSandbox, server: ViteDevServer) {
  await server.close()
  sandbox.cleanup()
}

function orderOf(sandbox: BookSandbox, file: string) {
  const source = readFileSync(chapterPath(sandbox, 'field-notes', file), 'utf-8')
  return Number(source.match(/^order:\s*(\d+)/m)?.[1])
}

function fileBytes(sandbox: BookSandbox, file: string) {
  return readFileSync(chapterPath(sandbox, 'field-notes', file))
}

test('moving a chapter to the first position renumbers every chapter it passed over', async ({
  request,
}) => {
  const { sandbox, server, baseURL } = await setupServer(request)
  try {
    const response = await request.put(`${baseURL}/books/field-notes/chapters/chapter-3/order`, {
      data: '1',
    })
    expect(response.status()).toBe(204)

    expect(orderOf(sandbox, 'chapter-3.mdx')).toBe(1)
    expect(orderOf(sandbox, 'chapter-1.mdx')).toBe(2)
    expect(orderOf(sandbox, 'chapter-2.mdx')).toBe(3)
  } finally {
    await teardown(sandbox, server)
  }
})

test('an adjacent swap only touches the two chapters involved', async ({ request }) => {
  const { sandbox, server, baseURL } = await setupServer(request)
  try {
    const untouchedBefore = fileBytes(sandbox, 'chapter-3.mdx')

    const response = await request.put(`${baseURL}/books/field-notes/chapters/chapter-2/order`, {
      data: '1',
    })
    expect(response.status()).toBe(204)

    expect(orderOf(sandbox, 'chapter-2.mdx')).toBe(1)
    expect(orderOf(sandbox, 'chapter-1.mdx')).toBe(2)
    expect(fileBytes(sandbox, 'chapter-3.mdx')).toEqual(untouchedBefore)
  } finally {
    await teardown(sandbox, server)
  }
})

test('requesting a chapter at its current position writes nothing', async ({ request }) => {
  const { sandbox, server, baseURL } = await setupServer(request)
  try {
    const files = ['chapter-1.mdx', 'chapter-2.mdx', 'chapter-3.mdx']
    const before = files.map((file) => fileBytes(sandbox, file))

    const response = await request.put(`${baseURL}/books/field-notes/chapters/chapter-2/order`, {
      data: '2',
    })
    expect(response.status()).toBe(204)

    const after = files.map((file) => fileBytes(sandbox, file))
    expect(after).toEqual(before)
  } finally {
    await teardown(sandbox, server)
  }
})
