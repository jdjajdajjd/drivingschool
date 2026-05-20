import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const sqlPath = path.join(rootDir, 'supabase', 'DRIVEDESK_FULL_SETUP.sql')
const envPaths = [path.join(rootDir, '.env.supabase'), path.join(rootDir, '.env.local')]
const safeMigrationPaths = [
  path.join(rootDir, 'supabase', 'migrations', '003_school_admin_credentials.sql'),
  path.join(rootDir, 'supabase', 'migrations', '004_school_staff_roles.sql'),
  path.join(rootDir, 'supabase', 'migrations', '005_superadmin_delete_school.sql'),
  path.join(rootDir, 'supabase', 'migrations', '006_lead_inbox.sql'),
  path.join(rootDir, 'supabase', 'migrations', '007_booking_limits_and_locking.sql'),
  path.join(rootDir, 'supabase', 'migrations', '008_school_admin_secret_compat.sql'),
  path.join(rootDir, 'supabase', 'migrations', '009_staff_auth_lockout.sql'),
  path.join(rootDir, 'supabase', 'migrations', '010_staff_role_credentials.sql'),
  path.join(rootDir, 'supabase', 'migrations', '011_staff_session_verify_roles.sql'),
]

function loadLocalEnv() {
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue

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
}

loadLocalEnv()

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!connectionString) {
  console.error('Missing SUPABASE_DATABASE_URL, SUPABASE_DB_URL, DATABASE_URL or POSTGRES_URL.')
  console.error('Example: SUPABASE_DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" npm run supabase:apply')
  process.exit(1)
}

const sourceSql = fs.readFileSync(sqlPath, 'utf8')
const applyMode = process.env.DRIVEDESK_APPLY_MODE ?? 'safe'
const destructiveFullSetupAllowed = process.env.DRIVEDESK_ALLOW_DESTRUCTIVE_FULL_SETUP === 'true'

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

if (applyMode === 'full' && !destructiveFullSetupAllowed) {
  throw new Error(
    'DRIVEDESK_APPLY_MODE=full is destructive and disabled by default. Use the safe mode, or set DRIVEDESK_ALLOW_DESTRUCTIVE_FULL_SETUP=true only for a disposable database.',
  )
}

const sql = applyMode === 'full'
  ? sourceSql
  : [
      extractSafePatch(sourceSql),
      ...safeMigrationPaths.filter((filePath) => fs.existsSync(filePath)).map((filePath) => fs.readFileSync(filePath, 'utf8')),
    ].join('\n\n')
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
