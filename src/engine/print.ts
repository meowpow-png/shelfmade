import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

export async function printBooks(slugs: string[], outDir: string) {
  const browser = await chromium.launch()

  try {
    for (const slug of slugs) {
      const page = await browser.newPage()

      await page.goto(pathToFileURL(resolve(outDir, `${slug}.html`)).href)
      await page.pdf({
        path: resolve(outDir, `${slug}.pdf`),
        printBackground: true,
        width: '210mm',
        height: '297mm',
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      })

      await page.close()
    }
  } finally {
    await browser.close()
  }
}
