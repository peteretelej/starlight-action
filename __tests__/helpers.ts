import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

/**
 * Creates a temporary directory with the given file structure.
 * Keys are relative paths, values are file contents.
 * Returns the path to the temp directory.
 */
export function createTempDir(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starlight-test-'))
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, relativePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, content, 'utf-8')
  }
  return dir
}

/**
 * Copies a fixture directory into a new temp directory.
 */
export function copyFixture(fixtureName: string): string {
  const fixtureDir = path.join(__dirname, 'fixtures', fixtureName)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'starlight-test-'))
  copyDirSync(fixtureDir, tmpDir)
  return tmpDir
}

function copyDirSync(src: string, dest: string): void {
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true })
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
