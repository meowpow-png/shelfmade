import { type ReactNode } from 'react'

interface PreviewProps {
  children: ReactNode
}

export function Preview({ children }: PreviewProps) {
  return (
    <div className="preview">
      {/* Hidden until book-page.tsx's mount() reveals it - this is unpaginated
      SSR markup, with no page shell and no page-box to constrain images, not the final look */}
      <div id="book-root" style={{ visibility: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}
