import { useEffect, useRef, useSyncExternalStore } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { baseExtensions } from '@/client/editor-extensions'
import { editorTheme } from '@/client/editor-theme'
import { headingHighlight } from '@/client/heading-highlight'

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

// Content includes frontmatter;
// editor shows/edits body only, frontmatter re-attached on save.
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
  let conflicts: Record<string, string> = {}
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => conflicts,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set(next: Record<string, string>) {
      conflicts = next
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
  // Captured once per chapter - re-splitting on every save let body blank lines leak into it
  const frontmatterBySlug = useRef(
    Object.fromEntries(
      chapters.map((chapter) => [chapter.slug, splitFrontmatter(chapter.content).frontmatter]),
    ),
  ).current
  // One timer per chapter, so editing one doesn't reset another's pending save
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Content last known to match disk; used to tell a safe external sync from a real conflict
  const lastSyncedBySlug = useRef(
    Object.fromEntries(chapters.map((chapter) => [chapter.slug, chapter.content])),
  ).current

  const conflictStore = getConflictStore()
  const conflictsBySlug = useSyncExternalStore(conflictStore.subscribe, conflictStore.getSnapshot)

  // Reconciles disk content against each pane on every fresh fetch from book-page.tsx
  useEffect(() => {
    const nextConflicts = { ...conflictStore.getSnapshot() }
    let conflictsChanged = false

    for (const chapter of chapters) {
      const baseline = lastSyncedBySlug[chapter.slug]
      if (chapter.content === baseline) continue
      if (nextConflicts[chapter.slug] === chapter.content) continue

      nextConflicts[chapter.slug] = chapter.content
      conflictsChanged = true
    }

    if (conflictsChanged) conflictStore.set(nextConflicts)
    // lastSyncedBySlug/conflictStore are stable refs, not render inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters])

  function saveChapterNow(chapterSlug: string, content: string) {
    return fetch(`/books/${bookSlug}/chapters/${chapterSlug}`, { method: 'PUT', body: content })
      .then(() => {
        lastSyncedBySlug[chapterSlug] = content
      })
      .catch((error: unknown) => console.error(`Failed to save chapter "${chapterSlug}":`, error))
  }

  function handleBodyChange(chapterSlug: string, body: string) {
    const content = frontmatterBySlug[chapterSlug] + body

    clearTimeout(saveTimers.current[chapterSlug])
    saveTimers.current[chapterSlug] = setTimeout(
      () => saveChapterNow(chapterSlug, content),
      saveDebounceMs,
    )
  }

  function dismissConflict(chapterSlug: string) {
    const remaining = { ...conflictStore.getSnapshot() }
    delete remaining[chapterSlug]
    conflictStore.set(remaining)
  }

  function loadExternalChanges(chapterSlug: string) {
    const view = getEditorViewCache().get(chapterSlug)
    const content = conflictStore.getSnapshot()[chapterSlug]
    if (!view || content === undefined) return

    const { body } = splitFrontmatter(content)
    // Also triggers a harmless no-op resave via onChange
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: body } })
    lastSyncedBySlug[chapterSlug] = content
    dismissConflict(chapterSlug)
  }

  return (
    <div className="editor">
      {chapters.map((chapter) => {
        const { body } = splitFrontmatter(chapter.content)
        return (
          <div key={chapter.slug} className="editor-chapter-wrapper">
            {chapter.slug in conflictsBySlug && (
              <ConflictBanner onLoadExternal={() => loadExternalChanges(chapter.slug)} />
            )}
            <ChapterEditor
              slug={chapter.slug}
              title={chapter.title}
              initialValue={body}
              onChange={(value) => handleBodyChange(chapter.slug, value)}
            />
          </div>
        )
      })}
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
    const views = getEditorViewCache()
    const cached = views.get(slug)

    if (cached) {
      containerRef.current!.appendChild(cached.dom)
      return
    }

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
      parent: containerRef.current!,
    })
    views.set(slug, view)

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
