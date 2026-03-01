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

  it('rewrites image paths with docs prefix to relative paths', async () => {
    const content = '![Logo](docs/images/logo.png)'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('./images/logo.png')
    expect(result).not.toContain('docs/images/logo.png')
  })

  it('rewrites image paths with ./docs prefix', async () => {
    const content = '![Screenshot](./docs/images/screenshot.jpg)'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('./images/screenshot.jpg')
  })

  it('rewrites nested image paths with docs prefix', async () => {
    const content = '![Diagram](docs/api/diagrams/arch.svg)'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('./api/diagrams/arch.svg')
  })

  it('leaves external image URLs unchanged', async () => {
    const content = '![Badge](https://img.shields.io/badge.svg)'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('https://img.shields.io/badge.svg')
  })

  it('leaves non-docs image paths unchanged', async () => {
    const content = '![Logo](assets/logo.png)'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('assets/logo.png')
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

  it('rewrites GIF image paths with docs prefix', async () => {
    const content = '![Demo](docs/images/demo.gif)'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('./images/demo.gif')
    expect(result).not.toContain('docs/images/demo.gif')
  })

  it('rewrites markdown link to non-md asset as relative path', async () => {
    const content = '[Watch demo](docs/videos/demo.mp4)'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('./videos/demo.mp4')
    expect(result).not.toContain('/my-repo/videos/demo.mp4/')
  })

  it('rewrites HTML video src with docs prefix', async () => {
    const content = '<video src="docs/videos/demo.mp4" controls></video>'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('src="./videos/demo.mp4"')
    expect(result).not.toContain('docs/videos/demo.mp4')
  })

  it('rewrites HTML source src inside video tag', async () => {
    const content = '<video controls>\n<source src="docs/videos/demo.webm" type="video/webm">\n</video>'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('src="./videos/demo.webm"')
  })

  it('rewrites HTML img src with docs prefix', async () => {
    const content = '<img src="docs/images/screenshot.png" alt="screenshot">'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('src="./images/screenshot.png"')
  })

  it('rewrites HTML video poster attribute', async () => {
    const content = '<video poster="docs/images/thumb.jpg" src="docs/videos/demo.mp4" controls></video>'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('poster="./images/thumb.jpg"')
    expect(result).toContain('src="./videos/demo.mp4"')
  })

  it('leaves external HTML video src unchanged', async () => {
    const content = '<video src="https://example.com/video.mp4" controls></video>'
    const result = await rewriteReadmeLinks(content, 'docs', '/my-repo')
    expect(result).toContain('https://example.com/video.mp4')
  })
})
