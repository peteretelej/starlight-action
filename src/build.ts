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
 * Creates a tar.gz archive matching the format expected by actions/deploy-pages.
 */
export async function uploadArtifact(distDir: string): Promise<void> {
  core.info('Uploading build output as Pages artifact...')

  // Create tar.gz archive matching what actions/deploy-pages expects
  const tarFile = path.join(path.dirname(distDir), 'github-pages.tar.gz')
  await exec.exec('tar', ['-czf', tarFile, '-C', distDir, '.'])

  // Upload using @actions/artifact
  const artifactClient = new DefaultArtifactClient()
  await artifactClient.uploadArtifact('github-pages', [tarFile], path.dirname(tarFile), {
    compressionLevel: 0, // already compressed via tar -z
  })

  // Clean up the tar file
  fs.unlinkSync(tarFile)

  core.info('Pages artifact uploaded successfully')
}
