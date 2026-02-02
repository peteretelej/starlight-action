import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as core from '@actions/core'
import * as exec from '@actions/exec'

const ASTRO_VERSION = '^5.0.0'
const STARLIGHT_VERSION = '~0.34.0'

/**
 * Scaffolds a temporary Starlight project with dependencies installed.
 * Returns the path to the project directory.
 */
export async function scaffoldProject(): Promise<string> {
  const tmpBase = os.tmpdir()
  const projectDir = fs.mkdtempSync(path.join(tmpBase, 'starlight-action-'))

  core.info(`Scaffolding Starlight project in ${projectDir}`)

  const packageJson = {
    name: 'starlight-docs',
    version: '0.0.0',
    private: true,
    type: 'module',
    dependencies: {
      astro: ASTRO_VERSION,
      '@astrojs/starlight': STARLIGHT_VERSION,
      sharp: '^0.33.0',
    },
  }

  fs.writeFileSync(
    path.join(projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
    'utf-8',
  )

  // Install dependencies
  core.info('Installing Astro and Starlight dependencies...')
  await exec.exec('npm', ['install', '--prefer-offline'], {
    cwd: projectDir,
  })

  // Create required directory structure
  const dirs = [
    path.join(projectDir, 'src', 'content', 'docs'),
    path.join(projectDir, 'public'),
  ]
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true })
  }

  core.info('Starlight project scaffolded successfully')
  return projectDir
}
