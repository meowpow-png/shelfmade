interface ChapterHeadingProps {
  number: number
  title: string
}

export function ChapterHeading({ number, title }: ChapterHeadingProps) {
  return (
    <header className="chapter-heading">
      <span className="chapter-heading-number">{String(number).padStart(2, '0')}</span>
      <h1 className="chapter-heading-title">{title}</h1>
      <span className="chapter-heading-paw" aria-hidden="true">
        🐾
      </span>
    </header>
  )
}
