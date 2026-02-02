import * as fs from 'node:fs'
import * as path from 'node:path'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { DefaultArtifactClient } from '@actions/artifact'


/**
 * Runs the Astro build and verifies output.
 * Returns the path to the build output directory.
 */
export async function buildSite(projectDir: string): Promise<string> {
  core.info('Building Starlight site...')

  await exec.exec('npx', ['astro', 'build'], {
    cwd: projectDir,
  })

  const distDir = path.join(projectDir, 'dist')
  if (!fs.existsSync(distDir)) {
    throw new Error('Astro build completed but dist/ directory was not created')
  }

  core.info('Astro build completed successfully')
  return distDir
}

/**
 * Uploads the build output as a GitHub Pages artifact.
 * Creates an uncompressed tar archive matching the format expected by
 * actions/upload-pages-artifact and actions/deploy-pages.
 */
export async function uploadArtifact(distDir: string): Promise<void> {
  core.info('Uploading build output as Pages artifact...')

  const runnerTemp = process.env.RUNNER_TEMP || path.join(path.dirname(distDir), '_tmp')
  if (!fs.existsSync(runnerTemp)) {
    fs.mkdirSync(runnerTemp, { recursive: true })
  }

  // Create uncompressed tar matching actions/upload-pages-artifact format
  const tarFile = path.join(runnerTemp, 'artifact.tar')
  await exec.exec('tar', [
    '--dereference',
    '--hard-dereference',
    '--directory', distDir,
    '-cvf', tarFile,
    '--exclude=.git',
    '--exclude=.github',
    '.',
  ])

  const tarStats = fs.statSync(tarFile)
  core.info(`Created artifact.tar (${(tarStats.size / 1024).toFixed(0)} KB)`)

  // Upload using @actions/artifact
  const artifactClient = new DefaultArtifactClient()
  await artifactClient.uploadArtifact('github-pages', [tarFile], runnerTemp, {
    compressionLevel: 0, // already an archive, no further compression needed
    retentionDays: 1,
  })

  // Clean up the tar file
  try {
    fs.unlinkSync(tarFile)
  } catch {
    core.warning('Failed to clean up temporary tar file')
  }

  core.info('Pages artifact uploaded successfully')
}
