/**
 * Local end-to-end test: scaffolds a Starlight project using the actual action
 * modules, copies fixture docs, and runs `astro build`.
 * Requires network for npm install.
 *
 * Usage: npm run test:e2e
 */
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { processAllFrontmatter } from '../src/frontmatter.js'
import { copyDocs } from '../src/copy-docs.js'
import { generateConfig } from '../src/config.js'

// Stub @actions/core so our modules work outside Actions runtime
const noop = () => {}
require.cache[require.resolve('@actions/core')] = {
  id: '@actions/core',
  filename: '@actions/core',
  loaded: true,
  exports: { info: console.log, warning: console.warn, error: console.error, setFailed: noop, startGroup: noop, endGroup: noop, getInput: () => '' },
} as any

const FIXTURES_DIR = path.join(__dirname, '..', '__tests__', 'fixtures', 'basic-docs')
const ASTRO_VERSION = '^5.0.0'
const STARLIGHT_VERSION = '~0.34.0'

function run(cmd: string, cwd: string): void {
  console.log(`$ ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

async function main(): Promise<void> {
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

    // 5. Copy fixture docs (simulates what the action does)
    const workspaceDir = path.join(__dirname, '..', '__tests__', 'fixtures')
    copyDocs({
      docsPath: FIXTURES_DIR,
      projectDir,
      readme: false,
      workspaceDir,
    })

    // 6. Process frontmatter (adds title from headings, required by schema)
    await processAllFrontmatter(contentDocsDir)

    // 7. Generate astro config using action module
    generateConfig(projectDir, {
      title: 'E2E Test',
      description: 'Local end-to-end test',
      base: '/test-repo',
      site: 'https://example.github.io',
    })

    // 8. Build
    run('npx astro build', projectDir)

    // 9. Verify output
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

    if (htmlFiles.length < 3) {
      console.error(`\nFAILED: Expected at least 3 HTML pages, got ${htmlFiles.length}`)
      process.exit(1)
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
