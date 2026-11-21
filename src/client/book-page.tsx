import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { Editor, type EditorChapter } from '@/client/Editor'
import { resolveBookInBrowser } from '@/client/resolve-book'

interface Previewer {
  preview(content: Node, stylesheets: unknown[], renderTo: HTMLElement): Promise<unknown>
  removeStyles(doc?: Document): unknown[]
  chunker: { removePages(): void }
  // preview() appends its generated page-box CSS here, as <style> tags in its own document.head
  polisher: { inserted: HTMLStyleElement[] }
}

interface PreviewWindow extends Window {
  // Previewer rebuilds pages in place on reuse - always construct a fresh one per mount
  Paged: { Previewer: new () => Previewer }
}

declare global {
  interface Window {
    __SHELFMADE_BOOK_SLUG__: string
    __SHELFMADE_REMOUNT_DEBOUNCE_MS__: number
    __SHELFMADE_CHAPTERS__: EditorChapter[]
    PAGED_READY?: boolean
  }
}

const container = document.getElementById('book-root')

if (container) {
  scheduleMount(container)
}

const editorContainer = document.getElementById('editor-root')

if (editorContainer) {
  mountEditor(editorContainer)
}

// Self-accepting avoids Vite's full-page-reload fallback on chapter/config changes
if (import.meta.hot) {
  import.meta.hot.accept()
}

// Root is cached on hot.data - re-running createRoot on the same container on every remount warns
function mountEditor(container: HTMLElement) {
  const hot = import.meta.hot
  const root = hot ? (hot.data.editorRoot ??= createRoot(container)) : createRoot(container)
  root.render(
    <Editor
      chapters={window.__SHELFMADE_CHAPTERS__}
      bookSlug={window.__SHELFMADE_BOOK_SLUG__}
      saveDebounceMs={window.__SHELFMADE_REMOUNT_DEBOUNCE_MS__}
    />,
  )
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
// Built once and reused - rebuilding per edit would re-fetch pagedjs + its plugins every keystroke
let previewFramePromise: Promise<{ doc: Document; win: PreviewWindow }> | undefined
// This mount's copy of the frame's page-box CSS, kept to remove on the next mount
let mainStyleTags: HTMLStyleElement[] | undefined

async function mount(container: HTMLElement) {
  window.PAGED_READY = false

  const book = await resolveBookInBrowser(window.__SHELFMADE_BOOK_SLUG__)
  if (!book) return

  const { App } = book

  // Off-screen so the old pages stay visible until the swap
  const scratch = offscreenContainer(document)
  const root = createRoot(scratch)
  // flushSync guarantees the commit lands before we clone scratch below -
  // a single requestAnimationFrame wasn't a reliable enough signal
  flushSync(() => root.render(<App />))
  await waitForImages(scratch)

  const hot = import.meta.hot
  // Isolated so pagedjs's generated <style> tags land in the frame's head,
  // not ours - otherwise they'd reflow the still-visible old page mid-pagination
  const { doc: frameDoc, win: frameWin } = await (hot
    ? (hot.data.previewFramePromise ??= createPreviewFrame())
    : (previewFramePromise ??= createPreviewFrame()))

  const previewer = new frameWin.Paged.Previewer()
  // A clone, not the live frame doc - removeStyles() rips the matched
  // stylesheets out of whatever doc it's given
  if (hot) {
    hot.data.stylesheets ??= previewer.removeStyles(frameDoc.cloneNode(true) as Document)
  } else {
    stylesheets ??= previewer.removeStyles(frameDoc.cloneNode(true) as Document)
  }
  const activeStylesheets: unknown[] = hot ? hot.data.stylesheets : stylesheets

  const renderTarget = offscreenContainer(frameDoc)

  // Owned by frameDoc, not scratch - pagedjs clones DOM ancestors when
  // rebuilding pages, which would leak scratch's hidden/fixed style in
  const content = frameDoc.createDocumentFragment()
  content.append(...Array.from(scratch.childNodes).map((node) => frameDoc.importNode(node, true)))

  await previewer.preview(content, activeStylesheets, renderTarget)

  // Disconnects the old pages' ResizeObservers and removes its <style> tags
  // before the swap below, so old and new pagedjs styles are never both active
  if (hot) {
    hot.data.previewer?.chunker.removePages()
    hot.data.previewer?.polisher.inserted.forEach((style: HTMLStyleElement) => style.remove())
    hot.data.previewer = previewer
  }

  // polisher.inserted lives in the frame's head, not ours - the adopted
  // pages don't bring their page-box CSS with them, so it's copied over here
  const mainDocStyles = (hot ? hot.data.mainDocStyles : mainStyleTags) ?? []
  mainDocStyles.forEach((style: HTMLStyleElement) => style.remove())
  const newMainDocStyles = previewer.polisher.inserted.map((style: HTMLStyleElement) => {
    const copy = document.createElement('style')
    copy.textContent = style.textContent
    document.head.appendChild(copy)
    return copy
  })
  if (hot) {
    hot.data.mainDocStyles = newMainDocStyles
  } else {
    mainStyleTags = newMainDocStyles
  }

  const pages = renderTarget.firstElementChild
  if (pages) {
    // Moves the finished pages from the frame's document into ours
    document.adoptNode(pages)
    container.replaceChildren(pages)
  }
  // Reveals book-root - hidden since the initial HTML so the unpaginated
  // SSR markup (no page shell, images unconstrained by a page box) is
  // never shown; a no-op once already revealed by an earlier mount
  container.style.visibility = ''
  window.PAGED_READY = true

  root.unmount()
  scratch.remove()
  renderTarget.remove()
}

function offscreenContainer(doc: Document) {
  const element = doc.createElement('div')
  element.style.cssText = 'position: fixed; top: 0; left: 0; visibility: hidden;'
  doc.body.appendChild(element)
  return element
}

// Avoids pagedjs measuring page height before images load and reflowing later
function waitForImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll('img'))
  return Promise.all(images.map((img) => img.decode().catch(() => {})))
}

