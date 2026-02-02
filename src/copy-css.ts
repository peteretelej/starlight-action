import * as fs from 'node:fs'
import * as path from 'node:path'
import * as core from '@actions/core'

export interface CopyCssOptions {
  customCssInput?: string
  workspaceDir: string
  projectDir: string
}

export interface CopyCssResult {
  configPaths: string[]
}

/**
 * Parses comma-separated CSS file paths, validates them, copies them into the
 * scaffolded Starlight project, and returns config-relative paths.
 */
export async function copyCss(options: CopyCssOptions): Promise<CopyCssResult> {
  const { customCssInput, workspaceDir, projectDir } = options

  if (!customCssInput || customCssInput.trim() === '') {
    return { configPaths: [] }
  }

  const rawPaths = customCssInput.split(',').map((p) => p.trim()).filter(Boolean)

  // Validate all files first
  for (const cssPath of rawPaths) {
    if (!cssPath.endsWith('.css')) {
      throw new Error(`Custom CSS file must have .css extension: ${cssPath}`)
    }
    const fullPath = path.resolve(workspaceDir, cssPath)
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Custom CSS file not found: ${fullPath}`)
    }
  }

  const stylesDir = path.join(projectDir, 'src', 'styles')
  fs.mkdirSync(stylesDir, { recursive: true })

  // Detect duplicate basenames
  const basenames = rawPaths.map((p) => path.basename(p))
  const basenameCounts = new Map<string, number>()
  for (const bn of basenames) {
    basenameCounts.set(bn, (basenameCounts.get(bn) ?? 0) + 1)
  }

  const configPaths: string[] = []

  for (const cssPath of rawPaths) {
    const fullPath = path.resolve(workspaceDir, cssPath)
    const basename = path.basename(cssPath)
    let destName = basename

    // Handle duplicate basenames by prefixing with parent directory name
    if ((basenameCounts.get(basename) ?? 0) > 1) {
      const parentDir = path.basename(path.dirname(cssPath))
      destName = `${parentDir}-${basename}`
    }

    const destPath = path.join(stylesDir, destName)
    fs.copyFileSync(fullPath, destPath)
    core.info(`Copied custom CSS: ${cssPath} -> src/styles/${destName}`)

    configPaths.push(`./src/styles/${destName}`)
  }

  return { configPaths }
}
