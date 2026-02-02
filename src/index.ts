import * as fs from 'node:fs'
import * as path from 'node:path'
import * as core from '@actions/core'
import { scaffoldProject } from './scaffold.js'
import { copyDocs } from './copy-docs.js'
import { processAllFrontmatter } from './frontmatter.js'
import { rewriteReadmeLinks } from './readme-links.js'
import { generateConfig } from './config.js'
import { copyCss } from './copy-css.js'
import { buildSite, uploadArtifact } from './build.js'

function getGitHubContext(): { repoName: string; site: string } {
  const repository = process.env.GITHUB_REPOSITORY ?? ''
  const [owner, repo] = repository.split('/')
  const repoName = repo ?? 'docs'

  // Construct site URL from GitHub Pages convention
  const site = owner ? `https://${owner}.github.io` : 'https://example.github.io'

  return { repoName, site }
}

async function run(): Promise<void> {
  try {
    core.info('Starlight Action starting...')

    const workspaceDir = process.env.GITHUB_WORKSPACE ?? process.cwd()
    const { repoName, site } = getGitHubContext()

    // Read inputs
    const docsInput = core.getInput('docs') || 'docs/'
    const title = core.getInput('title') || repoName
    const description = core.getInput('description') || ''
    const logoInput = core.getInput('logo') || undefined
    const readmeInput = core.getInput('readme') === 'true'
    const baseInput = core.getInput('base') || `/${repoName}`
    const configInput = core.getInput('config') || undefined
    const customCssInput = core.getInput('custom_css') || undefined
    const themeInput = core.getInput('theme') || undefined
    const themePluginInput = core.getInput('theme_plugin') || undefined
    const themeOptionsInput = core.getInput('theme_options') || undefined

    // Resolve paths
    const docsPath = path.resolve(workspaceDir, docsInput)
    const configPath = configInput ? path.resolve(workspaceDir, configInput) : undefined

    // Validate inputs
    if (!fs.existsSync(docsPath)) {
      throw new Error(`Documentation folder not found: ${docsPath}`)
    }

    if (configPath && !fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`)
    }

    if (logoInput) {
      const logoFullPath = path.resolve(workspaceDir, logoInput)
      if (!fs.existsSync(logoFullPath)) {
        throw new Error(`Logo file not found: ${logoFullPath}`)
      }
    }

    if (themeInput && !themePluginInput) {
      throw new Error('theme requires theme_plugin')
    }
    if (themePluginInput && !themeInput) {
      throw new Error('theme_plugin requires theme')
    }
    if (themeOptionsInput) {
      try {
        JSON.parse(themeOptionsInput)
      } catch {
        throw new Error('theme_options must be valid JSON')
      }
    }

    // Step 1: Scaffold temporary Starlight project
    core.startGroup('Scaffold Starlight project')
    const projectDir = await scaffoldProject(themeInput)
    core.endGroup()

    // Step 2: Copy documentation files
    core.startGroup('Copy documentation files')
    copyDocs({
      docsPath,
      projectDir,
      readme: readmeInput,
      workspaceDir,
      logoPath: logoInput,
    })
    core.endGroup()

    // Step 3: Copy custom CSS files
    core.startGroup('Copy custom CSS')
    const { configPaths: customCssPaths } = await copyCss({
      customCssInput,
      workspaceDir,
      projectDir,
    })
    core.endGroup()

    // Step 4: Process frontmatter on all copied docs
    core.startGroup('Process frontmatter')
    const contentDocsDir = path.join(projectDir, 'src', 'content', 'docs')
    await processAllFrontmatter(contentDocsDir)
    core.endGroup()

    // Step 5: Rewrite README links if readme is enabled
    if (readmeInput) {
      core.startGroup('Rewrite README links')
      const indexPath = path.join(contentDocsDir, 'index.md')
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf-8')
        const docsFolder = docsInput.replace(/\/$/, '')
        const rewritten = await rewriteReadmeLinks(content, docsFolder, baseInput)
        fs.writeFileSync(indexPath, rewritten, 'utf-8')
      }
      core.endGroup()
    }

    // Step 6: Generate Astro/Starlight config
    core.startGroup('Generate config')
    generateConfig(projectDir, {
      title,
      description,
      base: baseInput,
      site,
      logo: logoInput,
      configPath,
      customCssPaths,
      theme: themeInput,
      themePlugin: themePluginInput,
      themeOptions: themeOptionsInput,
    })
    core.endGroup()

    // Step 7: Build the site
    core.startGroup('Build site')
    const distDir = await buildSite(projectDir)
    core.endGroup()

    // Step 8: Upload artifact
    core.startGroup('Upload artifact')
    await uploadArtifact(distDir)
    core.endGroup()

    core.info('Starlight Action completed successfully!')
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
