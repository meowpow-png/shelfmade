import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

import { BrowserMissingError, isBrowserMissing } from '@/engine/browser'

declare global {
  interface Window {
    PAGED_READY?: boolean
  }
}

function readPageSize(): { width: string; height: string } {
  const style = getComputedStyle(document.documentElement)
  return {
    width: style.getPropertyValue('--page-width').trim(),
    height: style.getPropertyValue('--page-height').trim(),
  }
}

export async function printBooks(slugs: string[], outDir: string) {
  // paged.js re-fetches stylesheets itself (for its own GCPM parsing pass),
  // and Chromium treats file:// pages as an opaque origin, so plain XHR/fetch
  // to local files is blocked by CORS unless this flag is set.
  const browser = await chromium
    .launch({ args: ['--allow-file-access-from-files'] })
    .catch((error: unknown) => {
      throw isBrowserMissing(error) ? new BrowserMissingError() : error
    })

  try {
    for (const slug of slugs) {
      const page = await browser.newPage()

      await page.goto(pathToFileURL(resolve(outDir, `${slug}.html`)).href)
      await page.emulateMedia({ media: 'print' })
      await page.waitForFunction(() => window.PAGED_READY === true)
      const { width, height } = await page.evaluate(readPageSize)
      await page.pdf({
        path: resolve(outDir, `${slug}.pdf`),
        printBackground: true,
        width,
        height,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      })

      await page.close()
    }
  } finally {
    await browser.close()
  }
}
