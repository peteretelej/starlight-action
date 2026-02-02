import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Checks if content has YAML frontmatter and returns it parsed minimally.
 * Returns the title if found in frontmatter, or null.
 */
function extractFrontmatterTitle(content: string): string | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null
  const titleMatch = match[1].match(/^title:\s*(?:"([^"]*)"|'([^']*)'|(.+))$/m)
  if (!titleMatch) return null
  return titleMatch[1] ?? titleMatch[2] ?? titleMatch[3]?.trim() ?? null
}

/**
 * Extracts the first # heading from markdown content.
 */
function extractFirstHeading(content: string): string | null {
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  const match = body.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

/**
 * Derives a title from a filename.
 * e.g. "getting-started.md" -> "Getting Started"
 */
function titleFromFilename(filePath: string): string {
  const name = path.basename(filePath, path.extname(filePath))
  if (name.toLowerCase() === 'index') {
    const dir = path.basename(path.dirname(filePath))
    if (dir && dir !== '.') {
      return titleCase(dir)
    }
    return 'Home'
  }
  return titleCase(name)
}

function titleCase(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Processes a single markdown file: ensures it has frontmatter with a title.
 * If frontmatter exists but has no title, injects one.
 * If no frontmatter exists, prepends it.
 */
export function processFrontmatter(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8')
  const existingTitle = extractFrontmatterTitle(content)

  if (existingTitle) return

  const inferredTitle = extractFirstHeading(content) ?? titleFromFilename(filePath)
  const escapedTitle = inferredTitle.replace(/"/g, '\\"')

  const hasFrontmatter = /^---\r?\n/.test(content)

  let updated: string
  if (hasFrontmatter) {
    updated = content.replace(/^---\r?\n/, `---\ntitle: "${escapedTitle}"\n`)
  } else {
    updated = `---\ntitle: "${escapedTitle}"\n---\n\n${content}`
  }

  fs.writeFileSync(filePath, updated, 'utf-8')
}

/**
 * Processes all markdown files in a directory recursively.
 */
export async function processAllFrontmatter(docsDir: string): Promise<void> {
  const entries = fs.readdirSync(docsDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(docsDir, entry.name)
    if (entry.isDirectory()) {
      await processAllFrontmatter(fullPath)
    } else if (entry.name.endsWith('.md')) {
      processFrontmatter(fullPath)
    }
  }
}
