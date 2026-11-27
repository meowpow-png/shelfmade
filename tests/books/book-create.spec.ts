import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { resolveBooks } from '../../src/engine/books'
import { expect, test } from './test'

test('scaffolds book.json and an empty content dir, returning the derived slug', async ({
  bookCreateServer,
}) => {
  const response = await bookCreateServer.create('My New Book')
  expect(response.status()).toBe(201)
  expect(await response.json()).toEqual({ slug: 'my-new-book', title: 'My New Book' })

  const bookDir = join(bookCreateServer.sandbox.root, 'books', 'my-new-book')
  expect(JSON.parse(readFileSync(join(bookDir, 'book.json'), 'utf-8'))).toEqual({
    title: 'My New Book',
  })

  expect(readdirSync(join(bookDir, 'content'))).toEqual([])
})

test('a second book with a colliding title gets a deduped slug', async ({ bookCreateServer }) => {
  const first = await bookCreateServer.create('Field Guide')
  expect(await first.json()).toEqual({ slug: 'field-guide', title: 'Field Guide' })

  const second = await bookCreateServer.create('Field Guide')
  expect(await second.json()).toEqual({ slug: 'field-guide-2', title: 'Field Guide' })
})

test('the new book is immediately visible to resolveBooks', async ({ bookCreateServer }) => {
  await bookCreateServer.create('Visible Right Away')

  const books = await resolveBooks({}, bookCreateServer.sandbox.root)
  expect(books.map((book) => book.slug)).toContain('visible-right-away')
})
