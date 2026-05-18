import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'

const isWindows = process.platform === 'win32'
const npmCommand = isWindows ? 'npm.cmd' : 'npm'
const preferredPort = Number(process.env.QA_PORT || '4173')

async function findFreePort(startPort) {
  let port = startPort

  while (port < startPort + 20) {
    const isFree = await new Promise((resolve) => {
      const server = createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => {
        server.close(() => resolve(true))
      })
      server.listen(port, '127.0.0.1')
    })

    if (isFree) return port
    port += 1
  }

  throw new Error(`Could not find a free preview port near ${startPort}.`)
}

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
  const port = String(await findFreePort(preferredPort))
  const baseUrl = `http://127.0.0.1:${port}`
  const qaEnv = {
    ...process.env,
    VITE_SUPABASE_URL: process.env.QA_VITE_SUPABASE_URL ?? 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: process.env.QA_VITE_SUPABASE_ANON_KEY ?? 'public-anon-key-is-not-configured',
  }

  console.log('[qa:local] building production bundle...')
  await run(npmCommand, ['run', 'build'], { env: qaEnv })

  console.log(`[qa:local] starting preview at ${baseUrl}...`)
  const previewCommand = commandForPlatform(npmCommand, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', port])
  preview = spawn(previewCommand.command, previewCommand.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    detached: !isWindows,
  })

  preview.stdout.on('data', (chunk) => process.stdout.write(chunk))
  preview.stderr.on('data', (chunk) => process.stderr.write(chunk))

  await waitForServer(baseUrl)
  console.log('[qa:local] running product QA...')
  await run(npmCommand, ['run', 'qa:product'], {
    env: {
      ...qaEnv,
      QA_BASE_URL: baseUrl,
    },
  })
  console.log('[qa:local] done')
} finally {
  if (preview && !preview.killed) {
    if (isWindows) {
      spawnSync('taskkill', ['/PID', String(preview.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      try {
        process.kill(-preview.pid, 'SIGTERM')
      } catch {
        preview.kill()
      }
    }
  }
}
