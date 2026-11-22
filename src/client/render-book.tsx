import { renderToStaticMarkup } from 'react-dom/server'

import { Preview } from '@/client/Preview'

// Loaded via ssrLoadModule only, mirroring render-index.tsx
export function renderBookBody() {
  return renderToStaticMarkup(<Preview />)
}
