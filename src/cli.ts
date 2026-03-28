#!/usr/bin/env node

import { Command } from 'commander'
import fs from 'fs/promises'
import semver from 'semver'
import { convert } from './convert.js'

const VERSION = '0.2.6'

function bootstrapCli() {
  const program = new Command()

  program
    .name('bem-css-converter')
    .description(
      'Convert flat BEM CSS to nested SCSS with support for modifiers, pseudo-classes, and media queries',
    )
    .version(VERSION)
    .argument('<input>', 'Input CSS file to convert')
    .argument('[output]', 'Output SCSS file (optional, defaults to stdout)')
    .option('--no-watermark', 'Disable watermark in output')
    .action(async (input: string, output?: string) => {
      const { watermark = true } = program.opts()

      // Display header
      const timestamp = performance.now()
      console.log('\x1b[37m\x1b[44m%s\x1b[0m', 'BEM-CSS-converter', '\x1b[0m', ` v${VERSION}`)

      // Validate input file exists
      try {
        await fs.access(input)
      } catch {
        console.error(
          '\x1b[41m\x1b[37m %s \x1b[0m',
          `✗ Error:`,
          '\x1b[0m',
          `File '${input}' does not exist`,
        )
        process.exit(1)
      }

      if (!output) {
        output = `${input.slice(0, input.length - 4)}.scss`
      }

      try {
        // Read and convert CSS
        const css = await fs.readFile(input, 'utf8')
        const result = await convert(css, { hideWatermark: !watermark })

        // Write to file
        await fs.writeFile(output, result)
        const executionTime = Math.round(performance.now() - timestamp)
        console.log(
          '\x1b[38;2;255;255;255m\x1b[48;2;0;150;0m%s\x1b[0m',
          `✓ Successfully`,
          '\x1b[0m',
          ` converted '${input}' to '${output}' in ${executionTime}ms`,
          '\n\n',
          '⭐ Give me a star on GitHub: https://github.com/psycholessdev/bem-to-scss',
        )

        // New version check
        try {
          const res = await fetch(
            'https://raw.githubusercontent.com/psycholessdev/bem-to-scss/refs/heads/main/package.json',
          )
          const { version = VERSION } = (await res.json()) as { version: string }

          if (semver.lt(VERSION, version)) {
            console.log(
              '\n\n\x1b[37m\x1b[44m%s\x1b[0m',
              `New version ${version} is available!`,
              '\x1b[0m',
              '\n\nuse npm install -g bem-css-converter\n',
              'or npm install bem-css-converter --save-dev',
            )
          }
        } catch (error: any) {}
      } catch (error: any) {
        console.error('\x1b[41m\x1b[37m %s \x1b[0m', '✗ Error:', '\x1b[0m', error.message)
        process.exit(1)
      }
    })

  program.parse()
}

bootstrapCli()
