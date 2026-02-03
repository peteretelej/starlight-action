# Starlight Action

Turn a `docs/` folder of Markdown files into an [Astro Starlight](https://starlight.astro.build/) documentation site with support for [Starlight themes](https://starlight.astro.build/resources/themes/) - zero config required.

## Demo

**[See it live](https://peteretelej.github.io/windows-cli-tools/)** - a documentation website built for [windows-cli-tools](https://github.com/peteretelej/windows-cli-tools) entirely using this Starlight Action, with the Catppuccin theme. No manual Astro setup, no config files, just a [single workflow file](https://github.com/peteretelej/windows-cli-tools/blob/main/.github/workflows/docs.yml).

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
| `custom_css` | No | - | Comma-separated CSS file paths for custom styles |
| `theme` | No | - | npm package name for a Starlight community theme |
| `theme_plugin` | No | - | Theme plugin export name (required with `theme`) |
| `theme_options` | No | - | JSON object with theme configuration options |

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

## Themes & Custom Styling

### Custom CSS

Override Starlight's default styles by pointing to your own CSS files:

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    custom_css: ./docs/custom.css
```

Multiple files can be comma-separated:

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    custom_css: ./docs/styles/colors.css, ./docs/styles/layout.css
```

See the [Starlight CSS & Styling guide](https://starlight.astro.build/guides/css-and-tailwind/) for available custom properties and selectors.

### Community Themes

Install a Starlight community theme by providing its npm package name and plugin export:

| Input | Description |
|-------|-------------|
| `theme` | npm package name (e.g. `starlight-theme-rapide`) |
| `theme_plugin` | Export name - use `{ name }` for named exports, plain name for default exports |
| `theme_options` | Optional JSON object with theme configuration |

Example using [Rapide](https://starlight-theme-rapide.vercel.app/getting-started/) (default export, no options):

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    theme: starlight-theme-rapide
    theme_plugin: starlightThemeRapide
```

Example using [Catppuccin](https://starlight.catppuccin.com/getting-started/) with options:

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    theme: "@catppuccin/starlight"
    theme_plugin: catppuccin
    theme_options: '{"flavor":"mocha","accent":"blue"}'
```

Example using [Ion](https://louisescher.github.io/starlight-ion-theme/getting-started/) (named export) with custom CSS:

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    theme: starlight-ion-theme
    theme_plugin: "{ ion }"
    theme_options: '{"footer":true}'
    custom_css: ./docs/overrides.css
```

### Finding a Theme's Plugin Name

Most themes on [Starlight Themes](https://starlight.astro.build/resources/themes/) show their plugin name in the installation instructions:

1. Visit the theme's page or npm listing
2. Look for the "Installation" or "Usage" section
3. Find the `import` line - the imported name is the `theme_plugin` value
4. If the import uses `import { name }`, wrap it as `{ name }` in `theme_plugin`
5. If the import uses `import name`, use the plain name

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
# Using built-in test fixtures
npm run test:e2e

# Using any local repo with a docs/ folder
npm run test:e2e -- /path/to/your/repo

# Generate the site and keep the output for preview
npm run test:e2e -- /path/to/your/repo --output preview
npx serve preview
```

When given a repo path, the test will use its `docs/` folder and `README.md`
(if present), matching how the action runs in CI. Use `--output` to save the
built site for local inspection.

Source lives in `src/` and is bundled to `dist/index.js` via `@vercel/ncc`.
A pre-commit hook runs the build automatically, so `dist/` stays in sync with
source changes.

## License

MIT