// Mirrors the main <head> (book stylesheets, pagedjs, its pagination
// plugins) into a hidden iframe, so pagedjs's previewer runs in isolation
function createPreviewFrame(): Promise<{ doc: Document; win: PreviewWindow }> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe')
    // Not visibility:hidden or off-screen - either makes browsers throttle
    // rAF in iframes, which stalls pagedjs's rAF-driven pagination loop
    frame.style.cssText =
      'position: fixed; top: 0; left: 0; width: 1px; height: 1px; opacity: 0; border: 0;'
    frame.addEventListener(
      'load',
      () => {
        const doc = frame.contentDocument!
        const win = frame.contentWindow as unknown as PreviewWindow

        const loads: Promise<void>[] = []
        for (const node of Array.from(document.head.children)) {
          // The client entry is the one thing that must never run twice
          if (node.tagName === 'SCRIPT' && node.getAttribute('type') === 'module') continue

          // Build fresh, don't clone - a cloned <script> keeps the
          // original's "already started" flag and silently never
          // (re-)executes or fires load/error, hanging this forever
          const clone: HTMLElement =
            node.tagName === 'SCRIPT'
              ? (() => {
                  const script = doc.createElement('script')
                  for (const { name, value } of Array.from(
                    (node as HTMLScriptElement).attributes,
                  )) {
                    script.setAttribute(name, value)
                  }
                  script.textContent = node.textContent
                  return script
                })()
              : (doc.importNode(node, true) as HTMLElement)

          const isStylesheetLink =
            clone.tagName === 'LINK' && (clone as HTMLLinkElement).rel === 'stylesheet'
          // Only external scripts fire load/error - inline ones never do
          const isExternalScript = clone.tagName === 'SCRIPT' && clone.hasAttribute('src')
          if (clone.tagName === 'SCRIPT') {
            // Dynamically-inserted scripts default to async, which would
            // run pagedjs's plugins out of order relative to the polyfill
            ;(clone as HTMLScriptElement).async = false
          }
          if (isExternalScript || isStylesheetLink) {
            loads.push(
              new Promise<void>((res) => {
                clone.addEventListener('load', () => res())
                clone.addEventListener('error', () => res())
              }),
            )
          }
          doc.head.appendChild(clone)
        }

        Promise.all(loads).then(() => resolve({ doc, win }))
      },
      { once: true },
    )
    frame.srcdoc = '<!doctype html><html><head></head><body></body></html>'
    document.body.appendChild(frame)
  })
}
