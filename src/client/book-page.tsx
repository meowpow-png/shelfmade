import { createRoot } from 'react-dom/client'

import { resolveBookInBrowser } from '@/client/resolve-book'

declare global {
  interface Window {
    __SHELFMADE_BOOK_SLUG__: string
    // Exposed by paged.polyfill as the Previewer instance; called manually
    // since PagedConfig.auto is false in dev
    PagedPolyfill?: { preview: () => Promise<unknown> }
  }
}

const container = document.getElementById('book-root')

if (container) {
  mount(container)
}

async function mount(container: HTMLElement) {
  const book = await resolveBookInBrowser(window.__SHELFMADE_BOOK_SLUG__)
  if (!book) return

  const { App } = book
  createRoot(container).render(<App />)

  // One frame so layout settles before paged.js measures it
  requestAnimationFrame(() => {
    window.PagedPolyfill?.preview()
  })
}
