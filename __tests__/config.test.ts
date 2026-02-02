import { describe, it, expect, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createTempDir } from './helpers.js'
import { generateConfig, buildThemeImport, type StarlightActionInputs } from '../src/config.js'

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  getInput: vi.fn(),
  setFailed: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
}))

function setupProjectDir(docs: Record<string, string>): string {
  const files: Record<string, string> = {}
  for (const [key, value] of Object.entries(docs)) {
    files[`src/content/docs/${key}`] = value
  }
  return createTempDir(files)
}

describe('generateConfig', () => {
  it('generates default config', () => {
    const projectDir = setupProjectDir({
      'getting-started.md': '---\ntitle: "Getting Started"\n---\n\nContent.\n',
    })

    const inputs: StarlightActionInputs = {
      title: 'My Docs',
      description: 'Documentation site',
      base: '/my-repo',
      site: 'https://user.github.io',
    }

    generateConfig(projectDir, inputs)

    const configPath = path.join(projectDir, 'astro.config.mjs')
    expect(fs.existsSync(configPath)).toBe(true)

    const content = fs.readFileSync(configPath, 'utf-8')
    expect(content).toContain("title: \"My Docs\"")
    expect(content).toContain("description: \"Documentation site\"")
    expect(content).toContain("site: 'https://user.github.io'")
    expect(content).toContain("base: '/my-repo'")
    expect(content).toContain('Getting Started')
  })

  it('generates config with all inputs including logo', () => {
    const projectDir = setupProjectDir({
      'guide.md': '---\ntitle: "Guide"\n---\n\nContent.\n',
    })
    // Create a fake logo
    fs.mkdirSync(path.join(projectDir, 'public'), { recursive: true })

    const inputs: StarlightActionInputs = {
      title: 'My Project',
      description: 'A great project',
      base: '/project',
      site: 'https://user.github.io',
      logo: 'assets/logo.svg',
    }

    generateConfig(projectDir, inputs)

    const content = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')
    expect(content).toContain('logo')
    expect(content).toContain('logo.svg')
  })

  it('deep-merges with user config file', () => {
    const projectDir = setupProjectDir({
      'guide.md': '---\ntitle: "Guide"\n---\n\nContent.\n',
    })

    // Write a user config JSON
    const userConfigPath = path.join(projectDir, 'starlight.config.json')
    fs.writeFileSync(
      userConfigPath,
      JSON.stringify({
        editLink: { baseUrl: 'https://github.com/user/repo/edit/main/' },
        social: { github: 'https://github.com/user/repo' },
      }),
      'utf-8',
    )

    const inputs: StarlightActionInputs = {
      title: 'My Docs',
      description: 'Docs',
      base: '/repo',
      site: 'https://user.github.io',
      configPath: userConfigPath,
    }

    generateConfig(projectDir, inputs)

    const content = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')
    expect(content).toContain('editLink')
    expect(content).toContain('social')
    expect(content).toContain('github')
  })

  it('user config values override generated values', () => {
    const projectDir = setupProjectDir({
      'guide.md': '---\ntitle: "Guide"\n---\n\nContent.\n',
    })

    const userConfigPath = path.join(projectDir, 'starlight.config.json')
    fs.writeFileSync(
      userConfigPath,
      JSON.stringify({
        title: 'User Override Title',
        description: 'User description',
      }),
      'utf-8',
    )

    const inputs: StarlightActionInputs = {
      title: 'Generated Title',
      description: 'Generated description',
      base: '/repo',
      site: 'https://user.github.io',
      configPath: userConfigPath,
    }

    generateConfig(projectDir, inputs)

    const content = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')
    expect(content).toContain('User Override Title')
    expect(content).toContain('User description')
    expect(content).not.toContain('Generated Title')
  })

  it('generates config with customCssPaths', () => {
    const projectDir = setupProjectDir({
      'guide.md': '---\ntitle: "Guide"\n---\n\nContent.\n',
    })

    const inputs: StarlightActionInputs = {
      title: 'My Docs',
      description: 'Docs',
      base: '/repo',
      site: 'https://user.github.io',
      customCssPaths: ['./src/styles/colors.css'],
    }

    generateConfig(projectDir, inputs)

    const content = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')
    expect(content).toContain('customCss')
    expect(content).toContain('./src/styles/colors.css')
  })

  it('generates config with multiple customCssPaths', () => {
    const projectDir = setupProjectDir({
      'guide.md': '---\ntitle: "Guide"\n---\n\nContent.\n',
    })

    const inputs: StarlightActionInputs = {
      title: 'My Docs',
      description: 'Docs',
      base: '/repo',
      site: 'https://user.github.io',
      customCssPaths: ['./src/styles/colors.css', './src/styles/layout.css'],
    }

    generateConfig(projectDir, inputs)

    const content = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')
    expect(content).toContain('customCss')
    expect(content).toContain('./src/styles/colors.css')
    expect(content).toContain('./src/styles/layout.css')
  })

  it('prepends customCssPaths before user-provided customCss', () => {
    const projectDir = setupProjectDir({
      'guide.md': '---\ntitle: "Guide"\n---\n\nContent.\n',
    })

    const userConfigPath = path.join(projectDir, 'starlight.config.json')
    fs.writeFileSync(
      userConfigPath,
      JSON.stringify({
        customCss: ['./src/styles/user.css'],
      }),
      'utf-8',
    )

    const inputs: StarlightActionInputs = {
      title: 'My Docs',
      description: 'Docs',
      base: '/repo',
      site: 'https://user.github.io',
      configPath: userConfigPath,
      customCssPaths: ['./src/styles/action.css'],
    }

    generateConfig(projectDir, inputs)

    const content = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')
    expect(content).toContain('customCss')
    // Action CSS should come before user CSS
    const actionIdx = content.indexOf('./src/styles/action.css')
    const userIdx = content.indexOf('./src/styles/user.css')
    expect(actionIdx).toBeLessThan(userIdx)
  })

  it('does not include customCss when no paths provided', () => {
    const projectDir = setupProjectDir({
      'guide.md': '---\ntitle: "Guide"\n---\n\nContent.\n',
    })

    const inputs: StarlightActionInputs = {
      title: 'My Docs',
      description: 'Docs',
      base: '/repo',
      site: 'https://user.github.io',
    }

    generateConfig(projectDir, inputs)

    const content = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')
    expect(content).not.toContain('customCss')
  })

  it('generates config with theme default export', () => {
    const projectDir = setupProjectDir({
      'guide.md': '---\ntitle: "Guide"\n---\n\nContent.\n',
    })

    const inputs: StarlightActionInputs = {
      title: 'My Docs',
      description: 'Docs',
      base: '/repo',
      site: 'https://user.github.io',
      theme: 'starlight-theme-rapide',
      themePlugin: 'starlightThemeRapide',
    }

    generateConfig(projectDir, inputs)

    const content = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')
    expect(content).toContain("import starlightThemeRapide from 'starlight-theme-rapide'")
    expect(content).toContain('plugins: [starlightThemeRapide()]')
  })

  it('generates config with theme named export', () => {
    const projectDir = setupProjectDir({
      'guide.md': '---\ntitle: "Guide"\n---\n\nContent.\n',
    })

    const inputs: StarlightActionInputs = {
      title: 'My Docs',
      description: 'Docs',
      base: '/repo',
      site: 'https://user.github.io',
      theme: 'starlight-ion-theme',
      themePlugin: '{ ion }',
    }

    generateConfig(projectDir, inputs)

    const content = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')
    expect(content).toContain("import { ion } from 'starlight-ion-theme'")
    expect(content).toContain('plugins: [ion()]')
  })

  it('generates config with theme options', () => {
    const projectDir = setupProjectDir({
      'guide.md': '---\ntitle: "Guide"\n---\n\nContent.\n',
    })

    const inputs: StarlightActionInputs = {
      title: 'My Docs',
      description: 'Docs',
      base: '/repo',
      site: 'https://user.github.io',
      theme: '@catppuccin/starlight',
      themePlugin: 'catppuccin',
      themeOptions: '{"flavor":"mocha","accent":"blue"}',
    }

    generateConfig(projectDir, inputs)

    const content = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')
    expect(content).toContain("import catppuccin from '@catppuccin/starlight'")
    expect(content).toContain('plugins: [catppuccin({"flavor":"mocha","accent":"blue"})]')
  })

  it('does not include plugins when no theme provided', () => {
    const projectDir = setupProjectDir({
      'guide.md': '---\ntitle: "Guide"\n---\n\nContent.\n',
    })

    const inputs: StarlightActionInputs = {
      title: 'My Docs',
      description: 'Docs',
      base: '/repo',
      site: 'https://user.github.io',
    }

    generateConfig(projectDir, inputs)

    const content = fs.readFileSync(path.join(projectDir, 'astro.config.mjs'), 'utf-8')
    expect(content).not.toContain('plugins')
  })
})

