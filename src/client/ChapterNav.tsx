import { useSyncExternalStore } from 'react'

import { BookOpenIcon } from '@/client/BookOpenIcon'
import type { EditorChapter } from '@/client/Editor'
import { getSelectedChapterStore } from '@/client/selected-chapter-store'

interface ChapterNavProps {
  chapters: EditorChapter[]
}

export function ChapterNav({ chapters }: ChapterNavProps) {
  const store = getSelectedChapterStore()
  const storedSlug = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const selectedSlug = storedSlug ?? chapters[0]?.slug

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
        {chapters.map((chapter) => (
          <li key={chapter.slug}>
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
