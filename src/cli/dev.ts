import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { build } from '@/cli/build'
import { startViteServer } from '@/cli/vite-server'
import { CONFIG_FILE } from '@/config'

export async function dev(root: string, port: number) {
  if (!existsSync(join(root, CONFIG_FILE))) {
    throw new Error(`No ${CONFIG_FILE} found in ${root}`)
  }

  // A broken project still starts, so fixing the error rebuilds it
  await rebuildSafely(root)

  await startViteServer(root, port)
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
