#!/usr/bin/env node

const { Command } = require('commander')
const fs = require('fs')
const postcss = require('postcss')

interface ModifierNode {
  content: string
  sep: string
}

interface ElementNode {
  content: string
  modifiers: Map<string, ModifierNode>
}

interface BlockNode {
  content: string
  modifiers: Map<string, ModifierNode>
  elements: Map<string, ElementNode>
}

function convert(css: string): string {
  const root = postcss.parse(css)
  const blocks = new Map<string, BlockNode>()

  const addToNode = (
    block: string,
    element: string | undefined,
    modifier: string | undefined,
    modifierSep: string,
    content: string,
  ) => {
    if (!blocks.has(block)) {
      blocks.set(block, {
        content: '',
        modifiers: new Map(),
        elements: new Map(),
      })
    }
    const blockNode = blocks.get(block)!

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
    } else if (modifier) {
      if (!blockNode.modifiers.has(modifier)) {
        blockNode.modifiers.set(modifier, { content: '', sep: modifierSep })
      }
      const modNode = blockNode.modifiers.get(modifier)!
      if (modNode.content) modNode.content += '\n'
      modNode.content += content
    } else {
      if (blockNode.content) blockNode.content += '\n'
      blockNode.content += content
    }
  }

  root.walkRules((rule: any) => {
    if (rule.parent.type !== 'root') return
    const selector = rule.selector.trim()
    if (selector.includes(':')) {
      // handle pseudo
      if (selector.startsWith('.')) {
        const className = selector.slice(1)
        const parts = className.split(':')
        const bem = parts[0]
        const pseudo = ':' + parts.slice(1).join(':')
        let block: string | undefined
        let element: string | undefined
        let modifier: string | undefined
        let modifierSep = '--'

        if (bem.includes('__')) {
          const p = bem.split('__')
          block = p[0]
          const rest = p[1]
          if (rest) {
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
        } else if (bem.includes('--')) {
          modifierSep = '--'
          const p = bem.split('--')
          block = p[0]
          modifier = p[1]
        } else if (bem.includes('_')) {
          modifierSep = '_'
          const p = bem.split('_')
          block = p[0]
          modifier = p[1]
        } else {
          block = bem
        }

        if (block) {
          const declarations = rule.nodes
            .map((n: any) => (n.type === 'decl' ? n.toString() + ';' : n.toString()))
            .join('\n')
          const content = `&${pseudo} {\n${declarations}\n}`
          addToNode(block, element, modifier, modifierSep, content)
        }
      }
    } else {
      // handle nested or simple
      const bemRegex = /^\.([a-zA-Z0-9_-]+(?:__[a-zA-Z0-9_-]+(?:--?[a-zA-Z0-9_-]+)?)?)(?:\s+(.+))?$/
      const match = selector.match(bemRegex)
      if (match) {
        const bem = match[1]
        const nested = match[2]
        let block: string | undefined
        let element: string | undefined
        let modifier: string | undefined
        let modifierSep = '--'

        if (bem.includes('__')) {
          const parts = bem.split('__')
          block = parts[0]
          const rest = parts[1]
          if (rest) {
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
        } else if (bem.includes('--')) {
          modifierSep = '--'
          const parts = bem.split('--')
          block = parts[0]
          modifier = parts[1]
        } else if (bem.includes('_')) {
          modifierSep = '_'
          const parts = bem.split('_')
          block = parts[0]
          modifier = parts[1]
        } else {
          block = bem
        }

        if (block) {
          const declarations = rule.nodes
            .map((n: any) => (n.type === 'decl' ? n.toString() + ';' : n.toString()))
            .join('\n')
          let content = declarations
          if (nested) {
            content = `${nested} {\n${declarations}\n}`
          }
          addToNode(block, element, modifier, modifierSep, content)
        }
      }
    }
  })

  root.walkAtRules('media', (atRule: any) => {
    atRule.walkRules((rule: any) => {
      const selector = rule.selector.trim()
      if (selector.startsWith('.')) {
        const className = selector.slice(1)
        // assume no pseudo
        let block: string | undefined
        let element: string | undefined
        let modifier: string | undefined
        let modifierSep = '--'

        if (className.includes('__')) {
          const parts = className.split('__')
          block = parts[0]
          const rest = parts[1]
          if (rest) {
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
        } else if (className.includes('--')) {
          modifierSep = '--'
          const parts = className.split('--')
          block = parts[0]
          modifier = parts[1]
        } else if (className.includes('_')) {
          modifierSep = '_'
          const parts = className.split('_')
          block = parts[0]
          modifier = parts[1]
        } else {
          block = className
        }

        if (block) {
          const declarations = rule.nodes
            .map((n: any) => (n.type === 'decl' ? n.toString() + ';' : n.toString()))
            .join('\n')
          const content = `@media ${atRule.params} {\n${declarations}\n}`
          addToNode(block, element, modifier, modifierSep, content)
        }
      }
    })
  })

  let output = ''
  for (const [block, node] of blocks) {
    output += `.${block} {\n`
    output += outputNested(node, '  ')
    output += '}\n\n'
  }
  return output.trim()
}

function outputNested(
  node: {
    content: string
    modifiers: Map<string, ModifierNode>
    elements?: Map<string, ElementNode>
  },
  indent: string,
): string {
  let str = ''
  if (node.content.trim()) {
    str += indentContent(node.content, indent) + '\n'
  }
  for (const [mod, modNode] of node.modifiers) {
    str += indent + `&${modNode.sep}${mod} {\n`
    if (modNode.content.trim()) {
      str += indentContent(modNode.content, indent + '  ') + '\n'
    }
    str += indent + '}\n'
  }
  if (node.elements) {
    for (const [elem, elemNode] of node.elements) {
      str += indent + `&__${elem} {\n`
      str += outputNested(elemNode, indent + '  ')
      str += indent + '}\n'
    }
  }
  return str
}

function indentContent(content: string, indent: string): string {
  return content
    .split('\n')
    .map(line => (line ? indent + line : ''))
    .join('\n')
}

const program = new Command()

program
  .name('bem-to-scss')
  .description('Convert BEM CSS to nested SCSS')
  .version('0.1.0')
  .argument('<input>', 'Input CSS file')
  .argument('[output]', 'Output SCSS file (optional, defaults to stdout)')
  .action((input: string, output?: string) => {
    console.log('\x1b[37m\x1b[44m%s\x1b[0m', 'BEM-to-SCSS', '\x1b[0m', ' v0.1.0')

    if (!fs.existsSync(input)) {
      console.error(`File ${input} does not exist`)
      process.exit(1)
    }
    const css = fs.readFileSync(input, 'utf8')
    const result = convert(css)

    if (output) {
      fs.writeFileSync(output, result)
      console.log(`Successfully converted ${input} to ${output}`)
    } else {
      console.log(result)
    }
  })

program.parse()
