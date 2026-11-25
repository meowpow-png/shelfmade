import { useSyncExternalStore } from 'react'

import { BookOpenIcon } from '@/client/BookOpenIcon'
import { getNavCollapsedStore } from '@/client/nav-collapsed-store'

export function ActivityBar() {
  const store = getNavCollapsedStore()
  const collapsed = useSyncExternalStore(store.subscribe, store.getSnapshot)

  return (
    <nav className="activity-bar">
      <button
        type="button"
        className="activity-bar-icon"
        aria-label="Toggle chapter list"
        aria-pressed={!collapsed}
        onClick={() => store.set(!collapsed)}
      >
        <BookOpenIcon className="activity-bar-icon-glyph" />
      </button>
    </nav>
  )
}
