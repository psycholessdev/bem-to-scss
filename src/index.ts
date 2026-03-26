#!/usr/bin/env node

const { Command } = require('commander')
const fs = require('fs/promises')
const postcss = require('postcss')
const prettier = require('prettier')

import type { Root, Rule, AtRule, Node } from 'postcss'

/**
 * CSS modifier nodes (e.g., block--modifier or block_state)
 */
interface ModifierNode {
  content: string
  sep: string // Separator used: '--' or '_'
}

/**
 * BEM element nodes (e.g., block__element)
 */
interface ElementNode {
  content: string
  modifiers: Map<string, ModifierNode>
}

/**
 * BEM block nodes (top-level selectors)
 */
interface BlockNode {
  content: string
  modifiers: Map<string, ModifierNode>
  elements: Map<string, ElementNode>
}

/**
 * Result of parsing a BEM selector
 */
interface BemParsed {
  block: string | undefined
  element: string | undefined
  modifier: string | undefined
  modifierSep: string
}

/**
 * Converts flat BEM CSS into nested SCSS format with support for:
 * - Block modifiers (-- or _ separator)
 * - Element modifiers
 * - Pseudo-classes (:hover, :not(), etc.)
 * - Media queries
 * - Nested selectors (e.g., .block img)
 */
function convert(css: string): string {
  const root: Root = postcss.parse(css)
  const blocks = new Map<string, BlockNode>()

  /**
   * Parses a BEM class name to extract block, element, and modifier components
   * Examples:
   * - 'block' -> { block: 'block' }
   * - 'block__element' -> { block: 'block', element: 'element' }
   * - 'block--modifier' -> { block: 'block', modifier: 'modifier', modifierSep: '--' }
   * - 'block__element_modifier' -> { block: 'block', element: 'element', modifier: 'modifier', modifierSep: '_' }
   */
  function parseBemClass(bem: string): BemParsed {
    let block: string | undefined
    let element: string | undefined
    let modifier: string | undefined
    let modifierSep = '--'

    // Check for element separator __
    if (bem.includes('__')) {
      const parts = bem.split('__')
      block = parts[0]
      const rest = parts[1]
      if (rest) {
        // Check for modifier separator in element
        if (rest.includes('--')) {
          modifierSep = '--'
          const [e, m] = rest.split('--')
          element = e
          modifier = m
        } else if (rest.includes('_')) {
          modifierSep = '_'
          const [e, m] = rest.split('_')
          element = e
          modifier = m
        } else {
          element = rest
        }
      }
    }
    // Check for block modifier separator --
    else if (bem.includes('--')) {
      modifierSep = '--'
      const parts = bem.split('--')
      block = parts[0]
      modifier = parts[1]
    }
    // Check for block modifier separator _ (alternative state notation)
    else if (bem.includes('_')) {
      modifierSep = '_'
      const parts = bem.split('_')
      block = parts[0]
      modifier = parts[1]
    }
    // Simple block with no modifiers or elements
    else {
      block = bem
    }

    return { block, element, modifier, modifierSep }
  }

  /**
   * Adds content to the appropriate BEM node hierarchy
   * Creates nodes as needed and accumulates content
   */
  function addToNode(
    block: string,
    element: string | undefined,
    modifier: string | undefined,
    modifierSep: string,
    content: string,
  ) {
    // Ensure block node exists
    if (!blocks.has(block)) {
      blocks.set(block, {
        content: '',
        modifiers: new Map(),
        elements: new Map(),
      })
    }
    const blockNode = blocks.get(block)!

    // Add content to element modifier
    if (element) {
      if (!blockNode.elements.has(element)) {
        blockNode.elements.set(element, {
          content: '',
          modifiers: new Map(),
        })
      }
      const elemNode = blockNode.elements.get(element)!
      if (modifier) {
        if (!elemNode.modifiers.has(modifier)) {
          elemNode.modifiers.set(modifier, { content: '', sep: modifierSep })
        }
        const modNode = elemNode.modifiers.get(modifier)!
        if (modNode.content) modNode.content += '\n'
        modNode.content += content
      } else {
        if (elemNode.content) elemNode.content += '\n'
        elemNode.content += content
      }
    }
    // Add content to block modifier
    else if (modifier) {
      if (!blockNode.modifiers.has(modifier)) {
        blockNode.modifiers.set(modifier, { content: '', sep: modifierSep })
      }
      const modNode = blockNode.modifiers.get(modifier)!
      if (modNode.content) modNode.content += '\n'
      modNode.content += content
    }
    // Add content directly to block
    else {
      if (blockNode.content) blockNode.content += '\n'
      blockNode.content += content
    }
  }

  // ====== RULE PARSING ======

  /**
   * Process top-level CSS rules
   * Handles pseudo-classes, nested selectors, and simple declarations
   */
  root.walkRules((rule: Rule) => {
    // Skip rules inside at-rules (they're handled separately)
    if (rule.parent && rule.parent.type !== 'root') return

    const selector = rule.selector.trim()

    // Handle pseudo-classes (e.g. .block:hover, .block:not(:last-child))
    if (selector.includes(':')) {
      if (selector.startsWith('.')) {
        const className = selector.slice(1)
        const parts = className.split(':')
        const bem = parts[0]!
        const pseudo = ':' + parts.slice(1).join(':')

        const parsed = parseBemClass(bem)
        if (parsed.block) {
          const declarations = rule.nodes
            .map((n: Node) => (n.type === 'decl' ? n.toString() + ';' : n.toString()))
            .join('\n')
          const content = `&${pseudo} {\n${declarations}\n}`
          addToNode(parsed.block, parsed.element, parsed.modifier, parsed.modifierSep, content)
        }
      }
    }
    // Handle nested selectors and regular rules (e.g. .block, .block img, .block > span)
    else {
      const bemRegex = /^\.([a-zA-Z0-9_-]+(?:__[a-zA-Z0-9_-]+(?:--?[a-zA-Z0-9_-]+)?)?)(?:\s+(.+))?$/
      const match = selector.match(bemRegex)

      if (match) {
        const bem = match[1]!
        const nested = match[2]

        const parsed = parseBemClass(bem)
        if (parsed.block) {
          const declarations = rule.nodes
            .map((n: Node) => (n.type === 'decl' ? n.toString() + ';' : n.toString()))
            .join('\n')

          let content = declarations
          // If rule has nested selector, wrap it
          if (nested) {
            content = `${nested} {\n${declarations}\n}`
          }

          addToNode(parsed.block, parsed.element, parsed.modifier, parsed.modifierSep, content)
        }
      }
    }
  })

  // ====== MEDIA QUERY PARSING ======

  /**
   * Process media query rules
   * Extracts rules inside @media and nests them by BEM class
   */
  root.walkAtRules('media', (atRule: AtRule) => {
    atRule.walkRules((rule: Rule) => {
      const selector = rule.selector.trim()

      if (selector.startsWith('.')) {
        const className = selector.slice(1)
        const parsed = parseBemClass(className)

        if (parsed.block) {
          const declarations = rule.nodes
            .map((n: Node) => (n.type === 'decl' ? n.toString() + ';' : n.toString()))
            .join('\n')
          const content = `@media ${atRule.params} {\n${declarations}\n}`

          addToNode(parsed.block, parsed.element, parsed.modifier, parsed.modifierSep, content)
        }
      }
    })
  })

  // ====== OUTPUT GENERATION ======

  let output = ''
  for (const [block, node] of blocks) {
    output += `.${block} {\n`
    output += outputNested(node, '  ')
    output += '}\n\n'
  }
  return output.trim()
}

