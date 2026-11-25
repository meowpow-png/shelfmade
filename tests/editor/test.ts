import { expect, test as base, type Locator, type Page } from '@playwright/test'
import { type ViteDevServer } from 'vite'

import { startViteServer } from '../../src/cli/vite-server'
import { acquireBookIntegrationLock, createBookSandbox, type BookSandbox } from '../book-sandbox'

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
type TypeInContent = (scope: Locator | Page, text: string) => Promise<void>

interface EditorFixtures {
  chapter: Chapter
  openBook: OpenBook
  selectChapter: SelectChapter
  typeInContent: TypeInContent
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
      const releaseLock = await acquireBookIntegrationLock()
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
  typeInContent: async ({ page }, provide) => {
    await provide(async (scope, text) => {
      await scope.locator('.cm-content').click()
      // Click position is unreliable and can land mid-tag;
      // Control+Home forces a safe insertion point.
      await page.keyboard.press('Control+Home')
      await page.keyboard.type(text)
    })
  },
})

export { expect }
