import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { createServer, type ViteDevServer } from 'vite'

export async function startViteServer(root: string, port: number): Promise<ViteDevServer> {
  const server = await createServer({
    root,
    // No index.html/SPA entry exists yet; routes are added by later work
    appType: 'custom',
    server: { port, strictPort: true },
    plugins: [
      react(),
      mdx({ remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: 'frontmatter' }]] }),
    ],
  })

  await server.listen()
  server.printUrls()

  return server
}
