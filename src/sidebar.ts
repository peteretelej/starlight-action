import * as fs from 'node:fs'
import * as path from 'node:path'

export interface SidebarItem {
  label: string
  link?: string
  items?: SidebarItem[]
  collapsed?: boolean
}

/**
 * Extracts frontmatter order field if present.
 */
function extractOrder(filePath: string): number | null {
  const content = fs.readFileSync(filePath, 'utf-8')
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null
  const orderMatch = match[1].match(/^order:\s*(\d+)$/m)
  return orderMatch ? parseInt(orderMatch[1], 10) : null
}

/**
 * Extracts frontmatter title field if present.
 */
function extractTitle(filePath: string): string | null {
  const content = fs.readFileSync(filePath, 'utf-8')
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null
  const titleMatch = match[1].match(/^title:\s*(?:"([^"]*)"|'([^']*)'|(.+))$/m)
  if (!titleMatch) return null
  return titleMatch[1] ?? titleMatch[2] ?? titleMatch[3]?.trim() ?? null
}

/**
 * Converts a folder name to a display label.
 */
function labelFromName(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Converts a docs-relative file path to a Starlight slug.
 * e.g. "guide/getting-started.md" -> "/guide/getting-started"
 */
function toSlug(relativePath: string): string {
  let slug = relativePath.replace(/\.md$/, '')
  slug = slug.replace(/\/index$/, '')
  if (slug === 'index') slug = ''
  return `/${slug.toLowerCase()}`
}

/**
 * Generates a Starlight sidebar configuration from the docs directory tree.
 */
export function generateSidebar(docsDir: string, relativeTo?: string): SidebarItem[] {
  const baseDir = relativeTo ?? docsDir
  const entries = fs.readdirSync(docsDir, { withFileTypes: true })

  const files: { name: string; fullPath: string; order: number | null }[] = []
  const dirs: { name: string; fullPath: string }[] = []

  for (const entry of entries) {
    const fullPath = path.join(docsDir, entry.name)
    if (entry.isDirectory()) {
      dirs.push({ name: entry.name, fullPath })
    } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') {
      files.push({ name: entry.name, fullPath, order: extractOrder(fullPath) })
    }
  }

  // Check for index.md in current dir
  const indexPath = path.join(docsDir, 'index.md')
  const hasIndex = fs.existsSync(indexPath)

  const items: (SidebarItem & { _order: number | null })[] = []

  // Add index as first item if it exists and we're not at root
  if (hasIndex && docsDir !== baseDir) {
    const rel = path.relative(baseDir, indexPath)
    const title = extractTitle(indexPath) ?? labelFromName(path.basename(docsDir))
    items.push({
      label: title,
      link: toSlug(rel),
      _order: -1,
    })
  }

  // Add file items
  for (const file of files) {
    const rel = path.relative(baseDir, file.fullPath)
    const title = extractTitle(file.fullPath) ?? labelFromName(file.name.replace(/\.md$/, ''))
    items.push({
      label: title,
      link: toSlug(rel),
      _order: file.order,
    })
  }

  // Add directory groups
  for (const dir of dirs) {
    const children = generateSidebar(dir.fullPath, baseDir)
    if (children.length > 0) {
      items.push({
        label: labelFromName(dir.name),
        items: children,
        collapsed: false,
        _order: null,
      })
    }
  }

  // Sort: items with order first (ascending), then alphabetically by label
  items.sort((a, b) => {
    if (a._order !== null && b._order !== null) return a._order - b._order
    if (a._order !== null) return -1
    if (b._order !== null) return 1
    return a.label.localeCompare(b.label)
  })

  // Strip internal _order field
  return items.map(({ _order: _, ...item }) => item)
}
