import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  getInput: vi.fn(),
  setFailed: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
}))

vi.mock('@actions/exec', () => ({
  exec: vi.fn().mockResolvedValue(0),
}))

vi.mock('../src/cache', () => ({
  restoreNpmCache: vi.fn().mockResolvedValue(false),
  saveNpmCache: vi.fn().mockResolvedValue(undefined),
}))

import { scaffoldProject } from '../src/scaffold.js'

describe('scaffoldProject', () => {
  it('creates package.json without theme dependency when no theme provided', async () => {
    const projectDir = await scaffoldProject()

    const pkgPath = path.join(projectDir, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

    expect(pkg.dependencies).toHaveProperty('astro')
    expect(pkg.dependencies).toHaveProperty('@astrojs/starlight')
    expect(pkg.dependencies).not.toHaveProperty('starlight-theme-rapide')

    fs.rmSync(projectDir, { recursive: true, force: true })
  })

  it('adds theme dependency to package.json with "latest" version', async () => {
    const projectDir = await scaffoldProject('starlight-theme-rapide')

    const pkgPath = path.join(projectDir, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

    expect(pkg.dependencies['starlight-theme-rapide']).toBe('latest')
    expect(pkg.dependencies).toHaveProperty('astro')
    expect(pkg.dependencies).toHaveProperty('@astrojs/starlight')

    fs.rmSync(projectDir, { recursive: true, force: true })
  })

  it('adds scoped theme dependency to package.json', async () => {
    const projectDir = await scaffoldProject('@catppuccin/starlight')

    const pkgPath = path.join(projectDir, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

    expect(pkg.dependencies['@catppuccin/starlight']).toBe('latest')

    fs.rmSync(projectDir, { recursive: true, force: true })
  })

  it('calls npm install after writing package.json', async () => {
    const exec = await import('@actions/exec')
    const projectDir = await scaffoldProject('starlight-theme-rapide')

    expect(exec.exec).toHaveBeenCalledWith(
      'npm',
      ['install', '--prefer-offline'],
      expect.objectContaining({ cwd: projectDir }),
    )

    fs.rmSync(projectDir, { recursive: true, force: true })
  })
})
