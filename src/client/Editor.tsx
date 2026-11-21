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

export function Editor({ chapters: initialChapters, bookSlug, saveDebounceMs }: EditorProps) {
  const [chapters, setChapters] = useState(initialChapters)
  // One timer per chapter, so editing one doesn't reset another's pending save
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function handleChange(chapterSlug: string, content: string) {
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
      {chapters.map((chapter) => (
        <textarea
          key={chapter.slug}
          className="editor-chapter"
          value={chapter.content}
          onChange={(event) => handleChange(chapter.slug, event.target.value)}
        />
      ))}
    </div>
  )
}
