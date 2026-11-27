import { join } from 'node:path'

import { expect, test } from './test'

test.use({ editorServerOptions: { portBase: 8699 } })

interface TestChapter {
  slug: string
  title: string
  content: string
}

// Mirrors the client store's shape locally, to avoid typechecking browser-only code here
interface ChaptersStoreModule {
  getChaptersStore: () => {
    getSnapshot: () => TestChapter[]
    reserveSequence: () => number
    set: (next: TestChapter[], sequence: number) => void
  }
}

test('the chapters store drops a write behind one already applied', async ({ openBook, page }) => {
  await openBook('field-notes')

  // Built from __dirname at runtime, not a literal, so static analysis never treats it as a resolvable import
  const chaptersStorePath = join(__dirname, '..', '..', 'src', 'client', 'chapters-store.ts')
  const chaptersStoreModulePath = '/@fs' + chaptersStorePath
  const result = await page.evaluate(async (modulePath) => {
    const { getChaptersStore } = (await import(modulePath)) as ChaptersStoreModule
    const store = getChaptersStore()

    const staleSequence = store.reserveSequence()
    const freshSequence = store.reserveSequence()

    // Simulates a stale write landing after a fresher one
    store.set([{ slug: 'fresh', title: 'Fresh', content: '' }], freshSequence)
    store.set([{ slug: 'stale', title: 'Stale', content: '' }], staleSequence)

    return store.getSnapshot()
  }, chaptersStoreModulePath)

  expect(result).toEqual([{ slug: 'fresh', title: 'Fresh', content: '' }])
})
