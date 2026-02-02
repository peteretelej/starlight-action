import * as core from '@actions/core'

async function run(): Promise<void> {
  try {
    core.info('Starlight Action starting...')
    // TODO: Implement in Phase 2
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
