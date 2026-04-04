---
title: Starlight Action
description: Build a Starlight documentation site from your Markdown files - zero config required.
---

Starlight Action is a GitHub Action that turns your repository's `docs/` folder into a full [Astro Starlight](https://starlight.astro.build/) documentation site. No Astro setup, no config files, just Markdown.

It handles scaffolding, dependency installation, sidebar generation, frontmatter inference, and GitHub Pages deployment in a single workflow step.

## Quick start

### 1. Enable GitHub Pages

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

The `permissions` block is required: `pages: write` allows creating the deployment and `id-token: write` provides the OIDC token for branch protection validation.

### 3. Push your docs

Add Markdown files to `docs/` and push. The action builds a Starlight site and deploys it to GitHub Pages automatically.

## How it works

1. Scaffolds a temporary Starlight project with Astro and Starlight dependencies
2. Copies your Markdown files into the Starlight content directory
3. Auto-generates a sidebar from your folder structure
4. Infers page titles from `# headings` or filenames when frontmatter is missing
5. If `readme: true`, copies README.md as the landing page and rewrites relative links
6. Builds static HTML and uploads the output as a GitHub Pages artifact
