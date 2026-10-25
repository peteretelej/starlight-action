import * as fs from 'node:fs'
import * as path from 'node:path'
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
 * When repoRoot and repoUrl are provided, links to other files that exist in
 * the repository (LICENSE, CONTRIBUTING.md, source examples) are rewritten to
 * GitHub blob URLs, since relative paths on the built site would 404.
 *
 * @param content - The README.md content
 * @param docsFolder - The docs folder name (e.g. "docs")
 * @param basePath - The site base path (e.g. "/repo-name")
 * @param options - Repo context for rewriting links to repo files
 */
export interface RewriteReadmeOptions {
  /** Absolute path to the repository root (the workspace). */
  repoRoot?: string
  /** Repository URL, e.g. https://github.com/owner/repo */
  repoUrl?: string
}

export async function rewriteReadmeLinks(
  content: string,
  docsFolder: string,
  basePath: string,
  options: RewriteReadmeOptions = {},
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
    if (!match) {
      // Link to a file that exists in the repo (outside docs): relative
      // paths have no meaning on the built site, so point at GitHub.
      const githubUrl = repoFileUrl(url, options)
      if (githubUrl) node.url = githubUrl
      return
    }

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

/**
 * Builds a GitHub blob URL for a relative link target that resolves to a
 * file in the repository. Returns null for external/anchor links and for
 * targets that do not exist on disk.
 */
function repoFileUrl(url: string, options: RewriteReadmeOptions): string | null {
  const { repoRoot, repoUrl } = options
  if (!repoRoot || !repoUrl) return null

  // Only plain relative paths (optionally with an #anchor)
  if (url.startsWith('#') || url.startsWith('/') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    return null
  }

  const hashIndex = url.indexOf('#')
  const rawPath = hashIndex === -1 ? url : url.slice(0, hashIndex)
  const anchor = hashIndex === -1 ? '' : url.slice(hashIndex)
  if (rawPath === '') return null

  // Prefer the literal path; fall back to percent-decoded so links like
  // my%20file.md resolve to a file named "my file.md".
  const candidates = [rawPath]
  if (rawPath.includes('%')) {
    try {
      candidates.push(decodeURIComponent(rawPath))
    } catch {
      // malformed escapes: the literal path is the only candidate
    }
  }

  for (const candidate of candidates) {
    try {
      const resolved = path.resolve(repoRoot, candidate)
      const stat = fs.statSync(resolved)
      const encoded = candidate
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')
      const kind = stat.isFile() ? 'blob' : stat.isDirectory() ? 'tree' : null
      if (!kind) continue
      return `${repoUrl}/${kind}/HEAD/${encoded}${anchor}`
    } catch {
      continue
    }
  }
  return null
}
