import { useEffect, useRef, useSyncExternalStore } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { baseExtensions } from '@/client/editor-extensions'
import { editorTheme } from '@/client/editor-theme'
import { headingHighlight } from '@/client/heading-highlight'
import { getSelectedChapterStore } from '@/client/selected-chapter-store'

export interface EditorChapter {
  slug: string
  title: string
  content: string
}

interface EditorProps {
  chapters: EditorChapter[]
  bookSlug: string
  saveDebounceMs: number
}

// Content includes frontmatter; editor edits body only, re-attaching it on save
const FRONTMATTER_PATTERN = /^---\n[\s\S]*?\n---\n*/

function splitFrontmatter(source: string): { frontmatter: string; body: string } {
  const match = source.match(FRONTMATTER_PATTERN)
  return match
    ? { frontmatter: match[0], body: source.slice(match[0].length) }
    : { frontmatter: '', body: source }
}

// Cached on hot.data: survives Editor's HMR remounts
const hot = import.meta.hot
let moduleEditorViews: Map<string, EditorView> | undefined

function getEditorViewCache(): Map<string, EditorView> {
  if (hot) return (hot.data.editorViews ??= new Map<string, EditorView>())
  return (moduleEditorViews ??= new Map())
}

// Bridges state into React: useRef can't be read at render, useState can't be set in an effect.
function createConflictStore() {
  // The selected chapter's conflicting disk content; undefined if none
  let conflict: string | undefined
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => conflict,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set(next: string | undefined) {
      conflict = next
      listeners.forEach((listener) => listener())
    },
  }
}

let moduleConflictStore: ReturnType<typeof createConflictStore> | undefined

function getConflictStore(): ReturnType<typeof createConflictStore> {
  if (hot) return (hot.data.conflictStore ??= createConflictStore())
  return (moduleConflictStore ??= createConflictStore())
}

export function Editor({ chapters, bookSlug, saveDebounceMs }: EditorProps) {
  const selectedChapterStore = getSelectedChapterStore()
  const selectedSlug = useSyncExternalStore(
    selectedChapterStore.subscribe,
    selectedChapterStore.getSnapshot,
  )
  const selectedChapter = chapters.find((chapter) => chapter.slug === selectedSlug) ?? chapters[0]

  // Only the selected chapter is ever mounted, so only it can have a pending save or conflict
  const activeChapterRef = useRef<
    { slug: string; frontmatter: string; lastSynced: string } | undefined
  >(undefined)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const conflictStore = getConflictStore()
  const conflictContent = useSyncExternalStore(conflictStore.subscribe, conflictStore.getSnapshot)

  function saveChapterNow(chapterSlug: string, content: string) {
    return fetch(`/books/${bookSlug}/chapters/${chapterSlug}`, { method: 'PUT', body: content })
      .then(() => {
        // Guards against a save landing after the user has already switched chapters
        if (activeChapterRef.current?.slug === chapterSlug) {
          activeChapterRef.current.lastSynced = content
        }
      })
      .catch((error: unknown) => console.error(`Failed to save chapter "${chapterSlug}":`, error))
  }

  // Flushes the outgoing chapter's pending save before adopting the new baseline
  useEffect(() => {
    if (!selectedChapter) return
    const previous = activeChapterRef.current

    if (previous?.slug === selectedChapter.slug) {
      // Frontmatter always wins silently
      const fresh = splitFrontmatter(selectedChapter.content)
      previous.frontmatter = fresh.frontmatter
      if (fresh.body === splitFrontmatter(previous.lastSynced).body) return

      if (conflictStore.getSnapshot() === selectedChapter.content) return
      conflictStore.set(selectedChapter.content)
      return
    }

    if (previous && saveTimerRef.current !== undefined) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = undefined
      const view = getEditorViewCache().get(previous.slug)
      if (view) saveChapterNow(previous.slug, previous.frontmatter + view.state.doc.toString())
    }

    activeChapterRef.current = {
      slug: selectedChapter.slug,
      frontmatter: splitFrontmatter(selectedChapter.content).frontmatter,
      lastSynced: selectedChapter.content,
    }
    conflictStore.set(undefined)
    // activeChapterRef/saveTimerRef/conflictStore/saveChapterNow are stable, not render inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapter])

  function handleBodyChange(body: string) {
    const active = activeChapterRef.current
    if (!active) return
    const content = active.frontmatter + body

    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveChapterNow(active.slug, content), saveDebounceMs)
  }

  function loadExternalChanges() {
    const active = activeChapterRef.current
    const content = conflictStore.getSnapshot()
    if (!active || content === undefined) return

    const view = getEditorViewCache().get(active.slug)
    if (!view) return

    const { body } = splitFrontmatter(content)
    // Also triggers a harmless no-op resave via onChange
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: body } })
    active.lastSynced = content
    conflictStore.set(undefined)
  }

  return (
    <div className="editor">
      {selectedChapter && (
        <div className="editor-chapter-wrapper">
          {conflictContent !== undefined && <ConflictBanner onLoadExternal={loadExternalChanges} />}
          <ChapterEditor
            slug={selectedChapter.slug}
            title={selectedChapter.title}
            initialValue={splitFrontmatter(selectedChapter.content).body}
            onChange={handleBodyChange}
          />
        </div>
      )}
    </div>
  )
}

interface ConflictBannerProps {
  onLoadExternal: () => void
}

function ConflictBanner({ onLoadExternal }: ConflictBannerProps) {
  return (
    <div className="editor-conflict-banner">
      <span>Changed outside the editor</span>
      <div className="editor-conflict-banner-actions">
        <button type="button" onClick={onLoadExternal}>
          Load external changes
        </button>
      </div>
    </div>
  )
}

interface ChapterEditorProps {
  slug: string
  title: string
  initialValue: string
  onChange: (value: string) => void
}

function ChapterTitle({ title }: { title: string }) {
  return <div className="editor-chapter-title">{title}</div>
}

function ChapterEditor({ slug, title, initialValue, onChange }: ChapterEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Keeps onChange current without recreating the view
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    const container = containerRef.current!
    // Detach the outgoing chapter's dom without destroying its cached EditorView
    while (container.firstChild) container.removeChild(container.firstChild)

    const views = getEditorViewCache()
    const cached = views.get(slug)

    if (cached) {
      container.appendChild(cached.dom)
    } else {
      const view = new EditorView({
        state: EditorState.create({
          doc: initialValue,
          extensions: [
            baseExtensions,
            editorTheme,
            headingHighlight,
            EditorView.updateListener.of((update) => {
              if (update.docChanged) onChangeRef.current(update.state.doc.toString())
            }),
          ],
        }),
        parent: container,
      })
      views.set(slug, view)
    }

    // editor-theme.ts disables .cm-scroller's own scrolling, so #editor-root scrolls instead
    document.getElementById('editor-root')?.scrollTo(0, 0)

    // View persists via cache; initialValue applies once, on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  return (
    <div className="editor-chapter">
      <ChapterTitle title={title} />
      <div ref={containerRef} />
    </div>
  )
}
