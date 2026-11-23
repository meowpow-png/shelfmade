import { useState, useSyncExternalStore } from 'react'

import { BookOpenIcon } from '@/client/BookOpenIcon'
import type { EditorChapter } from '@/client/Editor'
import { getSelectedChapterStore } from '@/client/selected-chapter-store'

type NavChapter = Pick<EditorChapter, 'slug' | 'title'>

interface ChapterNavProps {
  chapters: EditorChapter[]
  bookSlug: string
}

export function ChapterNav({ chapters, bookSlug }: ChapterNavProps) {
  const store = getSelectedChapterStore()
  const storedSlug = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [draggedSlug, setDraggedSlug] = useState<string>()
  const [creating, setCreating] = useState(false)
  const [renamingSlug, setRenamingSlug] = useState<string>()
  const [pendingChapter, setPendingChapter] = useState<NavChapter>()

  // Placeholder drops out on its own once chapters (via file-watch HMR) catches up to it
  const displayChapters: NavChapter[] =
    pendingChapter && !chapters.some((chapter) => chapter.slug === pendingChapter.slug)
      ? [...chapters, pendingChapter]
      : chapters
  const selectedSlug = storedSlug ?? displayChapters[0]?.slug

  // targetIndex is the drop target's current index, before the dragged chapter is removed
  function moveChapter(chapterSlug: string, targetIndex: number) {
    fetch(`/books/${bookSlug}/chapters/${chapterSlug}/order`, {
      method: 'PUT',
      body: String(targetIndex + 1),
    }).catch((error: unknown) =>
      console.error(`Failed to reorder chapter "${chapterSlug}":`, error),
    )
  }

  function createChapter() {
    if (creating || renamingSlug !== undefined) return
    setCreating(true)
    fetch(`/books/${bookSlug}/chapters`, { method: 'POST' })
      .then((response) => response.json() as Promise<NavChapter>)
      .then((chapter) => {
        // Deferred to commitRename/cancelRename to avoid stealing focus from the rename input
        setRenamingSlug(chapter.slug)
        setPendingChapter(chapter)
      })
      .catch((error: unknown) => console.error('Failed to create chapter:', error))
      .finally(() => setCreating(false))
  }

  function cancelRename(chapterSlug: string) {
    setRenamingSlug(undefined)
    store.set(chapterSlug)
  }

  // Empty title: skip the write, the default title created server-side is already on disk
  function commitRename(chapterSlug: string, title: string) {
    setRenamingSlug(undefined)
    store.set(chapterSlug)
    const trimmed = title.trim()
    if (trimmed === '') return

    setPendingChapter((current) =>
      current?.slug === chapterSlug ? { ...current, title: trimmed } : current,
    )
    fetch(`/books/${bookSlug}/chapters/${chapterSlug}/title`, {
      method: 'PUT',
      body: trimmed,
    }).catch((error: unknown) => console.error(`Failed to rename chapter "${chapterSlug}":`, error))
  }

  return (
    <nav className="chapter-nav">
      <div className="chapter-nav-header">
        <BookOpenIcon className="chapter-nav-icon" />
        <span className="chapter-nav-title">Chapters</span>
        <button
          type="button"
          className="chapter-nav-add"
          aria-label="Add chapter"
          aria-disabled={creating || renamingSlug !== undefined}
          onMouseDown={(event) => event.preventDefault()}
          onClick={createChapter}
        >
          +
        </button>
      </div>
      <ul className="chapter-nav-list">
        {displayChapters.map((chapter, index) => (
          <li
            key={chapter.slug}
            draggable
            className={chapter.slug === draggedSlug ? 'chapter-nav-dragging' : undefined}
            onDragStart={() => setDraggedSlug(chapter.slug)}
            onDragEnd={() => setDraggedSlug(undefined)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              if (draggedSlug && draggedSlug !== chapter.slug) moveChapter(draggedSlug, index)
            }}
          >
            {chapter.slug === renamingSlug ? (
              <input
                type="text"
                className="chapter-nav-item chapter-nav-rename"
                defaultValue={chapter.title}
                autoFocus
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur()
                  } else if (event.key === 'Escape') {
                    cancelRename(chapter.slug)
                  }
                }}
                onBlur={(event) => commitRename(chapter.slug, event.target.value)}
              />
            ) : (
              <button
                type="button"
                className="chapter-nav-item"
                aria-current={chapter.slug === selectedSlug}
                onClick={() => store.set(chapter.slug)}
              >
                {chapter.title}
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
