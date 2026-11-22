import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { baseExtensions } from '@/client/editor-extensions'
import { editorTheme } from '@/client/editor-theme'
import { headingHighlight, headingStyles } from '@/client/heading-highlight'

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

export function Editor({ chapters, bookSlug, saveDebounceMs }: EditorProps) {
  // Captured once per chapter - re-splitting on every save let body blank lines leak into it
  const frontmatterBySlug = useRef(
    Object.fromEntries(
      chapters.map((chapter) => [chapter.slug, splitFrontmatter(chapter.content).frontmatter]),
    ),
  ).current
  // One timer per chapter, so editing one doesn't reset another's pending save
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function handleBodyChange(chapterSlug: string, body: string) {
    const content = frontmatterBySlug[chapterSlug] + body

    clearTimeout(saveTimers.current[chapterSlug])
    saveTimers.current[chapterSlug] = setTimeout(() => {
      fetch(`/books/${bookSlug}/chapters/${chapterSlug}`, { method: 'PUT', body: content }).catch(
        (error: unknown) => console.error(`Failed to save chapter "${chapterSlug}":`, error),
      )
    }, saveDebounceMs)
  }

  return (
    <div className="editor">
      {chapters.map((chapter) => {
        const { body } = splitFrontmatter(chapter.content)
        return (
          <ChapterEditor
            key={chapter.slug}
            slug={chapter.slug}
            title={chapter.title}
            initialValue={body}
            onChange={(value) => handleBodyChange(chapter.slug, value)}
          />
        )
      })}
    </div>
  )
}

interface ChapterEditorProps {
  slug: string
  title: string
  initialValue: string
  onChange: (value: string) => void
}

// Title lives in frontmatter, not a literal body line, so it's rendered separately from CM6
function ChapterTitle({ title }: { title: string }) {
  const { fontWeight, fontSize } = headingStyles[0]
  return (
    <div className="editor-chapter-title" style={{ fontWeight, fontSize }}>
      # {title}
    </div>
  )
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
