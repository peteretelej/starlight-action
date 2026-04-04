---
title: Configuration
description: All available inputs for Starlight Action.
---

Starlight Action is designed to work with zero configuration, but every aspect of the build can be customized through workflow inputs.

## Inputs reference

| Input               | Default          | Description                                                 |
| ------------------- | ---------------- | ----------------------------------------------------------- |
| `docs`              | `docs/`          | Path to the Markdown documentation folder                   |
| `title`             | repo name        | Site title shown in header and browser tab                  |
| `description`       | repo description | Site meta description                                       |
| `logo`              | -                | Path to a logo file (SVG/PNG) for the site header           |
| `readme`            | `false`          | Include README.md as the landing page with links resolved   |
| `base`              | `/<repo-name>`   | Base path override (set to `/` for custom domains)          |
| `config`            | -                | Path to a JSON file with partial Starlight config overrides |
| `custom_css`        | -                | Comma-separated CSS file paths for custom styles            |
| `theme`             | -                | npm package name for a Starlight community theme            |
| `theme_plugin`      | -                | Theme plugin export name (required with `theme`)            |
| `theme_options`     | -                | JSON object with theme configuration options                |
| `astro_version`     | `^6.0.0`         | Astro version range override for unblocking builds          |
| `starlight_version` | `~0.38.0`        | Starlight version range override for unblocking builds      |

## Config escape hatch

The `config` input accepts a path to a JSON file with any [Starlight configuration](https://starlight.astro.build/reference/configuration/) options. These are deep-merged with the generated config, so you can customize social links, head tags, and more without dedicated inputs for each option.

Example `.starlight.config.json`:

```json
{
  "social": [{ "label": "GitHub", "icon": "github", "href": "https://github.com/user/repo" }],
  "head": [{ "tag": "meta", "attrs": { "name": "og:image", "content": "/social.png" } }]
}
```

Use it in your workflow:

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    config: .starlight.config.json
```

The action's generated values (title, description, sidebar) serve as defaults. Your config values take precedence on conflicts.

## Themes

Install a Starlight community theme by providing its npm package name and plugin export:

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    theme: starlight-theme-rapide
    theme_plugin: starlightThemeRapide
```

For named exports, wrap the name in braces:

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    theme: starlight-ion-theme
    theme_plugin: '{ ion }'
    theme_options: '{"footer":true}'
```

See the [Starlight Themes directory](https://starlight.astro.build/resources/themes/) for available themes.

## Custom CSS

Override Starlight's default styles by pointing to your own CSS files:

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    custom_css: ./docs/styles/colors.css, ./docs/styles/layout.css
```

See the [Starlight CSS & Styling guide](https://starlight.astro.build/guides/css-and-tailwind/) for available custom properties and selectors.
