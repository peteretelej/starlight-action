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

  it('copies image and asset files alongside markdown', () => {
    // Create a fake 1x1 PNG (minimal valid PNG)
    const fakePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    )

    const workspace = createTempDir({
      'docs/guide.md': '# Guide\n\n![Logo](./images/logo.png)\n',
      'docs/nested/page.md': '# Nested\n\n![Diagram](../diagrams/arch.svg)\n',
    })

    // Write binary image files
    fs.mkdirSync(path.join(workspace, 'docs', 'images'), { recursive: true })
    fs.writeFileSync(path.join(workspace, 'docs', 'images', 'logo.png'), fakePng)
    fs.mkdirSync(path.join(workspace, 'docs', 'diagrams'), { recursive: true })
    fs.writeFileSync(path.join(workspace, 'docs', 'diagrams', 'arch.svg'), '<svg></svg>')

    // Simulate scaffolded project
    const projectDir = createTempDir({})
    const contentDocsDir = path.join(projectDir, 'src', 'content', 'docs')
    fs.mkdirSync(contentDocsDir, { recursive: true })
    fs.mkdirSync(path.join(projectDir, 'public'), { recursive: true })

    copyDocs({
      docsPath: path.join(workspace, 'docs'),
      projectDir,
      readme: false,
      workspaceDir: workspace,
    })

    // Markdown files should be copied
    expect(fs.existsSync(path.join(contentDocsDir, 'guide.md'))).toBe(true)
    expect(fs.existsSync(path.join(contentDocsDir, 'nested', 'page.md'))).toBe(true)

    // Image/asset files should also be copied
    expect(fs.existsSync(path.join(contentDocsDir, 'images', 'logo.png'))).toBe(true)
    expect(fs.existsSync(path.join(contentDocsDir, 'diagrams', 'arch.svg'))).toBe(true)

    // Verify binary content is preserved
    const copiedPng = fs.readFileSync(path.join(contentDocsDir, 'images', 'logo.png'))
    expect(copiedPng.equals(fakePng)).toBe(true)
  })

  it('rewrites image paths in README that reference docs folder', async () => {
    const fakePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    )

    const workspace = createTempDir({
      'docs/guide.md': '# Guide\n\nSome guide content.\n',
      'README.md':
        '# My Project\n\n![Screenshot](docs/images/winpane.png)\n\nSee the [guide](docs/guide.md).\n',
    })

    // Write image file
    fs.mkdirSync(path.join(workspace, 'docs', 'images'), { recursive: true })
    fs.writeFileSync(path.join(workspace, 'docs', 'images', 'winpane.png'), fakePng)

    // Simulate scaffolded project
    const projectDir = createTempDir({})
    const contentDocsDir = path.join(projectDir, 'src', 'content', 'docs')
    fs.mkdirSync(contentDocsDir, { recursive: true })
    fs.mkdirSync(path.join(projectDir, 'public'), { recursive: true })

    // Step 1: Copy docs (including images)
    copyDocs({
      docsPath: path.join(workspace, 'docs'),
      projectDir,
      readme: true,
      workspaceDir: workspace,
    })

    // Image should be copied
    expect(fs.existsSync(path.join(contentDocsDir, 'images', 'winpane.png'))).toBe(true)

    // Step 2: Rewrite README links (including image paths)
    const indexPath = path.join(contentDocsDir, 'index.md')
    const indexContent = fs.readFileSync(indexPath, 'utf-8')
    const rewritten = await rewriteReadmeLinks(indexContent, 'docs', '/my-repo')
    fs.writeFileSync(indexPath, rewritten, 'utf-8')

    const finalIndex = fs.readFileSync(indexPath, 'utf-8')

    // Image path should be rewritten from docs/images/winpane.png to ./images/winpane.png
    expect(finalIndex).toContain('./images/winpane.png')
    expect(finalIndex).not.toContain('docs/images/winpane.png')

    // Link should also be rewritten
    expect(finalIndex).toContain('/my-repo/guide/')
  })
})
