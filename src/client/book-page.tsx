import { createRoot, type Root } from 'react-dom/client'

import { ActivityBar } from '@/client/ActivityBar'
import { ChapterNav } from '@/client/ChapterNav'
import { Editor, type EditorChapter } from '@/client/Editor'
// Side-effect only - keeps chapter edits in Vite's module graph so HMR fires, see that file
import '@/client/resolve-book'

interface Previewer {
  preview(content: Node, stylesheets: unknown[], renderTo: HTMLElement): Promise<unknown>
  removeStyles(doc?: Document): unknown[]
  chunker: { removePages(): void }
  polisher: { inserted: HTMLStyleElement[] }
}

interface PreviewWindow extends Window {
  Paged: { Previewer: new () => Previewer }
}

declare global {
  interface Window {
    __SHELFMADE_BOOK_SLUG__: string
    __SHELFMADE_REMOUNT_DEBOUNCE_MS__: number
    __SHELFMADE_CHAPTERS__: EditorChapter[]
  }
}

const container = document.getElementById('book-root')

if (container) {
  scheduleMount(container)
}

const editorContainer = document.getElementById('editor-root')
const chapterNavContainer = document.getElementById('chapter-nav-root')
const activityBarContainer = document.getElementById('activity-bar-root')

if (editorContainer) {
  mountEditor(editorContainer, chapterNavContainer, activityBarContainer)
}

// Self-accepting avoids Vite's full-page-reload fallback on chapter/config changes
if (import.meta.hot) {
  import.meta.hot.accept()
}

// Cached on hot.data to avoid recreating roots on every remount.
function mountEditor(
  container: HTMLElement,
  chapterNavContainer: HTMLElement | null,
  activityBarContainer: HTMLElement | null,
) {
  const hot = import.meta.hot
  const root = hot ? (hot.data.editorRoot ??= createRoot(container)) : createRoot(container)
  const chapterNavRoot = chapterNavContainer
    ? hot
      ? (hot.data.chapterNavRoot ??= createRoot(chapterNavContainer))
      : createRoot(chapterNavContainer)
    : undefined
  const activityBarRoot = activityBarContainer
    ? hot
      ? (hot.data.activityBarRoot ??= createRoot(activityBarContainer))
      : createRoot(activityBarContainer)
    : undefined

  // window.__SHELFMADE_CHAPTERS__ is only fresh on this first call; later remounts need refetch
  if (!hot || !hot.data.editorMounted) {
    if (hot) hot.data.editorMounted = true
    renderEditor(root, chapterNavRoot, activityBarRoot, window.__SHELFMADE_CHAPTERS__)
    return
  }

  fetchChapters(window.__SHELFMADE_BOOK_SLUG__).then((chapters) =>
    renderEditor(root, chapterNavRoot, activityBarRoot, chapters),
  )
}

function renderEditor(
  root: Root,
  chapterNavRoot: Root | undefined,
  activityBarRoot: Root | undefined,
  chapters: EditorChapter[],
) {
  root.render(
    <Editor
      chapters={chapters}
      bookSlug={window.__SHELFMADE_BOOK_SLUG__}
      saveDebounceMs={window.__SHELFMADE_REMOUNT_DEBOUNCE_MS__}
    />,
  )
  chapterNavRoot?.render(
    <ChapterNav chapters={chapters} bookSlug={window.__SHELFMADE_BOOK_SLUG__} />,
  )
  activityBarRoot?.render(<ActivityBar />)
}

function fetchChapters(bookSlug: string): Promise<EditorChapter[]> {
  return fetch(`/${bookSlug}-chapters`).then((response) => response.json())
}

// Debounces saves into one remount; timer lives on hot.data since module scope resets on reload
function scheduleMount(container: HTMLElement) {
  const hot = import.meta.hot
  if (!hot) {
    requestMount(container)
    return
  }

  if (!hot.data.initialized) {
    hot.data.initialized = true
    requestMount(container)
    return
  }

  clearTimeout(hot.data.remountTimer)
  hot.data.remountTimer = setTimeout(
    () => requestMount(container),
    window.__SHELFMADE_REMOUNT_DEBOUNCE_MS__,
  )
}

// Fallback cache for when there's no import.meta.hot
let computeFramePromise: Promise<HTMLIFrameElement> | undefined
let displayFramePromise: Promise<HTMLIFrameElement> | undefined
let stylesheets: unknown[] | undefined
let previewer: Previewer | undefined
let displayStyles: HTMLStyleElement[] | undefined
let mountState: { mounting: boolean; pending: boolean } | undefined

// Coalesces mounts that land while one is already running into a single rerun after,
// so repaginate() never races itself over shared frame state.
function requestMount(container: HTMLElement) {
  const hot = import.meta.hot
  const state = hot
    ? (hot.data.mountState ??= { mounting: false, pending: false })
    : (mountState ??= { mounting: false, pending: false })

  if (state.mounting) {
    state.pending = true
    return
  }

  state.mounting = true
  mount(container).finally(() => {
    state.mounting = false
    if (state.pending) {
      state.pending = false
      requestMount(container)
    }
  })
}

