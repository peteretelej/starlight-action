import * as path from 'node:path'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as cache from '@actions/cache'
import * as core from '@actions/core'

const CACHE_PATHS = [path.join(os.homedir(), '.npm')]

function getCacheKey(projectDir: string): string {
  const packageJsonPath = path.join(projectDir, 'package.json')
  const content = fs.readFileSync(packageJsonPath, 'utf-8')
  const hash = crypto.createHash('sha256').update(content).digest('hex')
  return `starlight-action-npm-${hash}`
}

/**
 * Attempts to restore the npm cache before install.
 * Returns true on cache hit, false on miss. Never throws.
 */
export async function restoreNpmCache(projectDir: string): Promise<boolean> {
  try {
    const key = getCacheKey(projectDir)
    core.info(`Cache key: ${key}`)

    const restoredKey = await cache.restoreCache(CACHE_PATHS, key)
    if (restoredKey) {
      core.info('npm cache restored successfully (cache hit)')
      return true
    }

    core.info('No matching npm cache found (cache miss)')
    return false
  } catch (error) {
    core.warning(`Failed to restore npm cache: ${error}`)
    return false
  }
}

/**
 * Saves the npm cache after install.
 * Warns on failure but does not throw.
 */
export async function saveNpmCache(projectDir: string): Promise<void> {
  try {
    const key = getCacheKey(projectDir)
    await cache.saveCache(CACHE_PATHS, key)
    core.info('npm cache saved successfully')
  } catch (error) {
    core.warning(`Failed to save npm cache: ${error}`)
  }
}
