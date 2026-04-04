---
title: Troubleshooting
description: Common errors and how to fix them.
---

## Zod v3/v4 schema incompatibility

**Symptom:** Build fails with an error like `Cannot read properties of undefined (reading '_zod')` or a Zod-related schema validation crash.

**Cause:** Astro 5.13.6+ introduced a Zod v4 dependency (`zod/v4` subpath), but older Starlight versions (0.34 and earlier) return Zod v3 schemas from `docsSchema()`. The two schema formats are incompatible at runtime.

**Fix:** This was resolved in Starlight Action by bumping defaults to Astro 6 + Starlight 0.38, which are both on Zod v4. If you hit this error on an older version of the action, either update to the latest release or use version overrides:

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    astro_version: '^6.0.0'
    starlight_version: '~0.38.0'
```

## Build fails with "Could not resolve dependency"

**Symptom:** `npm install` fails with a peer dependency conflict.

**Cause:** The Astro and Starlight version ranges are incompatible.

**Fix:** Check the [Starlight releases](https://github.com/withastro/starlight/releases) for peer dependency requirements and set both `astro_version` and `starlight_version` to compatible ranges. See [Version Overrides](/version-overrides/) for details.

## Pages deployment fails with 403 or permission error

**Symptom:** The deploy step fails with a permissions error.

**Fix:** Ensure your workflow has the required permissions block:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

Also verify that GitHub Pages is set to deploy from **GitHub Actions** (not a branch) in your repo's **Settings > Pages**.

## Sidebar order is wrong

**Symptom:** Pages appear in an unexpected order in the sidebar.

**Cause:** Starlight Action auto-generates the sidebar from your folder structure, sorting alphabetically by default.

**Fix:** Use frontmatter to control ordering:

```markdown
---
title: Getting Started
sidebar:
  order: 1
---
```

Or use the `config` input with a JSON file to define the sidebar manually. See the [Starlight sidebar docs](https://starlight.astro.build/guides/sidebar/) for all options.

## README links are broken on the built site

**Symptom:** Links from README.md point to wrong locations or return 404.

**Cause:** The action rewrites relative links in README.md that point into `docs/`, but links to files outside `docs/` (like `src/` or `LICENSE`) cannot be resolved on the static site.

**Fix:** Use absolute GitHub URLs for links that point outside your docs folder:

```markdown
<!-- Instead of this -->

[Source](src/index.ts)

<!-- Use this -->

[Source](https://github.com/user/repo/blob/main/src/index.ts)
```

## Theme plugin not found

**Symptom:** Build fails with "is not a function" or "cannot find module" errors after setting `theme`.

**Fix:** Verify the `theme_plugin` value matches the theme's actual export name. Check the theme's installation docs for the correct import name:

- Default export (e.g., `import starlightThemeRapide from 'starlight-theme-rapide'`): use plain name `starlightThemeRapide`
- Named export (e.g., `import { ion } from 'starlight-ion-theme'`): wrap in braces `{ ion }`
