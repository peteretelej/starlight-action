import * as fs from 'node:fs'
import * as path from 'node:path'
import * as core from '@actions/core'

/**
 * Recursively copies all .md files from source to destination,
 * preserving directory structure.
 */
function copyMarkdownFiles(src: string, dest: string): number {
  const entries = fs.readdirSync(src, { withFileTypes: true })
  let count = 0

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true })
      count += copyMarkdownFiles(srcPath, destPath)
    } else if (entry.name.endsWith('.md')) {
      fs.copyFileSync(srcPath, destPath)
      count++
    }
  }
  return count
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

  // Copy all markdown files from docs folder
  const fileCount = copyMarkdownFiles(options.docsPath, contentDocsDir)
  core.info(`Copied ${fileCount} markdown file(s) from docs folder`)
  if (fileCount === 0) {
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
