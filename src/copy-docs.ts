import * as fs from 'node:fs'
import * as path from 'node:path'
import * as core from '@actions/core'

interface CopyResult {
  markdown: number
  assets: number
}

/**
 * Recursively copies all documentation files (markdown and assets like images)
 * from source to destination, preserving directory structure.
 */
function copyDocsFiles(src: string, dest: string): CopyResult {
  const entries = fs.readdirSync(src, { withFileTypes: true })
  const result: CopyResult = { markdown: 0, assets: 0 }

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true })
      const sub = copyDocsFiles(srcPath, destPath)
      result.markdown += sub.markdown
      result.assets += sub.assets
    } else if (entry.name.endsWith('.md')) {
      fs.copyFileSync(srcPath, destPath)
      result.markdown++
    } else {
      // Copy non-markdown assets (images, etc.) to preserve references
      fs.copyFileSync(srcPath, destPath)
      result.assets++
    }
  }
  return result
}

export interface CopyDocsOptions {
  docsPath: string
  projectDir: string
  readme: boolean
  workspaceDir: string
  logoPath?: string
}

/**
 * Copies documentation files into the Starlight project.
 */
export function copyDocs(options: CopyDocsOptions): void {
  const contentDocsDir = path.join(options.projectDir, 'src', 'content', 'docs')

  // Copy all documentation files (markdown + assets like images)
  const copyResult = copyDocsFiles(options.docsPath, contentDocsDir)
  core.info(`Copied ${copyResult.markdown} markdown file(s) from docs folder`)
  if (copyResult.assets > 0) {
    core.info(`Copied ${copyResult.assets} asset file(s) (images, etc.) from docs folder`)
  }
  if (copyResult.markdown === 0) {
    core.warning('No markdown files found in docs folder')
  }

  // If readme: true, copy README.md as index page
  if (options.readme) {
    const readmePath = path.join(options.workspaceDir, 'README.md')
    if (fs.existsSync(readmePath)) {
      const destPath = path.join(contentDocsDir, 'index.md')
      fs.copyFileSync(readmePath, destPath)
      core.info('Copied README.md as index page')
    } else {
      core.warning('readme input is true but no README.md found in workspace root')
    }
  }

  // Copy logo if specified
  if (options.logoPath) {
    const logoSrc = path.resolve(options.workspaceDir, options.logoPath)
    if (fs.existsSync(logoSrc)) {
      const logoDest = path.join(options.projectDir, 'public', path.basename(logoSrc))
      fs.copyFileSync(logoSrc, logoDest)
      core.info(`Copied logo to public/${path.basename(logoSrc)}`)
    } else {
      core.warning(`Logo file not found: ${options.logoPath}`)
    }
  }
}