async function mount(container: HTMLElement) {
  const [computeFrame, displayFrame] = await Promise.all([
    getComputeFrame(container),
    getDisplayFrame(container),
  ])

  await repaginate(computeFrame, displayFrame)
  // display:block avoids default inline's baseline descender gap, which overflowed the page
  displayFrame.style.cssText = 'display: block; width: 100%; height: 100%; border: 0;'
  container.style.visibility = ''
}

// Paginates fresh content in the hidden
// compute frame, then moves the result into the display frame
async function repaginate(computeFrame: HTMLIFrameElement, displayFrame: HTMLIFrameElement) {
  const computeDoc = computeFrame.contentDocument!
  const computeWin = computeFrame.contentWindow as unknown as PreviewWindow
  const displayDoc = displayFrame.contentDocument!
  const hot = import.meta.hot

  const html = await fetch(`/${window.__SHELFMADE_BOOK_SLUG__}-preview-body`).then((response) =>
    response.text(),
  )
  const template = computeDoc.createElement('template')
  template.innerHTML = html
  const content = computeDoc.createDocumentFragment()
  content.append(
    ...Array.from(template.content.childNodes).map((node) => computeDoc.importNode(node, true)),
  )

  const newPreviewer = new computeWin.Paged.Previewer()
  // A clone, not the live computeDoc - removeStyles() strips it in place
  if (hot) {
    hot.data.stylesheets ??= newPreviewer.removeStyles(computeDoc.cloneNode(true) as Document)
  } else {
    stylesheets ??= newPreviewer.removeStyles(computeDoc.cloneNode(true) as Document)
  }
  const activeStylesheets: unknown[] = hot ? hot.data.stylesheets : stylesheets!

  const renderTarget = computeDoc.createElement('div')
  computeDoc.body.appendChild(renderTarget)

  await newPreviewer.preview(content, activeStylesheets, renderTarget)

  // Compute frame is always hidden, so cleaning up its own previous pass never flickers
  const oldPreviewer: Previewer | undefined = hot ? hot.data.previewer : previewer
  oldPreviewer?.chunker.removePages()
  oldPreviewer?.polisher.inserted.forEach((style) => style.remove())
  if (hot) {
    hot.data.previewer = newPreviewer
  } else {
    previewer = newPreviewer
  }

  const pages = renderTarget.firstElementChild
  renderTarget.remove()
  if (!pages) return

  // Old pages, then old styles, then new styles,
  // then new pages - no style tag ever lands while a page is visible
  displayDoc.body.replaceChildren()
  const oldDisplayStyles: HTMLStyleElement[] = (hot ? hot.data.displayStyles : displayStyles) ?? []
  oldDisplayStyles.forEach((style) => style.remove())
  const newDisplayStyles = newPreviewer.polisher.inserted.map((style) => {
    const copy = displayDoc.createElement('style')
    copy.textContent = style.textContent
    displayDoc.head.appendChild(copy)
    return copy
  })
  if (hot) {
    hot.data.displayStyles = newDisplayStyles
  } else {
    displayStyles = newDisplayStyles
  }
  displayDoc.adoptNode(pages)
  displayDoc.body.appendChild(pages)
}

// Cached on hot.data under HMR so edits reuse the same booted pagedjs instance
function getComputeFrame(container: HTMLElement): Promise<HTMLIFrameElement> {
  const hot = import.meta.hot
  return hot
    ? (hot.data.computeFramePromise ??= createComputeFrame(container))
    : (computeFramePromise ??= createComputeFrame(container))
}

// Boots pagedjs once per session; never moved or recreated after creation
function createComputeFrame(container: HTMLElement): Promise<HTMLIFrameElement> {
  return new Promise((resolveReady) => {
    const frame = document.createElement('iframe')
    // opacity:0, not visibility:hidden, which throttles rAF inside the iframe
    frame.style.cssText =
      'position: fixed; top: 0; left: 0; width: 1px; height: 1px; opacity: 0; border: 0;'
    container.appendChild(frame)
    frame.src = `/${window.__SHELFMADE_BOOK_SLUG__}-preview-frame`
    // Attached after src is set, so it catches the
    // real navigation's load, not the initial about:blank one
    frame.addEventListener('load', () => resolveReady(frame), { once: true })
  })
}

// Cached on hot.data under HMR; this is the frame actually shown to the user
function getDisplayFrame(container: HTMLElement): Promise<HTMLIFrameElement> {
  const hot = import.meta.hot
  return hot
    ? (hot.data.displayFramePromise ??= createDisplayFrame(container))
    : (displayFramePromise ??= createDisplayFrame(container))
}

function createDisplayFrame(container: HTMLElement): Promise<HTMLIFrameElement> {
  return new Promise((resolveReady) => {
    const frame = document.createElement('iframe')
    frame.style.cssText =
      'position: absolute; inset: 0; width: 100%; height: 100%; border: 0; visibility: hidden;'
    container.appendChild(frame)
    frame.src = `/${window.__SHELFMADE_BOOK_SLUG__}-display-frame`
    frame.addEventListener('load', () => resolveReady(frame), { once: true })
  })
}