/**
 * Recursively generates nested SCSS output for BEM structure
 * Outputs in order: declarations, modifiers, then elements
 */
function outputNested(
  node: {
    content: string
    modifiers: Map<string, ModifierNode>
    elements?: Map<string, ElementNode>
  },
  indent: string,
): string {
  let str = ''

  // Output direct declarations
  if (node.content.trim()) {
    str += indentContent(node.content, indent) + '\n'
  }

  // Output modifiers (e.g., &--active, &_disabled)
  for (const [mod, modNode] of node.modifiers) {
    str += indent + `&${modNode.sep}${mod} {\n`
    if (modNode.content.trim()) {
      str += indentContent(modNode.content, indent + '  ') + '\n'
    }
    str += indent + '}\n'
  }

  // Output elements (e.g., &__header, &__footer)
  if (node.elements) {
    for (const [elem, elemNode] of node.elements) {
      str += indent + `&__${elem} {\n`
      str += outputNested(elemNode, indent + '  ')
      str += indent + '}\n'
    }
  }

  return str
}

/**
 * Applies consistent indentation to multi-line content
 * Preserves empty lines by keeping them empty
 */
function indentContent(content: string, indent: string): string {
  return content
    .split('\n')
    .map(line => (line ? indent + line : ''))
    .join('\n')
}

// ====== CLI ======

const program = new Command()

program
  .name('bem-to-scss')
  .description(
    'Convert flat BEM CSS to nested SCSS with support for modifiers, pseudo-classes, and media queries',
  )
  .version('0.1.0')
  .argument('<input>', 'Input CSS file to convert')
  .argument('[output]', 'Output SCSS file (optional, defaults to stdout)')
  .action(async (input: string, output?: string) => {
    // Display header
    console.log('\x1b[37m\x1b[44m%s\x1b[0m', 'BEM-to-SCSS', '\x1b[0m', ' v0.1.0')

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

    try {
      // Read and convert CSS
      const css = await fs.readFile(input, 'utf8')
      const result = convert(css)

      // Write to file or stdout
      if (output) {
        let finalResult = result
        try {
          finalResult = await prettier.format(result, { parser: 'scss' })
        } catch (formatError: any) {
          console.warn(
            '\x1b[33m\x1b[43m %s \x1b[0m',
            '⚠ Warning:',
            '\x1b[0m',
            `Could not format output with Prettier: ${formatError.message}, using unformatted result`,
          )
        }
        await fs.writeFile(output, finalResult)
        console.log(
          '\x1b[37m\x1b[42m%s\x1b[0m',
          `✓ Successfully`,
          '\x1b[0m',
          ` converted '${input}' to '${output}'`,
          '\n\n',
          '⭐ Give me a star on GitHub: https://github.com/psycholessdev/bem-to-scss',
        )
      } else {
        console.log(result)
      }
    } catch (error: any) {
      console.error('\x1b[41m\x1b[37m %s \x1b[0m', '✗ Error:', '\x1b[0m', error.message)
      process.exit(1)
    }
  })

program.parse()
