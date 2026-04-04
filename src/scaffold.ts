import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { restoreNpmCache, saveNpmCache } from './cache'

const ASTRO_VERSION = '^6.0.0'
const STARLIGHT_VERSION = '~0.38.0'

export interface ScaffoldOptions {
  astroVersion?: string
  starlightVersion?: string
}

/**
 * Scaffolds a temporary Starlight project with dependencies installed.
 * Returns the path to the project directory.
 */
export async function scaffoldProject(theme?: string, options?: ScaffoldOptions): Promise<string> {
  const astroVersion = options?.astroVersion ?? ASTRO_VERSION
  const starlightVersion = options?.starlightVersion ?? STARLIGHT_VERSION

  const tmpBase = os.tmpdir()
  const projectDir = fs.mkdtempSync(path.join(tmpBase, 'starlight-action-'))

  core.info(`Scaffolding Starlight project in ${projectDir}`)
  core.info(`Using astro@${astroVersion}, @astrojs/starlight@${starlightVersion}`)

  const packageJson = {
    name: 'starlight-docs',
    version: '0.0.0',
    private: true,
    type: 'module',
    dependencies: {
      astro: astroVersion,
      '@astrojs/starlight': starlightVersion,
      sharp: '^0.33.0',
      ...(theme ? { [theme]: 'latest' } : {}),
    },
  }

  fs.writeFileSync(
    path.join(projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
    'utf-8',
  )

  // Restore npm cache if available
  const cacheHit = await restoreNpmCache(projectDir)

  // Install dependencies
  core.info('Installing Astro and Starlight dependencies...')
  await exec.exec('npm', ['install', '--prefer-offline'], {
    cwd: projectDir,
  })

  // Save npm cache on miss
  if (!cacheHit) {
    await saveNpmCache(projectDir)
  }

  // Create required directory structure
  const dirs = [path.join(projectDir, 'src', 'content', 'docs'), path.join(projectDir, 'public')]
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Astro 5+ silently ignores content without an explicit collection definition.
  // Without this file, docs build but produce 0 pages.
  const contentConfig = `import { defineCollection } from 'astro:content'
import { docsSchema } from '@astrojs/starlight/schema'

export const collections = {
  docs: defineCollection({ schema: docsSchema() }),
}
`
  fs.writeFileSync(path.join(projectDir, 'src', 'content.config.ts'), contentConfig, 'utf-8')

  core.info('Starlight project scaffolded successfully')
  return projectDir
}
