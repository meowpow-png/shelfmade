// Lets Editor.tsx and ChapterNav.tsx share selection across their separate React roots.
const hot = import.meta.hot

function createSelectedChapterStore() {
  let selectedSlug: string | undefined
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => selectedSlug,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set(slug: string) {
      selectedSlug = slug
      listeners.forEach((listener) => listener())
    },
  }
}

let moduleSelectedChapterStore: ReturnType<typeof createSelectedChapterStore> | undefined

export function getSelectedChapterStore(): ReturnType<typeof createSelectedChapterStore> {
  if (hot) return (hot.data.selectedChapterStore ??= createSelectedChapterStore())
  return (moduleSelectedChapterStore ??= createSelectedChapterStore())
}
