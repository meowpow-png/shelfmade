import { type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Loaded via ssrLoadModule only, mirroring render-book.tsx/render-index.tsx
export function renderPreviewFrameBody(App: ComponentType) {
  return renderToStaticMarkup(<App />)
}
