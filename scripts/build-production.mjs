import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import dotenv from 'dotenv'

if (existsSync('.env.production.local')) {
  dotenv.config({ path: '.env.production.local', override: false })
}

if (existsSync('.env.supabase')) {
  dotenv.config({ path: '.env.supabase', override: false })
}

const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((key) => !process.env[key]?.trim())
if (missing.length > 0) {
  console.error(`Missing production build env: ${missing.join(', ')}`)
  process.exit(1)
}

const viteBin = process.platform === 'win32' ? 'node_modules/.bin/vite.cmd' : 'node_modules/.bin/vite'
const child = spawn(viteBin, ['build'], {
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('exit', (code) => process.exit(code ?? 1))
child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})
