import { spawn, spawnSync } from 'node:child_process'

const isWindows = process.platform === 'win32'
const npmCommand = isWindows ? 'npm.cmd' : 'npm'
const port = process.env.QA_PORT || '4173'
const baseUrl = `http://127.0.0.1:${port}`

function commandForPlatform(command, args) {
  if (!isWindows) return { command, args }
  return {
    command: process.env.ComSpec || 'cmd.exe',
    args: ['/d', '/s', '/c', [command, ...args].join(' ')],
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const platformCommand = commandForPlatform(command, args)
    const child = spawn(platformCommand.command, platformCommand.args, {
      stdio: 'inherit',
      shell: false,
      ...options,
    })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
    })
    child.on('error', reject)
  })
}

function waitForServer(url, timeoutMs = 30_000) {
  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(url)
        if (response.ok) {
          resolve()
          return
        }
      } catch {
        // Server is still starting.
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Preview server did not start at ${url}`))
        return
      }
      setTimeout(tick, 500)
    }
    void tick()
  })
}

let preview

try {
  console.log('[qa:local] building production bundle...')
  await run(npmCommand, ['run', 'build'])

  console.log(`[qa:local] starting preview at ${baseUrl}...`)
  const previewCommand = commandForPlatform(npmCommand, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', port])
  preview = spawn(previewCommand.command, previewCommand.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  })

  preview.stdout.on('data', (chunk) => process.stdout.write(chunk))
  preview.stderr.on('data', (chunk) => process.stderr.write(chunk))

  await waitForServer(baseUrl)
  console.log('[qa:local] running product QA...')
  await run(npmCommand, ['run', 'qa:product'], {
    env: {
      ...process.env,
      QA_BASE_URL: baseUrl,
    },
  })
  console.log('[qa:local] done')
} finally {
  if (preview && !preview.killed) {
    if (isWindows) {
      spawnSync('taskkill', ['/PID', String(preview.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      preview.kill()
    }
  }
}
