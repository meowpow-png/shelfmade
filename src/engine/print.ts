import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

function readPageSize(): { width: string; height: string } {
  const style = getComputedStyle(document.documentElement)
  return {
    width: style.getPropertyValue('--page-width').trim(),
    height: style.getPropertyValue('--page-height').trim(),
  }
}

export async function printBooks(slugs: string[], outDir: string) {
  const browser = await chromium.launch()

  try {
    for (const slug of slugs) {
      const page = await browser.newPage()

      await page.goto(pathToFileURL(resolve(outDir, `${slug}.html`)).href)
      await page.emulateMedia({ media: 'print' })
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
