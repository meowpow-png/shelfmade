import { hydrateRoot } from 'react-dom/client'

import { BooksPage, type BookSummary } from '@/client/BooksPage'

// tokens.css must load before index.css - both target html/body at equal specificity
import '@/runtime/tokens.css'
import '@/runtime/fonts.css'
import '@/runtime/index.css'

declare global {
  interface Window {
    __SHELFMADE_BOOKS__: BookSummary[]
  }
}

const root = document.getElementById('books-root')

if (root) {
  hydrateRoot(root, <BooksPage books={window.__SHELFMADE_BOOKS__} />)
}
