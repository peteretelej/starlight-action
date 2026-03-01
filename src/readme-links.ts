import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { visit } from 'unist-util-visit'
import type { Html, Image, Link } from 'mdast'

/**
 * Rewrites relative links in README.md that point into the docs folder.
 * e.g. "docs/guide.md" -> "/guide/"
 *      "./docs/contributing.md" -> "/contributing/"
 *
 * @param content - The README.md content
 * @param docsFolder - The docs folder name (e.g. "docs")
 * @param basePath - The site base path (e.g. "/repo-name")
 */
export async function rewriteReadmeLinks(
  content: string,
  docsFolder: string,
  basePath: string,
): Promise<string> {
  const docsPrefix = docsFolder.replace(/\/$/, '')
  const normalizedBase = basePath.replace(/\/$/, '')

  // Preserve frontmatter since remark stringify strips it
  let frontmatter = ''
  let body = content
  const fmMatch = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)/)
  if (fmMatch) {
    frontmatter = fmMatch[1]
    body = content.slice(fmMatch[0].length)
  }

  const tree = unified().use(remarkParse).parse(body)

  const docsPattern = new RegExp(`^(?:\\./)?${escapeRegex(docsPrefix)}/(.+)$`)

  visit(tree, 'link', (node: Link) => {
    const url = node.url

    // Skip external links, anchors, and protocol links
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('#')) {
      return
    }

    // Match links pointing into docs folder
    const match = url.match(docsPattern)
    if (!match) return

    let relative = match[1]

    // Non-markdown assets (images, videos, etc.) should become relative paths,
    // not site routes, so Astro can resolve the files.
    if (!relative.endsWith('.md')) {
      node.url = `./${relative}`
      return
    }

    // Strip .md extension
    relative = relative.replace(/\.md$/, '')

    // Strip trailing /index
    relative = relative.replace(/\/index$/, '')

    // Build site-relative path (lowercase to match Astro's route generation)
    node.url = `${normalizedBase}/${relative.toLowerCase()}/`
  })

  // Rewrite image paths that reference the docs folder.
  // Unlike links (which become site routes), images need relative paths
  // so Astro's image pipeline can resolve and bundle them.
  visit(tree, 'image', (node: Image) => {
    const url = node.url

    // Skip external images and data URIs
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return
    }

    const match = url.match(docsPattern)
    if (!match) return

    // Rewrite to relative path (the image is now a sibling under content/docs)
    node.url = `./${match[1]}`
  })

  // Rewrite src/poster attributes in raw HTML tags (video, source, img)
  // that reference the docs folder.
  visit(tree, 'html', (node: Html) => {
    node.value = node.value.replace(
      /\b(src|poster)=([\"'])([^\"']+)\2/gi,
      (_full, attr, quote, url) => {
        const match = url.match(docsPattern)
        if (!match) return _full
        return `${attr}=${quote}./${match[1]}${quote}`
      },
    )
  })

  const result = unified().use(remarkStringify).stringify(tree)
  return frontmatter + result
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
