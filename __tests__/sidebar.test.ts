import { describe, it, expect, vi } from 'vitest'
import { createTempDir } from './helpers.js'
import { generateSidebar } from '../src/sidebar.js'

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  getInput: vi.fn(),
  setFailed: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
}))

describe('generateSidebar', () => {
  it('generates sidebar from flat directory', () => {
    const dir = createTempDir({
      'getting-started.md': '---\ntitle: "Getting Started"\n---\n\nContent.\n',
      'installation.md': '---\ntitle: "Installation"\n---\n\nContent.\n',
      'configuration.md': '---\ntitle: "Configuration"\n---\n\nContent.\n',
    })

    const sidebar = generateSidebar(dir)

    expect(sidebar).toHaveLength(3)
    expect(sidebar.map((s) => s.label)).toEqual([
      'Configuration',
      'Getting Started',
      'Installation',
    ])
    expect(sidebar[0].link).toBe('/configuration')
  })

  it('generates sidebar with nested subdirectories', () => {
    const dir = createTempDir({
      'intro.md': '---\ntitle: "Introduction"\n---\n\nContent.\n',
      'api/reference.md': '---\ntitle: "API Reference"\n---\n\nContent.\n',
      'api/endpoints.md': '---\ntitle: "Endpoints"\n---\n\nContent.\n',
    })

    const sidebar = generateSidebar(dir)

    const apiGroup = sidebar.find((s) => s.label === 'Api')
    expect(apiGroup).toBeDefined()
    expect(apiGroup!.items).toHaveLength(2)
    expect(apiGroup!.items!.map((i) => i.label).sort()).toEqual([
      'API Reference',
      'Endpoints',
    ])
  })

  it('sorts alphabetically by default', () => {
    const dir = createTempDir({
      'zebra.md': '---\ntitle: "Zebra"\n---\n\nContent.\n',
      'apple.md': '---\ntitle: "Apple"\n---\n\nContent.\n',
      'mango.md': '---\ntitle: "Mango"\n---\n\nContent.\n',
    })

    const sidebar = generateSidebar(dir)
    const labels = sidebar.map((s) => s.label)

    expect(labels).toEqual(['Apple', 'Mango', 'Zebra'])
  })

  it('sorts by order frontmatter before alphabetical', () => {
    const dir = createTempDir({
      'zebra.md': '---\ntitle: "Zebra"\norder: 1\n---\n\nContent.\n',
      'apple.md': '---\ntitle: "Apple"\n---\n\nContent.\n',
      'mango.md': '---\ntitle: "Mango"\norder: 2\n---\n\nContent.\n',
    })

    const sidebar = generateSidebar(dir)
    const labels = sidebar.map((s) => s.label)

    // Ordered items first (1, 2), then alphabetical
    expect(labels).toEqual(['Zebra', 'Mango', 'Apple'])
  })

  it('excludes index.md from sidebar items at root level', () => {
    const dir = createTempDir({
      'index.md': '---\ntitle: "Home"\n---\n\nWelcome.\n',
      'guide.md': '---\ntitle: "Guide"\n---\n\nContent.\n',
    })

    const sidebar = generateSidebar(dir)

    expect(sidebar).toHaveLength(1)
    expect(sidebar[0].label).toBe('Guide')
  })

  it('includes index.md in nested directories', () => {
    const dir = createTempDir({
      'api/index.md': '---\ntitle: "API Overview"\n---\n\nOverview.\n',
      'api/reference.md': '---\ntitle: "Reference"\n---\n\nContent.\n',
    })

    const sidebar = generateSidebar(dir)
    const apiGroup = sidebar.find((s) => s.label === 'Api')

    expect(apiGroup).toBeDefined()
    expect(apiGroup!.items).toHaveLength(2)
    expect(apiGroup!.items![0].label).toBe('API Overview')
  })
})
