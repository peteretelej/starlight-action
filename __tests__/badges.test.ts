import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createTempDir } from './helpers.js'
import { polishBadgeRows, polishAllBadgeRows } from '../src/badges.js'

describe('polishBadgeRows', () => {
  it('wraps linked badge rows in a readme-badges paragraph', async () => {
    const content = [
      '# Project',
      '',
      '[![CI](https://github.com/owner/repo/actions/workflows/ci.yml/badge.svg)](https://github.com/owner/repo/actions/workflows/ci.yml)',
      '[![npm](https://img.shields.io/npm/v/pkg)](https://www.npmjs.com/package/pkg)',
      '',
      'Some intro text.',
    ].join('\n')

    const result = await polishBadgeRows(content)

    expect(result).toContain('<p class="readme-badges">')
    expect(result).toContain('<a href="https://github.com/owner/repo/actions/workflows/ci.yml">')
    expect(result).toContain('<img src="https://img.shields.io/npm/v/pkg" alt="npm" />')
    expect(result).toContain('Some intro text.')
    expect(result).not.toContain('[![CI]')
  })

  it('wraps unlinked badge rows', async () => {
    const content = '![one](https://img.shields.io/badge/one)\n![two](https://img.shields.io/badge/two)\n'

    const result = await polishBadgeRows(content)

    expect(result).toContain('<p class="readme-badges">')
    expect(result).toContain('<img src="https://img.shields.io/badge/one" alt="one" />')
    expect(result).toContain('<img src="https://img.shields.io/badge/two" alt="two" />')
  })

  it('leaves a single-image paragraph unchanged', async () => {
    const content = '![Screenshot](images/screenshot.png)\n'

    const result = await polishBadgeRows(content)

    expect(result).toBe(content)
    expect(result).not.toContain('readme-badges')
  })

  it('leaves paragraphs with text mixed in unchanged', async () => {
    const content = 'Status: ![CI](https://img.shields.io/badge/ci) and ![npm](https://img.shields.io/badge/npm)\n'

    const result = await polishBadgeRows(content)

    expect(result).toBe(content)
  })

  it('preserves frontmatter', async () => {
    const content = [
      '---',
      'title: "My Project"',
      '---',
      '',
      '[![CI](https://img.shields.io/badge/ci)](https://example.com/ci)',
      '[![npm](https://img.shields.io/badge/npm)](https://example.com/npm)',
    ].join('\n')

    const result = await polishBadgeRows(content)

    expect(result).toMatch(/^---\ntitle: "My Project"\n---\n/)
    expect(result).toContain('readme-badges')
  })

  it('escapes quotes and ampersands in badge attributes', async () => {
    const content = '![a&"b"](https://img.shields.io/badge/a?x=1&y=2)\n![c](https://img.shields.io/badge/c)\n'

    const result = await polishBadgeRows(content)

    expect(result).toContain('alt="a&amp;&quot;b&quot;"')
    expect(result).toContain('src="https://img.shields.io/badge/a?x=1&amp;y=2"')
  })

  it('leaves content without badge rows unchanged', async () => {
    const content = '# Title\n\nJust a paragraph with a [link](https://example.com).\n'

    const result = await polishBadgeRows(content)

    expect(result).toBe(content)
  })
})

describe('polishAllBadgeRows', () => {
  it('processes all .md files recursively', async () => {
    const badges = [
      '[![CI](https://img.shields.io/badge/ci)](https://example.com/ci)',
      '[![npm](https://img.shields.io/badge/npm)](https://example.com/npm)',
    ].join('\n')
    const dir = createTempDir({
      'index.md': `# Home\n\n${badges}\n`,
      'guide/setup.md': `# Setup\n\n${badges}\n`,
    })

    await polishAllBadgeRows(dir)

    expect(fs.readFileSync(path.join(dir, 'index.md'), 'utf-8')).toContain('readme-badges')
    expect(
      fs.readFileSync(path.join(dir, 'guide', 'setup.md'), 'utf-8'),
    ).toContain('readme-badges')
  })
})
