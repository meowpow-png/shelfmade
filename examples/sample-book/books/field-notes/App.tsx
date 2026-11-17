import { type LayoutProps } from 'shelfmade'

export function App({ title, chapters }: LayoutProps) {
  return (
    <>
      <section className="cover">
        <img className="cover-background" src="books/field-notes/cover.svg" alt={title} />
      </section>
      {chapters.map(({ slug, frontmatter, Body }) => (
        <section key={slug} className="chapter" data-chapter={String(frontmatter.chapter)}>
          <p className="chapter-label">{String(frontmatter.chapter)}</p>
          <Body />
        </section>
      ))}
    </>
  )
}
