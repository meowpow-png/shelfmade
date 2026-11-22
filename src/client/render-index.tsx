import { renderToString } from 'react-dom/server'

import { BooksPage, type BookSummary } from '@/client/BooksPage'

// Loaded via ssrLoadModule only; BooksPage transitively uses the Vite-only ?raw SVG import
export function renderIndexBody(books: BookSummary[]) {
  return renderToString(<BooksPage books={books} />)
}
