import { describe, it, expect, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createTempDir } from '../helpers.js'
import { processAllFrontmatter } from '../../src/frontmatter.js'
import { generateConfig } from '../../src/config.js'
import { copyDocs } from '../../src/copy-docs.js'
import { copyCss } from '../../src/copy-css.js'

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

function setupWorkspace(files: Record<string, string>): string {
  return createTempDir(files)
}

function setupProject(): string {
  const projectDir = createTempDir({})
  const contentDocsDir = path.join(projectDir, 'src', 'content', 'docs')
  fs.mkdirSync(contentDocsDir, { recursive: true })
  fs.mkdirSync(path.join(projectDir, 'public'), { recursive: true })
  return projectDir
}

describe('integration: theme + custom CSS pipeline', () => {
  it('generates config with theme and single custom CSS file', async () => {
    const workspace = setupWorkspace({
      'docs/guide.md': '# Guide\n\nWelcome.\n',
      'docs/styles/custom.css': ':root { --sl-color-accent: red; }',
    })
    const projectDir = setupProject()

    copyDocs({
      docsPath: path.join(workspace, 'docs'),
      projectDir,
      readme: false,
      workspaceDir: workspace,
    })

    const contentDocsDir = path.join(projectDir, 'src', 'content', 'docs')
    await processAllFrontmatter(contentDocsDir)

    const { configPaths: customCssPaths } = await copyCss({
      customCssInput: 'docs/styles/custom.css',
      workspaceDir: workspace,
      projectDir,
    })

    generateConfig(projectDir, {
      title: 'Theme Test',
      description: 'Testing themes',
      base: '/test-repo',
      site: 'https://user.github.io',
      customCssPaths,
      theme: 'starlight-theme-rapide',
      themePlugin: 'starlightThemeRapide',
    })

    const configContent = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')

    // Theme import present
    expect(configContent).toContain("import starlightThemeRapide from 'starlight-theme-rapide'")
    // Plugins array present
    expect(configContent).toContain('plugins: [starlightThemeRapide()]')
    // Custom CSS present
    expect(configContent).toContain('customCss')
    expect(configContent).toContain('./src/styles/custom.css')
    // Standard imports still present
    expect(configContent).toContain("import { defineConfig } from 'astro/config'")
    expect(configContent).toContain("import starlight from '@astrojs/starlight'")
  })

  it('generates config with named export theme and multiple custom CSS files', async () => {
    const workspace = setupWorkspace({
      'docs/guide.md': '# Guide\n\nWelcome.\n',
      'docs/styles/colors.css': ':root { --sl-color-accent: blue; }',
      'docs/styles/layout.css': '.sl-container { max-width: 80rem; }',
    })
    const projectDir = setupProject()

    copyDocs({
      docsPath: path.join(workspace, 'docs'),
      projectDir,
      readme: false,
      workspaceDir: workspace,
    })

    const contentDocsDir = path.join(projectDir, 'src', 'content', 'docs')
    await processAllFrontmatter(contentDocsDir)

    const { configPaths: customCssPaths } = await copyCss({
      customCssInput: 'docs/styles/colors.css, docs/styles/layout.css',
      workspaceDir: workspace,
      projectDir,
    })

    generateConfig(projectDir, {
      title: 'Ion Theme Test',
      description: 'Testing Ion theme',
      base: '/test-repo',
      site: 'https://user.github.io',
      customCssPaths,
      theme: 'starlight-ion-theme',
      themePlugin: '{ ion }',
      themeOptions: '{"footer":true}',
    })

    const configContent = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')

    // Named import
    expect(configContent).toContain("import { ion } from 'starlight-ion-theme'")
    // Plugin with options
    expect(configContent).toContain('plugins: [ion({"footer":true})]')
    // Both CSS files present
    expect(configContent).toContain('./src/styles/colors.css')
    expect(configContent).toContain('./src/styles/layout.css')
  })

  it('generates config with theme but no custom CSS (regression)', async () => {
    const workspace = setupWorkspace({
      'docs/guide.md': '# Guide\n\nWelcome.\n',
    })
    const projectDir = setupProject()

    copyDocs({
      docsPath: path.join(workspace, 'docs'),
      projectDir,
      readme: false,
      workspaceDir: workspace,
    })

    const contentDocsDir = path.join(projectDir, 'src', 'content', 'docs')
    await processAllFrontmatter(contentDocsDir)

    generateConfig(projectDir, {
      title: 'Catppuccin Test',
      description: 'Testing Catppuccin theme',
      base: '/test-repo',
      site: 'https://user.github.io',
      theme: '@catppuccin/starlight',
      themePlugin: 'catppuccin',
      themeOptions: '{"flavor":"mocha","accent":"blue"}',
    })

    const configContent = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')

    // Theme present
    expect(configContent).toContain("import catppuccin from '@catppuccin/starlight'")
    expect(configContent).toContain('plugins: [catppuccin({"flavor":"mocha","accent":"blue"})]')
    // No customCss key
    expect(configContent).not.toContain('customCss')
    // Config is syntactically valid (basic check: balanced braces)
    const opens = (configContent.match(/\{/g) || []).length
    const closes = (configContent.match(/\}/g) || []).length
    expect(opens).toBe(closes)
  })
})
