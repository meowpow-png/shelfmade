import { type EditorChapter } from '@/client/Editor'

// Lets separate React roots share one chapter list.
const hot = import.meta.hot

function createChaptersStore(initial: EditorChapter[]) {
  let chapters = initial
  let appliedSequence = 0
  let lastReservedSequence = 0
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => chapters,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    // Reserve before issuing the fetch that will eventually call set, so arrival order can't matter
    reserveSequence(): number {
      lastReservedSequence += 1
      return lastReservedSequence
    },
    // Drops a write behind one already applied, so a slow response can't revert a newer one
    set(next: EditorChapter[], sequence: number) {
      if (sequence < appliedSequence) return
      appliedSequence = sequence
      chapters = next
      listeners.forEach((listener) => listener())
    },
  }
}

let moduleChaptersStore: ReturnType<typeof createChaptersStore> | undefined

export function getChaptersStore(
  initial: EditorChapter[] = [],
): ReturnType<typeof createChaptersStore> {
  if (hot) return (hot.data.chaptersStore ??= createChaptersStore(initial))
  return (moduleChaptersStore ??= createChaptersStore(initial))
}
