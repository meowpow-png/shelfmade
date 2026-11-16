import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { build } from '@/cli/build'
import { pdf } from '@/cli/pdf'

const COMMANDS: Record<string, (root: string) => Promise<unknown>> = { build, pdf }

const USAGE = `Usage: shelfmade <command> [options]

Commands:
  build          Render every configured book to HTML
  pdf            Render and print every configured book to PDF

Options:
  --root <dir>   Book project directory (default: current directory)
  -h, --help     Show this help`

export async function run(args: string[]) {
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        root: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    })
    const [name, ...extra] = positionals

    if (values.help) {
      console.log(USAGE)
      return
    }

    const command = name === undefined ? undefined : COMMANDS[name]
    if (!command) {
      fail(`${name === undefined ? 'Missing command' : `Unknown command: ${name}`}\n\n${USAGE}`)
      return
    }
    if (extra.length > 0) {
      fail(`Unexpected argument: ${extra.join(' ')}`)
      return
    }

    await command(resolve(values.root ?? '.'))
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
}

function fail(message: string) {
  console.error(`shelfmade: ${message}`)
  process.exitCode = 1
}
