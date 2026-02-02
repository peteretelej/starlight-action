import { describe, it, expect, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createTempDir } from '../helpers.js'
import { processFrontmatter, processAllFrontmatter } from '../../src/frontmatter.js'
import { generateSidebar } from '../../src/sidebar.js'
import { generateConfig } from '../../src/config.js'
import { copyDocs } from '../../src/copy-docs.js'
import { rewriteReadmeLinks } from '../../src/readme-links.js'

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  getInput: vi.fn(),
  setFailed: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
}))

vi.mock('@actions/exec', () => ({
  exec: vi.fn(),
}))

describe('integration: full pipeline', () => {
  it('runs scaffold-through-config pipeline with fixture docs', async () => {
    // Set up a workspace with docs
    const workspace = createTempDir({
      'docs/getting-started.md': '# Getting Started\n\nWelcome to the docs.\n',
      'docs/api/reference.md': '# API Reference\n\nThe API docs.\n',
      'docs/api/endpoints.md': '---\norder: 1\n---\n\n# Endpoints\n\nList of endpoints.\n',
      'README.md':
        '# My Project\n\nSee the [guide](docs/getting-started.md) and [API](docs/api/reference.md).\n',
    })

    // Simulate scaffolded project directory
    const projectDir = createTempDir({})
    const contentDocsDir = path.join(projectDir, 'src', 'content', 'docs')
    fs.mkdirSync(contentDocsDir, { recursive: true })
    fs.mkdirSync(path.join(projectDir, 'public'), { recursive: true })

    // Step 1: Copy docs
    copyDocs({
      docsPath: path.join(workspace, 'docs'),
      projectDir,
      readme: true,
      workspaceDir: workspace,
    })

    // Verify docs were copied
    expect(fs.existsSync(path.join(contentDocsDir, 'getting-started.md'))).toBe(true)
    expect(fs.existsSync(path.join(contentDocsDir, 'api', 'reference.md'))).toBe(true)
    expect(fs.existsSync(path.join(contentDocsDir, 'api', 'endpoints.md'))).toBe(true)
    expect(fs.existsSync(path.join(contentDocsDir, 'index.md'))).toBe(true)

    // Step 2: Process frontmatter
    await processAllFrontmatter(contentDocsDir)

    // Verify frontmatter was added
    const gettingStarted = fs.readFileSync(
      path.join(contentDocsDir, 'getting-started.md'),
      'utf-8',
    )
    expect(gettingStarted).toContain('title: "Getting Started"')

    const endpoints = fs.readFileSync(
      path.join(contentDocsDir, 'api', 'endpoints.md'),
      'utf-8',
    )
    expect(endpoints).toContain('title: "Endpoints"')
    expect(endpoints).toContain('order: 1')

    // Step 3: Rewrite README links
    const indexPath = path.join(contentDocsDir, 'index.md')
    const indexContent = fs.readFileSync(indexPath, 'utf-8')
    const rewritten = await rewriteReadmeLinks(indexContent, 'docs', '/my-repo')
    fs.writeFileSync(indexPath, rewritten, 'utf-8')

    const finalIndex = fs.readFileSync(indexPath, 'utf-8')
    expect(finalIndex).toContain('/my-repo/getting-started/')
    expect(finalIndex).toContain('/my-repo/api/reference/')

    // Step 4: Generate sidebar
    const sidebar = generateSidebar(contentDocsDir)
    expect(sidebar.length).toBeGreaterThan(0)

    // Should have api group and getting-started file
    const labels = sidebar.map((s) => s.label)
    expect(labels).toContain('Api')

    // Step 5: Generate config
    generateConfig(projectDir, {
      title: 'My Project',
      description: 'Project documentation',
      base: '/my-repo',
      site: 'https://user.github.io',
    })

    const configPath = path.join(projectDir, 'astro.config.mjs')
    expect(fs.existsSync(configPath)).toBe(true)

    const configContent = fs.readFileSync(configPath, 'utf-8')
    expect(configContent).toContain("title: \"My Project\"")
    expect(configContent).toContain('sidebar')
    expect(configContent).toContain('Getting Started')
    expect(configContent).toContain("import starlight from '@astrojs/starlight'")
  })
})
