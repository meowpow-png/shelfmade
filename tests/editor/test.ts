import { expect, test as base, type Locator } from '@playwright/test'
import { type ViteDevServer } from 'vite'

import { startViteServer } from '../../src/cli/vite-server'
import { acquireLock, createBookSandbox, type BookSandbox } from '../book-sandbox'

interface EditorServerOptions {
  portBase: number
  prepareSandbox?: (sandbox: BookSandbox) => void
}

interface EditorServer {
  baseURL: string
  sandbox: BookSandbox
  server: ViteDevServer
}

type OpenBook = (slug: string) => Promise<void>
type Chapter = (title: string) => Locator
type SelectChapter = (title: string) => Promise<void>

interface EditorFixtures {
  chapter: Chapter
  openBook: OpenBook
  selectChapter: SelectChapter
}

interface EditorWorkerFixtures {
  editorBaseURL: string
  editorServer: EditorServer
  editorServerOptions: EditorServerOptions
  sandbox: BookSandbox
}

export const test = base.extend<EditorFixtures, EditorWorkerFixtures>({
  editorServerOptions: [{ portBase: 8199 }, { option: true, scope: 'worker' }],
  editorServer: [
    async ({ editorServerOptions }, provide, workerInfo) => {
      // Serializes Vite and Paged.js work across browser workers to prevent contention flakes.
      const releaseLock = await acquireLock('editor-integration')
      const sandbox = createBookSandbox()

      try {
        editorServerOptions.prepareSandbox?.(sandbox)
        // Worker-indexed ports remain unique if locking is relaxed later.
        const port = editorServerOptions.portBase + workerInfo.workerIndex
        const server = await startViteServer(sandbox.root, port)

        try {
          await provide({ baseURL: `http://127.0.0.1:${port}`, sandbox, server })
        } finally {
          await server.close()
        }
      } finally {
        sandbox.cleanup()
        releaseLock()
      }
    },
    { scope: 'worker', timeout: 180_000 },
  ],
  editorBaseURL: [
    async ({ editorServer }, provide) => provide(editorServer.baseURL),
    { scope: 'worker' },
  ],
  sandbox: [
    async ({ editorServer }, provide) => provide(editorServer.sandbox),
    { scope: 'worker' },
  ],
  openBook: async ({ editorBaseURL, page }, provide) => {
    await provide(async (slug) => {
      await page.goto(`${editorBaseURL}/${slug}.html`)
      await page.waitForFunction(
        () => document.getElementById('book-root')?.style.visibility === '',
      )
    })
  },
  chapter: async ({ page }, provide) => {
    // Only the selected chapter is mounted, so its title identifies the current wrapper.
    await provide((title) =>
      page
        .locator('.editor-chapter-wrapper')
        .filter({ has: page.locator('.editor-chapter-title', { hasText: title }) }),
    )
  },
  selectChapter: async ({ chapter, page }, provide) => {
    await provide(async (title) => {
      await page.getByRole('button', { name: title, exact: true }).click()
      await expect(chapter(title)).toBeVisible()
    })
  },
})

export { expect }
