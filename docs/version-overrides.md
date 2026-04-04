---
title: Version Overrides
description: How to use astro_version and starlight_version inputs to unblock builds.
---

Starlight Action pins default versions of Astro and Starlight that are tested to work together. If a new release introduces an incompatibility before the action is updated, the `astro_version` and `starlight_version` inputs let you unblock your builds immediately.

## When to use overrides

Use these inputs only when:

- The action's default versions cause build failures due to an upstream incompatibility
- You need to test against a specific version combination
- A new Starlight or Astro release requires a version bump that hasn't been released in the action yet

For most users, the defaults work and no override is needed.

## Usage

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    docs: docs/
    astro_version: '^6.0.0'
    starlight_version: '~0.38.0'
```

Both inputs accept any valid npm version range string (e.g., `^6.0.0`, `~0.38.0`, `6.1.2`).

## Finding compatible versions

Astro and Starlight must be compatible with each other. To find a working pair:

1. Check the [Starlight changelog](https://github.com/withastro/starlight/releases) for the version you want
2. Look at its `peerDependencies` to see which Astro versions it supports
3. Set both inputs to matching ranges

If you provide incompatible versions, the build will fail during `npm install` or `astro build` with a clear error message from npm or Astro.

## Current defaults

The action currently defaults to:

- **Astro:** `^6.0.0`
- **Starlight:** `~0.38.0`

These are updated when new compatible releases are tested and verified.

## Example: pinning to an older version

If Starlight 0.39 introduces a regression, you can pin back to 0.38:

```yaml
- uses: peteretelej/starlight-action@v1
  with:
    starlight_version: '~0.38.0'
```

The `astro_version` input does not need to be set unless Astro itself is the problem. Each input is independent - you can override one without the other.
