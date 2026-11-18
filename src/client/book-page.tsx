import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { resolveBookInBrowser } from '@/client/resolve-book'

interface Previewer {
  preview(content: Node, stylesheets: unknown[], renderTo: HTMLElement): Promise<unknown>
  removeStyles(doc?: Document): unknown[]
  chunker: { removePages(): void }
  // Each preview() call inserts its converted CSS as new <style> tags
  // appended straight to the live document.head
  polisher: { inserted: HTMLStyleElement[] }
}

declare global {
  interface Window {
    __SHELFMADE_BOOK_SLUG__: string
    __SHELFMADE_REMOUNT_DEBOUNCE_MS__: number
    PAGED_READY?: boolean
    // Fresh instance per mount - a Previewer rebuilds pages in place on reuse
    Paged: { Previewer: new () => Previewer }
  }
}

const container = document.getElementById('book-root')

if (container) {
  scheduleMount(container)
}

// Self-accepting avoids Vite's full-page-reload fallback on chapter/config changes
if (import.meta.hot) {
  import.meta.hot.accept()
}

// Debounces saves into one remount; timer lives on hot.data since module scope resets on reload
function scheduleMount(container: HTMLElement) {
  const hot = import.meta.hot
  if (!hot) {
    mount(container)
    return
  }

  if (!hot.data.initialized) {
    hot.data.initialized = true
    mount(container)
    return
  }

  clearTimeout(hot.data.remountTimer)
  hot.data.remountTimer = setTimeout(
    () => mount(container),
    window.__SHELFMADE_REMOUNT_DEBOUNCE_MS__,
  )
}

// removeStyles() strips print stylesheets once; cached since later passes find nothing left
let stylesheets: unknown[] | undefined

async function mount(container: HTMLElement) {
  window.PAGED_READY = false

  const book = await resolveBookInBrowser(window.__SHELFMADE_BOOK_SLUG__)
  if (!book) return

  const { App } = book

  // Off-screen so the old pages stay visible until the swap
  const scratch = offscreenContainer()
  const root = createRoot(scratch)
  // flushSync guarantees the commit lands before we clone scratch below -
  // a single requestAnimationFrame wasn't a reliable enough signal
  flushSync(() => root.render(<App />))
  await waitForImages(scratch)

  const previewer = new window.Paged.Previewer()
  // hot.data, not module scope - HMR resets module scope on every accepted update
  const hot = import.meta.hot
  // A clone, not the live document - removeStyles() rips the matched
  // stylesheets out of whatever doc it's given, which would strip the
  // still-visible page's own styling until the swap below
  if (hot) {
    hot.data.stylesheets ??= previewer.removeStyles(document.cloneNode(true) as Document)
  } else {
    stylesheets ??= previewer.removeStyles(document.cloneNode(true) as Document)
  }
  const activeStylesheets: unknown[] = hot ? hot.data.stylesheets : stylesheets

  const renderTarget = offscreenContainer()

  // A fragment, not scratch itself - pagedjs clones DOM ancestors when
  // rebuilding pages, which would leak scratch's hidden/fixed style in
  const content = document.createDocumentFragment()
  content.append(...Array.from(scratch.childNodes).map((node) => node.cloneNode(true)))

  await previewer.preview(content, activeStylesheets, renderTarget)

  // Disconnects the old pages' ResizeObservers and removes its injected
  // <style> tags, before the swap below - otherwise old and new
  // pagedjs-inserted styles are both active across the swap
  if (hot) {
    hot.data.previewer?.chunker.removePages()
    hot.data.previewer?.polisher.inserted.forEach((style: HTMLStyleElement) => style.remove())
    hot.data.previewer = previewer
  }

  const pages = renderTarget.firstElementChild
  if (pages) container.replaceChildren(pages)
  // Reveals book-root - hidden since the initial HTML so the unpaginated
  // SSR markup (no page shell, images unconstrained by a page box) is
  // never shown; a no-op once already revealed by an earlier mount
  container.style.visibility = ''
  window.PAGED_READY = true

  root.unmount()
  scratch.remove()
  renderTarget.remove()
}

function offscreenContainer() {
  const element = document.createElement('div')
  element.style.cssText = 'position: fixed; top: 0; left: 0; visibility: hidden;'
  document.body.appendChild(element)
  return element
}

// Avoids pagedjs measuring page height before images load and reflowing later
function waitForImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll('img'))
  return Promise.all(images.map((img) => img.decode().catch(() => {})))
}
