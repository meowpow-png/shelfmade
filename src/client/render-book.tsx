import { type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { Preview } from '@/client/Preview'

// Loaded via ssrLoadModule only, mirroring render-index.tsx
export function renderBookBody(App: ComponentType) {
  return renderToStaticMarkup(
    <Preview>
      <App />
    </Preview>,
  )
}
