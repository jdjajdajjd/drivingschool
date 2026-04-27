import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const sqlPath = path.join(rootDir, 'supabase', 'DRIVEDESK_FULL_SETUP.sql')
const envPath = path.join(rootDir, '.env.local')

function loadLocalEnv() {
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadLocalEnv()

const connectionString = process.env.SUPABASE_DATABASE_URL

if (!connectionString) {
  console.error('Missing SUPABASE_DATABASE_URL.')
  console.error('Example: $env:SUPABASE_DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres?sslmode=require"; npm run supabase:apply')
  process.exit(1)
}

const sourceSql = fs.readFileSync(sqlPath, 'utf8')
const applyMode = process.env.DRIVEDESK_APPLY_MODE ?? 'safe'

function extractSafePatch(sql) {
  const startMarker = '-- BEGIN DRIVEDESK_SAFE_PATCH'
  const endMarker = '-- END DRIVEDESK_SAFE_PATCH'
  const start = sql.indexOf(startMarker)
  const end = sql.indexOf(endMarker)

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Safe patch markers were not found in ${path.relative(rootDir, sqlPath)}.`)
  }

  return sql.slice(start + startMarker.length, end).trim()
}

const sql = applyMode === 'full' ? sourceSql : extractSafePatch(sourceSql)
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  await client.query(sql)
  console.log(`Applied ${applyMode} SQL from ${path.relative(rootDir, sqlPath)} successfully.`)
} finally {
  await client.end()
}
