/**
 * Local end-to-end test and site preview generator.
 *
 * Scaffolds a Starlight project using the actual action modules, copies docs,
 * processes frontmatter, rewrites README links, generates config, and runs
 * `astro build`. Requires network for npm install on first run.
 *
 * Usage:
 *   npm run test:e2e                                    # test with fixtures
 *   npm run test:e2e -- /path/to/repo                   # test with a real repo
 *   npm run test:e2e -- /path/to/repo --output preview  # generate site to preview/
 */
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execSync } from 'node:child_process'

// Stub @actions/core so action modules work outside the Actions runtime
const noop = () => {}
require.cache[require.resolve('@actions/core')] = {
  id: '@actions/core',
  filename: '@actions/core',
  loaded: true,
  exports: {
    info: console.log,
    warning: console.warn,
    error: console.error,
    setFailed: noop,
    startGroup: noop,
    endGroup: noop,
    getInput: () => '',
  },
} as any

import { processAllFrontmatter } from '../src/frontmatter.js'
import { copyDocs } from '../src/copy-docs.js'
import { rewriteReadmeLinks } from '../src/readme-links.js'
import { generateConfig } from '../src/config.js'

const FIXTURES_DIR = path.join(__dirname, '..', '__tests__', 'fixtures', 'basic-docs')
const ASTRO_VERSION = '^5.0.0'
const STARLIGHT_VERSION = '~0.34.0'

function parseArgs(): { repoPath?: string; outputDir?: string } {
  const args = process.argv.slice(2)
  let repoPath: string | undefined
  let outputDir: string | undefined

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      outputDir = path.resolve(args[i + 1])
      i++
    } else if (!args[i].startsWith('-')) {
      repoPath = args[i]
    }
  }

  return { repoPath, outputDir }
}

function run(cmd: string, cwd: string): void {
  console.log(`$ ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

async function main(): Promise<void> {
  const { repoPath: repoArg, outputDir } = parseArgs()

  let docsPath: string
  let workspaceDir: string
  let useReadme = false
  let repoName = 'test-repo'

  if (repoArg) {
    workspaceDir = path.resolve(repoArg)
    docsPath = path.join(workspaceDir, 'docs')
    if (!fs.existsSync(docsPath)) {
      console.error(`No docs/ folder found in ${workspaceDir}`)
      process.exit(1)
    }
    useReadme = fs.existsSync(path.join(workspaceDir, 'README.md'))
    repoName = path.basename(workspaceDir)
    console.log(`Using real repo: ${workspaceDir}`)
    console.log(`  docs: ${docsPath}`)
    console.log(`  readme: ${useReadme}`)
  } else {
    workspaceDir = path.join(__dirname, '..', '__tests__', 'fixtures')
    docsPath = FIXTURES_DIR
    console.log('Using built-in test fixtures')
  }

  if (outputDir) {
    console.log(`  output: ${outputDir}`)
  }

  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'starlight-e2e-'))
  console.log(`\nProject dir: ${projectDir}\n`)

  try {
    // 1. Write package.json
    const packageJson = {
      name: 'starlight-e2e-test',
      version: '0.0.0',
      private: true,
      type: 'module',
      dependencies: {
        astro: ASTRO_VERSION,
        '@astrojs/starlight': STARLIGHT_VERSION,
        sharp: '^0.33.0',
      },
    }
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2))
    console.log('Wrote package.json')

    // 2. Install dependencies
    run('npm install', projectDir)

    // 3. Create directory structure
    const contentDocsDir = path.join(projectDir, 'src', 'content', 'docs')
    fs.mkdirSync(contentDocsDir, { recursive: true })
    fs.mkdirSync(path.join(projectDir, 'public'), { recursive: true })

    // 4. Write content collection config (Astro 5+ requires this, otherwise 0 pages built)
    const contentConfig = `import { defineCollection } from 'astro:content'
import { docsSchema } from '@astrojs/starlight/schema'

export const collections = {
  docs: defineCollection({ schema: docsSchema() }),
}
`
    fs.writeFileSync(path.join(projectDir, 'src', 'content.config.ts'), contentConfig)
    console.log('Wrote content.config.ts')

    // 5. Copy docs (mirrors the action's copyDocs step)
    copyDocs({
      docsPath,
      projectDir,
      readme: useReadme,
      workspaceDir,
    })

    // 6. Process frontmatter (adds title from headings, required by schema)
    await processAllFrontmatter(contentDocsDir)

    // Use base: / for local preview so assets resolve correctly with `serve`
    const base = outputDir ? '/' : `/${repoName}`

    // 7. Rewrite README links if readme was copied
    if (useReadme) {
      const indexPath = path.join(contentDocsDir, 'index.md')
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf-8')
        const rewritten = await rewriteReadmeLinks(content, 'docs', base)
        fs.writeFileSync(indexPath, rewritten, 'utf-8')
        console.log('Rewrote README links in index.md')
      }
    }

    // 8. Generate astro config using action module
    generateConfig(projectDir, {
      title: repoArg ? repoName : 'E2E Test',
      description: 'Local end-to-end test',
      base,
      site: outputDir ? 'http://localhost:3000' : 'https://example.github.io',
    })

    // 9. Build
    run('npx astro build', projectDir)

    // 10. Verify output
    const distDir = path.join(projectDir, 'dist')
    if (!fs.existsSync(distDir)) {
      console.error('\nFAILED: dist/ directory not created')
      process.exit(1)
    }

    const htmlFiles = findFiles(distDir, '.html')
    console.log(`\nBuild produced ${htmlFiles.length} HTML file(s):`)
    for (const f of htmlFiles) {
      console.log(`  ${path.relative(distDir, f)}`)
    }

    const minPages = repoArg ? 2 : 3
    if (htmlFiles.length < minPages) {
      console.error(`\nFAILED: Expected at least ${minPages} HTML pages, got ${htmlFiles.length}`)
      process.exit(1)
    }

    // 11. Copy to output directory if requested
    if (outputDir) {
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true })
      }
      copyDirSync(distDir, outputDir)
      console.log(`\nSite written to ${outputDir}`)
      console.log(`Serve it with: npx serve ${outputDir}`)
    }

    console.log('\nPASSED: Local e2e test succeeded')
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
    console.log('Cleaned up temp directory')
  }
}

function findFiles(dir: string, ext: string): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findFiles(full, ext))
    } else if (entry.name.endsWith(ext)) {
      results.push(full)
    }
  }
  return results
}

main().catch((err) => {
  console.error('\nFAILED:', err.message)
  process.exit(1)
})
