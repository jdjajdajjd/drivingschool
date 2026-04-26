import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const sqlPath = path.join(rootDir, 'supabase', 'DRIVEDESK_FULL_SETUP.sql')

const connectionString = process.env.SUPABASE_DATABASE_URL

if (!connectionString) {
  console.error('Missing SUPABASE_DATABASE_URL.')
  console.error('Example: $env:SUPABASE_DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres?sslmode=require"; npm run supabase:apply')
  process.exit(1)
}

const sql = fs.readFileSync(sqlPath, 'utf8')
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  await client.query(sql)
  console.log(`Applied ${path.relative(rootDir, sqlPath)} successfully.`)
} finally {
  await client.end()
}
