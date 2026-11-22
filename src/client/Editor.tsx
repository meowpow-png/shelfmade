import { useRef, useState } from 'react'

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

// Chapter content is the raw MDX source, frontmatter included. The editor only
// shows/edits the body - frontmatter is carried along untouched on save.
const FRONTMATTER_PATTERN = /^---\n[\s\S]*?\n---\n*/

function splitFrontmatter(source: string): { frontmatter: string; body: string } {
  const match = source.match(FRONTMATTER_PATTERN)
  return match
    ? { frontmatter: match[0], body: source.slice(match[0].length) }
    : { frontmatter: '', body: source }
}

export function Editor({ chapters: initialChapters, bookSlug, saveDebounceMs }: EditorProps) {
  const [chapters, setChapters] = useState(initialChapters)
  // One timer per chapter, so editing one doesn't reset another's pending save
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function handleBodyChange(chapterSlug: string, body: string) {
    const { frontmatter } = splitFrontmatter(
      chapters.find((chapter) => chapter.slug === chapterSlug)!.content,
    )
    const content = frontmatter + body

    setChapters((current) =>
      current.map((candidate) =>
        candidate.slug === chapterSlug ? { ...candidate, content } : candidate,
      ),
    )

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
          <textarea
            key={chapter.slug}
            className="editor-chapter"
            value={body}
            onChange={(event) => handleBodyChange(chapter.slug, event.target.value)}
          />
        )
      })}
    </div>
  )
}
