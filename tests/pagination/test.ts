import path from 'node:path'
import { expect, test as base, type Locator } from '@playwright/test'

export type OpenFixture = (name: string) => Promise<void>
export type PaginateFixture = (name: string) => Promise<Locator>

interface PaginationFixtures {
  openFixture: OpenFixture
  paginateFixture: PaginateFixture
}

export const test = base.extend<PaginationFixtures>({
  openFixture: async ({ page }, use) => {
    await use(async (name) => {
      const fixture = path.join(__dirname, 'fixtures', name)
      await page.goto(`file://${fixture}`)
    })
  },
  paginateFixture: async ({ page, openFixture }, use) => {
    await use(async (name) => {
      await openFixture(name)
      // Each paged fixture sets this from PagedConfig.after when layout is complete.
      await page.waitForFunction(() => window.PAGED_READY === true)
      return page.locator('.pagedjs_page')
    })
  },
})

export { expect }
