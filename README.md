# Starlight Action

A GitHub Action that builds a [Starlight](https://starlight.astro.build/) documentation site from your Markdown files. Point it at your `docs/` folder and deploy a full documentation site with search, sidebar navigation, and dark mode - no config required.

## Usage

```yaml
- uses: peteretelej/starlight-action@v1
```

With options:

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    docs: docs/
    title: My Project
    description: Project documentation
    logo: public/logo.svg
    readme: true
```

## Deploy to GitHub Pages

### 1. Enable GitHub Pages

Go to your repo **Settings > Pages** and set the **Source** to **GitHub Actions**.

This is required before the workflow will run. It creates the `github-pages` environment that the deploy step needs.

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
      - uses: actions/checkout@v5
      - uses: peteretelej/starlight-action@v1
        with:
          docs: docs/

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

The `permissions` block is required. `pages: write` allows creating the deployment, and `id-token: write` provides the OIDC token for branch protection validation.

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `docs` | `docs/` | Path to your Markdown documentation folder |
| `title` | repo name | Site title |
| `description` | repo description | Site meta description |
| `logo` | - | Path to a logo file (SVG/PNG) for the site header |
| `readme` | `false` | Include README.md as the landing page, with links resolved |
| `base` | `/<repo-name>` | Base path (set to `/` for custom domains) |
| `config` | - | Path to a JSON file with [Starlight config](https://starlight.astro.build/reference/configuration/) overrides |

## How it works

The action scaffolds a temporary Starlight project, copies your Markdown files into it, generates a sidebar from your folder structure, and builds static HTML. The output is uploaded as a GitHub Pages artifact ready for deployment.

If `readme: true`, your README.md becomes the landing page and relative links pointing into `docs/` are rewritten to work on the built site.

## License

MIT
