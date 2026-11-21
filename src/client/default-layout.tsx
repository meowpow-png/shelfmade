import { type LayoutProps } from '@/config'

export function DefaultLayout({ chapters }: LayoutProps) {
  return chapters.map(({ slug, Body }) => (
    <section key={slug} className="chapter">
      <Body />
    </section>
  ))
}
