import { useState, useSyncExternalStore } from 'react'

import { getChaptersStore } from '@/client/chapters-store'
import { ChapterDeleteDialog } from '@/client/ChapterDeleteDialog'
import { ChapterRowMenu } from '@/client/ChapterRowMenu'
import { discardEditorView, type EditorChapter } from '@/client/Editor'
import { getNavCollapsedStore } from '@/client/nav-collapsed-store'
import { getSelectedChapterStore } from '@/client/selected-chapter-store'

interface ChapterNavProps {
  bookSlug: string
}

export function ChapterNav({ bookSlug }: ChapterNavProps) {
  const collapsedStore = getNavCollapsedStore()
  const collapsed = useSyncExternalStore(collapsedStore.subscribe, collapsedStore.getSnapshot)
  const store = getSelectedChapterStore()
  const storedSlug = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const chaptersStore = getChaptersStore()
  const chapters = useSyncExternalStore(chaptersStore.subscribe, chaptersStore.getSnapshot)
  const [draggedSlug, setDraggedSlug] = useState<string>()
  const [creating, setCreating] = useState(false)
  const [renamingSlug, setRenamingSlug] = useState<string>()
  // Create-chapter's rename always selects the new chapter; menu-triggered rename must not
  const [renameSelects, setRenameSelects] = useState(true)
  const [deleteCandidateSlug, setDeleteCandidateSlug] = useState<string>()

  if (collapsed) return null

  const selectedSlug = storedSlug ?? chapters[0]?.slug
  const deleteCandidate = chapters.find((chapter) => chapter.slug === deleteCandidateSlug)

  // targetIndex is the drop target's current index, before the dragged chapter is removed
  function moveChapter(chapterSlug: string, targetIndex: number) {
    const sequence = chaptersStore.reserveSequence()
    fetch(`/books/${bookSlug}/chapters/${chapterSlug}/order`, {
      method: 'PUT',
      body: String(targetIndex + 1),
    })
      .then((response) => response.json() as Promise<EditorChapter[]>)
      .then((nextChapters) => chaptersStore.set(nextChapters, sequence))
      .catch((error: unknown) =>
        console.error(`Failed to reorder chapter "${chapterSlug}":`, error),
      )
  }

  function createChapter() {
    if (creating || renamingSlug !== undefined) return
    setCreating(true)
    const previousSlugs = new Set(chapters.map((chapter) => chapter.slug))
    const sequence = chaptersStore.reserveSequence()
    fetch(`/books/${bookSlug}/chapters`, { method: 'POST' })
      .then((response) => response.json() as Promise<EditorChapter[]>)
      .then((nextChapters) => {
        chaptersStore.set(nextChapters, sequence)
        const created = nextChapters.find((chapter) => !previousSlugs.has(chapter.slug))
        if (!created) return
        // Deferred to commitRename/cancelRename to avoid stealing focus from the rename input
        setRenameSelects(true)
        setRenamingSlug(created.slug)
      })
      .catch((error: unknown) => console.error('Failed to create chapter:', error))
      .finally(() => setCreating(false))
  }

  function cancelRename(chapterSlug: string) {
    setRenamingSlug(undefined)
    if (renameSelects) store.set(chapterSlug)
  }

  // Empty title: skip the write, the default title created server-side is already on disk
  function commitRename(chapterSlug: string, title: string) {
    setRenamingSlug(undefined)
    if (renameSelects) store.set(chapterSlug)
    const trimmed = title.trim()
    if (trimmed === '') return

    const sequence = chaptersStore.reserveSequence()
    fetch(`/books/${bookSlug}/chapters/${chapterSlug}/title`, {
      method: 'PUT',
      body: trimmed,
    })
      .then((response) => response.json() as Promise<EditorChapter[]>)
      .then((nextChapters) => chaptersStore.set(nextChapters, sequence))
      .catch((error: unknown) => console.error(`Failed to rename chapter "${chapterSlug}":`, error))
  }

  function confirmDelete(chapterSlug: string) {
    setDeleteCandidateSlug(undefined)

    if (chapterSlug === selectedSlug) {
      // Previous chapter in order, or the new first if the deleted one was first
      const index = chapters.findIndex((chapter) => chapter.slug === chapterSlug)
      const remaining = chapters.filter((chapter) => chapter.slug !== chapterSlug)
      const fallback = remaining[index - 1] ?? remaining[0]
      if (fallback) store.set(fallback.slug)
    }
    discardEditorView(chapterSlug)

    const sequence = chaptersStore.reserveSequence()
    fetch(`/books/${bookSlug}/chapters/${chapterSlug}`, { method: 'DELETE' })
      .then((response) => response.json() as Promise<EditorChapter[]>)
      .then((nextChapters) => chaptersStore.set(nextChapters, sequence))
      .catch((error: unknown) => console.error(`Failed to delete chapter "${chapterSlug}":`, error))
  }

  return (
    <>
      <nav className="chapter-nav">
        <div className="chapter-nav-header">
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
          {chapters.map((chapter, index) => {
            const menuDisabled = creating || renamingSlug !== undefined

            return (
              <li
                key={chapter.slug}
                draggable
                className={`chapter-nav-row${chapter.slug === draggedSlug ? ' chapter-nav-dragging' : ''}`}
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
                  <>
                    <button
                      type="button"
                      className="chapter-nav-item"
                      aria-current={chapter.slug === selectedSlug}
                      onClick={() => store.set(chapter.slug)}
                    >
                      {chapter.title}
                    </button>
                    <ChapterRowMenu
                      title={chapter.title}
                      disabled={menuDisabled}
                      onRename={() => {
                        setRenameSelects(false)
                        setRenamingSlug(chapter.slug)
                      }}
                      onDelete={() => setDeleteCandidateSlug(chapter.slug)}
                    />
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
      <ChapterDeleteDialog
        open={deleteCandidate !== undefined}
        title={deleteCandidate?.title ?? ''}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidateSlug(undefined)
        }}
        onConfirm={() => deleteCandidate && confirmDelete(deleteCandidate.slug)}
      />
    </>
  )
}
