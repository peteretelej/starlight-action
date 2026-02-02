import { describe, it, expect } from 'vitest'
import { rewriteReadmeLinks } from '../src/readme-links.js'

describe('rewriteReadmeLinks', () => {
  it('rewrites docs/guide.md to /guide/', async () => {
    const content = 'Check the [guide](docs/guide.md) for details.'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('/my-repo/guide/')
    expect(result).not.toContain('docs/guide.md')
  })

  it('rewrites ./docs/contributing.md to /contributing/', async () => {
    const content = 'See [contributing](./docs/contributing.md).'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('/my-repo/contributing/')
  })

  it('lowercases rewritten paths for uppercase filenames', async () => {
    const content = 'See [contributing](docs/CONTRIBUTING.md).'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('/my-repo/contributing/')
    expect(result).not.toContain('CONTRIBUTING')
  })

  it('leaves external links unchanged', async () => {
    const content = 'Visit [website](https://example.com) for more.'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('https://example.com')
  })

  it('leaves anchor links unchanged', async () => {
    const content = 'See [FAQ section](#faq) below.'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('#faq')
  })

  it('leaves image links unchanged', async () => {
    const content = '![Logo](docs/logo.png)'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    // Image nodes are type 'image' not 'link', so they should be unchanged
    expect(result).toContain('docs/logo.png')
  })

  it('rewrites links with nested paths', async () => {
    const content = 'See [API ref](docs/api/reference.md).'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('/my-repo/api/reference/')
  })

  it('handles base path with trailing slash', async () => {
    const content = 'See [guide](docs/guide.md).'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo/')
    expect(result).toContain('/my-repo/guide/')
  })

  it('handles docs folder with trailing slash', async () => {
    const content = 'See [guide](docs/guide.md).'
    const result = await rewriteReadmeLinks(content, 'docs/', '/my-repo')
    expect(result).toContain('/my-repo/guide/')
  })

  it('does not rewrite non-docs relative links', async () => {
    const content = 'See [license](LICENSE.md).'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('LICENSE.md')
  })

  it('handles http:// links without rewriting', async () => {
    const content = 'See [old site](http://example.com).'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('http://example.com')
  })
})
