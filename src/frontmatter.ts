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
 * Splits content into frontmatter (including the fences and trailing
 * newline) and the remaining body.
 */
function splitFrontmatter(content: string): { frontmatter: string; body: string } {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  if (!match) return { frontmatter: '', body: content }
  return { frontmatter: match[0], body: content.slice(match[0].length) }
}

/**
 * If the body starts with an # heading (allowing leading blank lines),
 * returns the heading text and the body without that heading line.
 * Starlight renders the frontmatter title as the page h1, so a leading
 * content h1 would render the title twice.
 */
function takeLeadingH1(body: string): { title: string; rest: string } | null {
  const match = body.match(/^(?:[ \t]*\r?\n)*^#[ \t]+(.+)$/m)
  if (!match) return null
  return { title: match[1].trim(), rest: body.slice(match[0].length) }
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
 * When the title comes from a leading # heading, the heading is removed from
 * the body since Starlight already renders the title as the page h1.
 */
export function processFrontmatter(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8')
  const existingTitle = extractFrontmatterTitle(content)

  if (existingTitle) return

  const { frontmatter, body } = splitFrontmatter(content)
  const leading = takeLeadingH1(body)

  const inferredTitle =
    leading?.title ?? extractFirstHeading(content) ?? titleFromFilename(filePath)
  const bodyOut = leading ? leading.rest : body
  const escapedTitle = inferredTitle.replace(/"/g, '\\"')

  let updated: string
  if (frontmatter) {
    updated = frontmatter.replace(/^---\r?\n/, `---\ntitle: "${escapedTitle}"\n`) + bodyOut
  } else {
    updated = `---\ntitle: "${escapedTitle}"\n---\n\n${bodyOut}`
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
