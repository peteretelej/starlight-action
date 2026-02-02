# Starlight Action

Turn a `docs/` folder of Markdown files into a [Starlight](https://starlight.astro.build/) documentation site - zero config required.

## Quick Start

Add this step to any workflow:

```yaml
- uses: peteretelej/starlight-action@v1
```

The action reads Markdown from `docs/`, builds a Starlight site, and uploads
a GitHub Pages artifact. Pair it with `actions/deploy-pages` to publish.

## Deploy to GitHub Pages

### 1. Enable Pages

Go to your repo **Settings > Pages** and set the **Source** to **GitHub Actions**.

### 2. Add the workflow

Create `.github/workflows/docs.yml`:

```yaml
name: Deploy Docs
on:
  push:
    branches: [main]
    paths: [docs/**, README.md]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: peteretelej/starlight-action@v1
        with:
          docs: docs/
          title: My Project
          readme: true

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

The `permissions` block is required: `pages: write` allows creating the
deployment and `id-token: write` provides the OIDC token for branch
protection validation.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `docs` | No | `docs/` | Path to the Markdown documentation folder |
| `title` | No | repo name | Site title shown in header and browser tab |
| `description` | No | repo description | Site meta description |
| `logo` | No | - | Path to a logo file (SVG/PNG) for the site header |
| `readme` | No | `false` | Include README.md as the landing page with links resolved |
| `base` | No | `/<repo-name>` | Base path override (set to `/` for custom domains) |
| `config` | No | - | Path to a JSON file with partial Starlight config overrides |

## How It Works

1. Scaffolds a temporary Starlight project (outside your repo)
2. Installs Astro and Starlight dependencies (cached for speed)
3. Copies your Markdown files into the Starlight content directory
4. Auto-generates a sidebar from your folder structure
5. Infers page titles from `# headings` or filenames when frontmatter is missing
6. If `readme: true`, copies README.md as the landing page and rewrites relative
   links pointing into `docs/` so they work on the built site
7. Builds static HTML and uploads the output as a Pages artifact

## Config Escape Hatch

The `config` input accepts a path to a JSON file with any
[Starlight configuration](https://starlight.astro.build/reference/configuration/)
options. These are deep-merged with the generated config, so you can customize
social links, head tags, custom CSS, and more without the action needing
dedicated inputs for each option.

Example `.starlight.config.json`:

```json
{
  "social": {
    "github": "https://github.com/user/repo"
  },
  "head": [
    { "tag": "meta", "attrs": { "name": "og:image", "content": "/social.png" } }
  ],
  "customCss": ["./src/custom.css"]
}
```

Use it in your workflow:

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    config: .starlight.config.json
```

The action's generated values (title, description, sidebar) serve as defaults.
Your config values take precedence on conflicts.

## Contributing

```bash
npm install

npm test

npm run lint

npm run check

npm run build
```

Run the full end-to-end test locally (scaffolds a real Starlight project,
builds it, and verifies HTML output):

```bash
npm run test:e2e
```

Source lives in `src/` and is bundled to `dist/index.js` via `@vercel/ncc`.
A pre-commit hook runs the build automatically, so `dist/` stays in sync with
source changes.

## License

MIT
