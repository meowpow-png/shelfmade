#!/usr/bin/env node
import { run } from '../dist/cli/run.js'

await run(process.argv.slice(2))
