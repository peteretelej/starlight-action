import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { visit } from 'unist-util-visit'
import type { Link } from 'mdast'

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

  const tree = unified().use(remarkParse).parse(content)

  visit(tree, 'link', (node: Link) => {
    const url = node.url

    // Skip external links, anchors, and protocol links
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('#')) {
      return
    }

    // Match links pointing into docs folder
    const pattern = new RegExp(`^(?:\\./)?${escapeRegex(docsPrefix)}/(.+)$`)
    const match = url.match(pattern)
    if (!match) return

    let relative = match[1]

    // Strip .md extension
    relative = relative.replace(/\.md$/, '')

    // Strip trailing /index
    relative = relative.replace(/\/index$/, '')

    // Build site-relative path
    node.url = `${normalizedBase}/${relative}/`
  })

  const result = unified().use(remarkStringify).stringify(tree)
  return result
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
