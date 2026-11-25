import { useState, useSyncExternalStore } from 'react'

import { ChapterDeleteDialog } from '@/client/ChapterDeleteDialog'
import { ChapterRowMenu } from '@/client/ChapterRowMenu'
import { discardEditorView, type EditorChapter } from '@/client/Editor'
import { getNavCollapsedStore } from '@/client/nav-collapsed-store'
import { getSelectedChapterStore } from '@/client/selected-chapter-store'

type NavChapter = Pick<EditorChapter, 'slug' | 'title'>

interface ChapterNavProps {
  chapters: EditorChapter[]
  bookSlug: string
}

export function ChapterNav({ chapters, bookSlug }: ChapterNavProps) {
  const collapsedStore = getNavCollapsedStore()
  const collapsed = useSyncExternalStore(collapsedStore.subscribe, collapsedStore.getSnapshot)
  const store = getSelectedChapterStore()
  const storedSlug = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [draggedSlug, setDraggedSlug] = useState<string>()
  const [creating, setCreating] = useState(false)
  const [renamingSlug, setRenamingSlug] = useState<string>()
  // Create-chapter's rename always selects the new chapter; menu-triggered rename must not
  const [renameSelects, setRenameSelects] = useState(true)
  const [pendingChapter, setPendingChapter] = useState<NavChapter>()
  // Chapters as of the last create/rename; the placeholder stops trusting itself on the next update
  const [pendingBaseChapters, setPendingBaseChapters] = useState(chapters)
  const [deleteCandidateSlug, setDeleteCandidateSlug] = useState<string>()
  const [pendingDeleteSlug, setPendingDeleteSlug] = useState<string>()
  // Same self-distrust trick as pendingBaseChapters, scoped to the delete optimistic update
  const [pendingDeleteBaseChapters, setPendingDeleteBaseChapters] = useState(chapters)

  if (collapsed) return null

  const baseChapters =
    pendingDeleteSlug !== undefined && chapters === pendingDeleteBaseChapters
      ? chapters.filter((chapter) => chapter.slug !== pendingDeleteSlug)
      : chapters

  const displayChapters: NavChapter[] =
    pendingChapter && chapters === pendingBaseChapters
      ? baseChapters.some((existing) => existing.slug === pendingChapter.slug)
        ? baseChapters.map((existing) =>
            existing.slug === pendingChapter.slug ? pendingChapter : existing,
          )
        : [...baseChapters, pendingChapter]
      : baseChapters
  const selectedSlug = storedSlug ?? displayChapters[0]?.slug
  const deleteCandidate = displayChapters.find((chapter) => chapter.slug === deleteCandidateSlug)

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
        setPendingBaseChapters(chapters)
        // Deferred to commitRename/cancelRename to avoid stealing focus from the rename input
        setRenamingSlug(chapter.slug)
        setRenameSelects(true)
        setPendingChapter(chapter)
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

    setPendingBaseChapters(chapters)
    setPendingChapter({ slug: chapterSlug, title: trimmed })
    fetch(`/books/${bookSlug}/chapters/${chapterSlug}/title`, {
      method: 'PUT',
      body: trimmed,
    }).catch((error: unknown) => console.error(`Failed to rename chapter "${chapterSlug}":`, error))
  }

  function confirmDelete(chapterSlug: string) {
    setDeleteCandidateSlug(undefined)
    setPendingDeleteBaseChapters(chapters)
    setPendingDeleteSlug(chapterSlug)

    if (chapterSlug === selectedSlug) {
      // Previous chapter in order, or the new first if the deleted one was first
      const index = displayChapters.findIndex((chapter) => chapter.slug === chapterSlug)
      const remaining = displayChapters.filter((chapter) => chapter.slug !== chapterSlug)
      const fallback = remaining[index - 1] ?? remaining[0]
      if (fallback) store.set(fallback.slug)
    }
    discardEditorView(chapterSlug)

    fetch(`/books/${bookSlug}/chapters/${chapterSlug}`, { method: 'DELETE' }).catch(
      (error: unknown) => console.error(`Failed to delete chapter "${chapterSlug}":`, error),
    )
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
          {displayChapters.map((chapter, index) => {
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
