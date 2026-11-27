const hot = import.meta.hot

function createNavCollapsedStore() {
  let collapsed = false
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => collapsed,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set(next: boolean) {
      collapsed = next
      listeners.forEach((listener) => listener())
    },
  }
}

let moduleNavCollapsedStore: ReturnType<typeof createNavCollapsedStore> | undefined

export function getNavCollapsedStore(): ReturnType<typeof createNavCollapsedStore> {
  if (hot) return (hot.data.navCollapsedStore ??= createNavCollapsedStore())
  return (moduleNavCollapsedStore ??= createNavCollapsedStore())
}
