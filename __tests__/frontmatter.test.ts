import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createTempDir } from './helpers.js'
import { processFrontmatter, processAllFrontmatter } from '../src/frontmatter.js'

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  getInput: vi.fn(),
  setFailed: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
}))

describe('processFrontmatter', () => {
  it('infers title from # heading when no frontmatter exists', () => {
    const dir = createTempDir({
      'page.md': '# My Page Title\n\nSome content here.\n',
    })
    const filePath = path.join(dir, 'page.md')

    processFrontmatter(filePath)

    const result = fs.readFileSync(filePath, 'utf-8')
    expect(result).toContain('title: "My Page Title"')
    expect(result).toMatch(/^---\n/)
  })

  it('infers title from filename when no heading exists', () => {
    const dir = createTempDir({
      'getting-started.md': 'Some content without a heading.\n',
    })
    const filePath = path.join(dir, 'getting-started.md')

    processFrontmatter(filePath)

    const result = fs.readFileSync(filePath, 'utf-8')
    expect(result).toContain('title: "Getting Started"')
  })

  it('leaves existing frontmatter with title unchanged', () => {
    const original = '---\ntitle: "My Custom Title"\n---\n\n# Heading\n\nContent.\n'
    const dir = createTempDir({ 'page.md': original })
    const filePath = path.join(dir, 'page.md')

    processFrontmatter(filePath)

    const result = fs.readFileSync(filePath, 'utf-8')
    expect(result).toBe(original)
  })

  it('injects title into frontmatter that has no title field', () => {
    const dir = createTempDir({
      'page.md': '---\norder: 1\ndescription: "test"\n---\n\n# Heading From Content\n\nBody.\n',
    })
    const filePath = path.join(dir, 'page.md')

    processFrontmatter(filePath)

    const result = fs.readFileSync(filePath, 'utf-8')
    expect(result).toContain('title: "Heading From Content"')
    expect(result).toContain('order: 1')
  })

  it('uses directory name for index.md title', () => {
    const dir = createTempDir({
      'guides/index.md': 'Some content.\n',
    })
    const filePath = path.join(dir, 'guides', 'index.md')

    processFrontmatter(filePath)

    const result = fs.readFileSync(filePath, 'utf-8')
    expect(result).toContain('title: "Guides"')
  })

  it('handles single-quoted title in frontmatter', () => {
    const original = "---\ntitle: 'Single Quoted'\n---\n\nContent.\n"
    const dir = createTempDir({ 'page.md': original })
    const filePath = path.join(dir, 'page.md')

    processFrontmatter(filePath)

    const result = fs.readFileSync(filePath, 'utf-8')
    expect(result).toBe(original)
  })
})

describe('processAllFrontmatter', () => {
  it('processes all .md files recursively', async () => {
    const dir = createTempDir({
      'intro.md': '# Intro\n\nContent.\n',
      'guide/setup.md': 'Setup instructions.\n',
    })

    await processAllFrontmatter(dir)

    const intro = fs.readFileSync(path.join(dir, 'intro.md'), 'utf-8')
    expect(intro).toContain('title: "Intro"')

    const setup = fs.readFileSync(path.join(dir, 'guide', 'setup.md'), 'utf-8')
    expect(setup).toContain('title: "Setup"')
  })
})
