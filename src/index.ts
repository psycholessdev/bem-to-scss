#!/usr/bin/env node

export { convert } from './convert.js'

// conditionally init CLI
if (typeof process !== 'undefined' && process.argv && import.meta.url) {
  import('url').then(({ fileURLToPath }) => {
    if (fileURLToPath(import.meta.url) === process.argv[1]) {
      import('./cli.js').then(({ bootstrapCli }) => bootstrapCli())
    }
  })
}
