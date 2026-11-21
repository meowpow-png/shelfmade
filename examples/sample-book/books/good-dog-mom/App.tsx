import { type LayoutProps } from 'shelfmade'

import { ChapterHeading } from './ChapterHeading'

export function App({ title, chapters }: LayoutProps) {
  return (
    <>
      <section className="cover">
        <img className="cover-background" src="books/good-dog-mom/cover.svg" alt={title} />
      </section>
      {chapters.map(({ slug, frontmatter, Body }, index) => (
        <section key={slug} className="chapter">
          <ChapterHeading number={index + 1} title={String(frontmatter.title)} />
          <Body />
        </section>
      ))}
    </>
  )
}
