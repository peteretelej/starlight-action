import { describe, it, expect, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createTempDir } from './helpers.js'
import { copyCss } from '../src/copy-css.js'

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  getInput: vi.fn(),
  setFailed: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
}))

describe('copyCss', () => {
  it('returns empty array when input is undefined', async () => {
    const workspaceDir = createTempDir({})
    const projectDir = createTempDir({})
    const result = await copyCss({ customCssInput: undefined, workspaceDir, projectDir })
    expect(result.configPaths).toEqual([])
  })

  it('returns empty array when input is empty string', async () => {
    const workspaceDir = createTempDir({})
    const projectDir = createTempDir({})
    const result = await copyCss({ customCssInput: '', workspaceDir, projectDir })
    expect(result.configPaths).toEqual([])
  })

  it('returns empty array when input is whitespace', async () => {
    const workspaceDir = createTempDir({})
    const projectDir = createTempDir({})
    const result = await copyCss({ customCssInput: '   ', workspaceDir, projectDir })
    expect(result.configPaths).toEqual([])
  })

  it('copies a single CSS file', async () => {
    const workspaceDir = createTempDir({
      'styles/colors.css': ':root { --accent: blue; }',
    })
    const projectDir = createTempDir({})

    const result = await copyCss({
      customCssInput: 'styles/colors.css',
      workspaceDir,
      projectDir,
    })

    expect(result.configPaths).toEqual(['./src/styles/colors.css'])
    const copied = fs.readFileSync(path.join(projectDir, 'src', 'styles', 'colors.css'), 'utf-8')
    expect(copied).toBe(':root { --accent: blue; }')
  })

  it('copies multiple comma-separated CSS files', async () => {
    const workspaceDir = createTempDir({
      'styles/colors.css': ':root { --accent: blue; }',
      'styles/layout.css': 'body { max-width: 80ch; }',
    })
    const projectDir = createTempDir({})

    const result = await copyCss({
      customCssInput: 'styles/colors.css, styles/layout.css',
      workspaceDir,
      projectDir,
    })

    expect(result.configPaths).toEqual([
      './src/styles/colors.css',
      './src/styles/layout.css',
    ])
    expect(fs.existsSync(path.join(projectDir, 'src', 'styles', 'colors.css'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'src', 'styles', 'layout.css'))).toBe(true)
  })

  it('handles whitespace in comma-separated input', async () => {
    const workspaceDir = createTempDir({
      'a.css': 'a {}',
      'b.css': 'b {}',
    })
    const projectDir = createTempDir({})

    const result = await copyCss({
      customCssInput: '  a.css ,  b.css  ',
      workspaceDir,
      projectDir,
    })

    expect(result.configPaths).toEqual(['./src/styles/a.css', './src/styles/b.css'])
  })

  it('throws for missing CSS file', async () => {
    const workspaceDir = createTempDir({})
    const projectDir = createTempDir({})

    await expect(
      copyCss({ customCssInput: 'missing.css', workspaceDir, projectDir }),
    ).rejects.toThrow('Custom CSS file not found')
  })

  it('throws for non-.css extension', async () => {
    const workspaceDir = createTempDir({
      'styles.scss': 'body {}',
    })
    const projectDir = createTempDir({})

    await expect(
      copyCss({ customCssInput: 'styles.scss', workspaceDir, projectDir }),
    ).rejects.toThrow('Custom CSS file must have .css extension')
  })

  it('handles duplicate basenames by prefixing with parent dir', async () => {
    const workspaceDir = createTempDir({
      'theme/colors.css': ':root { --theme: red; }',
      'utils/colors.css': ':root { --utils: green; }',
    })
    const projectDir = createTempDir({})

    const result = await copyCss({
      customCssInput: 'theme/colors.css, utils/colors.css',
      workspaceDir,
      projectDir,
    })

    expect(result.configPaths).toEqual([
      './src/styles/theme-colors.css',
      './src/styles/utils-colors.css',
    ])
    const themeContent = fs.readFileSync(
      path.join(projectDir, 'src', 'styles', 'theme-colors.css'),
      'utf-8',
    )
    expect(themeContent).toBe(':root { --theme: red; }')
    const utilsContent = fs.readFileSync(
      path.join(projectDir, 'src', 'styles', 'utils-colors.css'),
      'utf-8',
    )
    expect(utilsContent).toBe(':root { --utils: green; }')
  })

  it('validates extension before checking file existence', async () => {
    const workspaceDir = createTempDir({})
    const projectDir = createTempDir({})

    await expect(
      copyCss({ customCssInput: 'style.txt', workspaceDir, projectDir }),
    ).rejects.toThrow('.css extension')
  })
})
