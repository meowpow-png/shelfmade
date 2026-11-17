import { hydrateRoot } from 'react-dom/client'

import { BooksPage, type BookSummary } from '@/client/BooksPage'

import '@/runtime/fonts.css'
import '@/runtime/index.css'
import '@/runtime/tokens.css'

declare global {
  interface Window {
    __SHELFMADE_BOOKS__: BookSummary[]
  }
}

const root = document.getElementById('books-root')

if (root) {
  hydrateRoot(root, <BooksPage books={window.__SHELFMADE_BOOKS__} />)
}
