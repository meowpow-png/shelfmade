import { existsSync, watch } from 'node:fs'
import { join, sep } from 'node:path'

import { build } from '@/cli/build'
import { startDevServer } from '@/cli/dev-server'
import { CONFIG_FILE } from '@/config'

// Changes arriving within this window are rebuilt together
const DEBOUNCE_MS = 100

const IGNORED = ['dist', 'node_modules', '.git']

export async function dev(root: string, port: number) {
  if (!existsSync(join(root, CONFIG_FILE))) {
    throw new Error(`No ${CONFIG_FILE} found in ${root}`)
  }

  // A broken project still starts, so fixing the error rebuilds it
  await rebuildSafely(root)

  const server = await startDevServer(join(root, 'dist'), port)
  console.log(`Serving at http://localhost:${port}`)

  let timer: NodeJS.Timeout | undefined
  let building = false
  let pending = false

  const rebuild = async () => {
    if (building) {
      pending = true
      return
    }

    building = true
    if (await rebuildSafely(root)) {
      server.reload()
    }
    building = false

    if (pending) {
      pending = false
      await rebuild()
    }
  }

  watch(root, { recursive: true }, (_event, filename) => {
    if (filename === null || IGNORED.includes(filename.split(sep)[0] ?? '')) {
      return
    }

    clearTimeout(timer)
    timer = setTimeout(() => void rebuild(), DEBOUNCE_MS)
  }).on('error', (error) => console.error(`shelfmade: watching failed: ${error.message}`))
}

async function rebuildSafely(root: string) {
  try {
    await build(root)
    return true
  } catch (error) {
    console.error(`shelfmade: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}
