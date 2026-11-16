import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { build } from '@/cli/build'
import { dev } from '@/cli/dev'
import { pdf } from '@/cli/pdf'

const DEFAULT_PORT = 8080

interface CommandOptions {
  root: string
  port: number
}

const COMMANDS: Record<string, (options: CommandOptions) => Promise<unknown>> = {
  build: ({ root }) => build(root),
  dev: ({ root, port }) => dev(root, port),
  pdf: ({ root }) => pdf(root),
}

const USAGE = `Usage: shelfmade <command> [options]

Commands:
  build          Render every configured book to HTML
  dev            Serve the books with live reload, rebuilding on every change
  pdf            Render and print every configured book to PDF

Options:
  --root <dir>   Book project directory (default: current directory)
  --port <n>     Port for dev (default: ${DEFAULT_PORT})
  -h, --help     Show this help`

export async function run(args: string[]) {
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        root: { type: 'string' },
        port: { type: 'string' },
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

    const port = Number(values.port ?? DEFAULT_PORT)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      fail(`Invalid port: ${values.port}`)
      return
    }

    await command({ root: resolve(values.root ?? '.'), port })
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
}

function fail(message: string) {
  console.error(`shelfmade: ${message}`)
  process.exitCode = 1
}