describe('buildThemeImport', () => {
  it('parses default export', () => {
    const result = buildThemeImport('starlight-theme-rapide', 'starlightThemeRapide')
    expect(result.importStatement).toBe("import starlightThemeRapide from 'starlight-theme-rapide'")
    expect(result.pluginCall).toBe('starlightThemeRapide()')
  })

  it('parses named export', () => {
    const result = buildThemeImport('starlight-ion-theme', '{ ion }')
    expect(result.importStatement).toBe("import { ion } from 'starlight-ion-theme'")
    expect(result.pluginCall).toBe('ion()')
  })

  it('includes options in plugin call', () => {
    const result = buildThemeImport(
      '@catppuccin/starlight',
      'catppuccin',
      '{"flavor":"mocha","accent":"blue"}',
    )
    expect(result.importStatement).toBe("import catppuccin from '@catppuccin/starlight'")
    expect(result.pluginCall).toBe('catppuccin({"flavor":"mocha","accent":"blue"})')
  })

  it('handles named export with options', () => {
    const result = buildThemeImport(
      'starlight-ion-theme',
      '{ ion }',
      '{"footer":true}',
    )
    expect(result.importStatement).toBe("import { ion } from 'starlight-ion-theme'")
    expect(result.pluginCall).toBe('ion({"footer":true})')
  })
})
