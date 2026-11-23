import { useState, useSyncExternalStore } from 'react'

import { BookOpenIcon } from '@/client/BookOpenIcon'
import type { EditorChapter } from '@/client/Editor'
import { getSelectedChapterStore } from '@/client/selected-chapter-store'

interface ChapterNavProps {
  chapters: EditorChapter[]
  bookSlug: string
}

export function ChapterNav({ chapters, bookSlug }: ChapterNavProps) {
  const store = getSelectedChapterStore()
  const storedSlug = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const selectedSlug = storedSlug ?? chapters[0]?.slug
  const [draggedSlug, setDraggedSlug] = useState<string>()

  // targetIndex is the drop target's current index, before the dragged chapter is removed
  function moveChapter(chapterSlug: string, targetIndex: number) {
    fetch(`/books/${bookSlug}/chapters/${chapterSlug}/order`, {
      method: 'PUT',
      body: String(targetIndex + 1),
    }).catch((error: unknown) =>
      console.error(`Failed to reorder chapter "${chapterSlug}":`, error),
    )
  }

  return (
    <nav className="chapter-nav">
      <div className="chapter-nav-header">
        <BookOpenIcon className="chapter-nav-icon" />
        <span className="chapter-nav-title">Chapters</span>
        <button type="button" className="chapter-nav-add" aria-label="Add chapter">
          +
        </button>
      </div>
      <ul className="chapter-nav-list">
        {chapters.map((chapter, index) => (
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
            <button
              type="button"
              className="chapter-nav-item"
              aria-current={chapter.slug === selectedSlug}
              onClick={() => store.set(chapter.slug)}
            >
              {chapter.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
