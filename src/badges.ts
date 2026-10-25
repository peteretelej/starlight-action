import * as fs from 'node:fs'
import * as path from 'node:path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { visit } from 'unist-util-visit'
import type { Image, Link, Paragraph, Root } from 'mdast'

// GitHub badge rows are always multiple badges; a single-image paragraph is
// more likely a screenshot and is left untouched.
const MIN_BADGES = 2

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderBadge(node: Link | Image): string {
  const title = node.title ? ` title="${escapeHtml(node.title)}"` : ''
  if (node.type === 'image') {
    return `<img src="${escapeHtml(node.url)}" alt="${escapeHtml(node.alt ?? '')}"${title} />`
  }
  const inner = node.children.map((c) => renderBadge(c as Link | Image)).join('')
  return `<a href="${escapeHtml(node.url)}"${title}>${inner}</a>`
}

/**
 * Renders a paragraph made up solely of images and links around images
 * (a badge row) as raw HTML. Returns null when the paragraph does not
 * look like a badge row.
 */
function renderBadgeParagraph(node: Paragraph): string | null {
  const parts: string[] = []
  let badgeCount = 0

  for (const child of node.children) {
    if (child.type === 'text' && child.value.trim() === '') {
      if (badgeCount > 0) parts.push('\n')
      continue
    }
    if (child.type !== 'image' && child.type !== 'link') return null
    if (child.type === 'link' && !child.children.every((c) => c.type === 'image')) {
      return null
    }
    parts.push(renderBadge(child))
    badgeCount++
  }

  if (badgeCount < MIN_BADGES) return null

  return `<p class="readme-badges">\n${parts.join('')}\n</p>`
}

/**
 * Rewrites badge-only paragraphs (README-style rows of linked badge images)
 * as paragraphs with the readme-badges class so they can be laid out with
 * spacing instead of clumping together inline.
 */
export async function polishBadgeRows(content: string): Promise<string> {
  // Preserve frontmatter since remark stringify strips it
  let frontmatter = ''
  let body = content
  const fmMatch = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)/)
  if (fmMatch) {
    frontmatter = fmMatch[1]
    body = content.slice(fmMatch[0].length)
  }

  const tree = unified().use(remarkParse).parse(body) as Root
  let changed = false

  visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
    if (!parent || parent.type !== 'root' || index === undefined) return
    const html = renderBadgeParagraph(node)
    if (!html) return
    parent.children[index] = { type: 'html', value: html }
    changed = true
  })

  if (!changed) return content

  return frontmatter + unified().use(remarkStringify).stringify(tree)
}

/**
 * Applies badge-row polish to all markdown files in a directory recursively.
 */
export async function polishAllBadgeRows(docsDir: string): Promise<void> {
  const entries = fs.readdirSync(docsDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(docsDir, entry.name)
    if (entry.isDirectory()) {
      await polishAllBadgeRows(fullPath)
    } else if (entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf-8')
      const polished = await polishBadgeRows(content)
      if (polished !== content) {
        fs.writeFileSync(fullPath, polished, 'utf-8')
      }
    }
  }
}
