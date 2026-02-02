import * as fs from 'node:fs'
import * as path from 'node:path'
import { generateSidebar, type SidebarItem } from './sidebar.js'

export interface StarlightActionInputs {
  title: string
  description: string
  base: string
  site: string
  logo?: string
  configPath?: string
}

/**
 * Deep-merges source into target. Source values win on conflicts.
 * Arrays are replaced, not concatenated.
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const sourceVal = source[key]
    const targetVal = result[key]
    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      )
    } else {
      result[key] = sourceVal
    }
  }
  return result
}

/**
 * Generates the astro.config.mjs content and writes it to the project directory.
 */
export function generateConfig(
  projectDir: string,
  inputs: StarlightActionInputs,
): void {
  const docsDir = path.join(projectDir, 'src', 'content', 'docs')
  const sidebar = generateSidebar(docsDir)

  let starlightConfig: Record<string, unknown> = {
    title: inputs.title,
    description: inputs.description,
    sidebar: sidebar,
  }

  if (inputs.logo) {
    starlightConfig.logo = {
      src: `/public/${path.basename(inputs.logo)}`,
    }
  }

  // Merge user-provided config if specified
  if (inputs.configPath) {
    const userConfigRaw = fs.readFileSync(inputs.configPath, 'utf-8')
    const userConfig = JSON.parse(userConfigRaw) as Record<string, unknown>
    starlightConfig = deepMerge(starlightConfig, userConfig) as Record<string, unknown>
  }

  const configContent = buildConfigFile(inputs.site, inputs.base, starlightConfig)
  fs.writeFileSync(path.join(projectDir, 'astro.config.mjs'), configContent, 'utf-8')
}

function buildConfigFile(
  site: string,
  base: string,
  starlightConfig: Record<string, unknown>,
): string {
  const sidebarJson = formatSidebar(starlightConfig.sidebar as SidebarItem[])

  const logoSection = starlightConfig.logo
    ? `\n    logo: ${JSON.stringify(starlightConfig.logo)},`
    : ''

  // Build extra config entries from user merge (excluding title, description, sidebar, logo)
  const extraKeys = Object.keys(starlightConfig).filter(
    (k) => !['title', 'description', 'sidebar', 'logo'].includes(k),
  )
  const extraEntries = extraKeys
    .map((k) => `    ${k}: ${JSON.stringify(starlightConfig[k])},`)
    .join('\n')
  const extraSection = extraEntries ? `\n${extraEntries}` : ''

  return `import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: '${site}',
  base: '${base}',
  integrations: [
    starlight({
      title: ${JSON.stringify(starlightConfig.title)},
      description: ${JSON.stringify(starlightConfig.description)},${logoSection}
      sidebar: ${sidebarJson},${extraSection}
    }),
  ],
})
`
}

function formatSidebar(items: SidebarItem[], indent: number = 6): string {
  const pad = ' '.repeat(indent)
  const lines: string[] = ['[']
  for (const item of items) {
    if (item.items) {
      lines.push(`${pad}  {`)
      lines.push(`${pad}    label: ${JSON.stringify(item.label)},`)
      if (item.collapsed !== undefined) {
        lines.push(`${pad}    collapsed: ${item.collapsed},`)
      }
      lines.push(`${pad}    items: ${formatSidebar(item.items, indent + 4)},`)
      lines.push(`${pad}  },`)
    } else {
      lines.push(`${pad}  { label: ${JSON.stringify(item.label)}, link: ${JSON.stringify(item.link)} },`)
    }
  }
  lines.push(`${pad}]`)
  return lines.join('\n')
}
