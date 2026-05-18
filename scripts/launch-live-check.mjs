import dotenv from 'dotenv'

const baseUrl = process.env.LAUNCH_BASE_URL || 'https://vroom.today'
const supabaseEnvFile = process.env.SUPABASE_ENV_FILE || '.env.supabase'

dotenv.config({ path: supabaseEnvFile })

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const failures = []
const notes = []
const cleanupTasks = []

function fail(message) {
  failures.push(message)
}

function note(message) {
  notes.push(message)
}

function expect(condition, message) {
  if (!condition) fail(message)
}

function fullUrl(path) {
  return new URL(path, baseUrl).toString()
}

function clean(value) {
  return String(value ?? '').trim()
}

function normalizePhone(value) {
  let digits = clean(value).replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('9')) digits = `7${digits}`
  return digits
}

function hasSupabaseService() {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(supabaseUrl ?? '')) && /^eyJ/.test(String(serviceRoleKey ?? ''))
}

async function readResponse(response) {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

async function appFetch(path, init = {}) {
  const response = await fetch(fullUrl(path), init)
  const body = await readResponse(response)
  return { response, body }
}

async function supabaseFetch(path, init = {}) {
  if (!hasSupabaseService()) throw new Error(`Supabase service role env is not configured in ${supabaseEnvFile}.`)

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })
  const body = await readResponse(response)
  if (!response.ok) throw new Error(`Supabase ${path} failed: ${response.status} ${JSON.stringify(body)}`)
  return body
}

function buildQuery(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) search.set(key, value)
  return search.toString()
}

async function trySupabaseFetch(path, init = {}) {
  try {
    return await supabaseFetch(path, init)
  } catch (error) {
    note(error instanceof Error ? error.message : String(error))
    return null
  }
}

async function checkStaticAssets() {
  const assets = [
    { path: '/favicon.svg', contentType: 'image/svg+xml', contains: '<svg' },
    { path: '/robots.txt', contentType: 'text/plain', contains: 'Sitemap: https://vroom.today/sitemap.xml' },
    { path: '/sitemap.xml', contentType: 'xml', contains: 'https://vroom.today/' },
    { path: '/site.webmanifest', contentType: 'application/manifest+json', contains: 'vroom' },
  ]

  for (const asset of assets) {
    const { response, body } = await appFetch(asset.path)
    const contentType = response.headers.get('content-type') ?? ''
    const text = typeof body === 'string' ? body : JSON.stringify(body)

    expect(response.ok, `${asset.path}: HTTP ${response.status}`)
    expect(contentType.includes(asset.contentType), `${asset.path}: expected content-type containing ${asset.contentType}, got ${contentType}`)
    expect(text.includes(asset.contains), `${asset.path}: missing ${asset.contains}`)
    expect(!text.toLowerCase().includes('<!doctype html>'), `${asset.path}: served SPA HTML instead of asset`)
    expect(!text.includes('<div id="root">'), `${asset.path}: served app root instead of asset`)
  }
}

async function checkSecurityHeaders() {
  const { response } = await appFetch('/')
  const csp = response.headers.get('content-security-policy') ?? ''
  expect(response.ok, `/: HTTP ${response.status}`)
  expect(response.headers.get('x-content-type-options') === 'nosniff', '/: missing x-content-type-options: nosniff')
  expect(csp.includes("frame-ancestors 'none'"), "/: CSP does not contain frame-ancestors 'none'")
  expect(csp.includes("base-uri 'self'"), "/: CSP does not contain base-uri 'self'")
}

async function checkHealth() {
  const { response, body } = await appFetch('/api/health')
  expect(response.status === 200, `/api/health: expected 200, got ${response.status}`)
  expect(body?.ok === true, '/api/health: ok is not true')
  expect(body?.checks?.supabaseUrl === true, '/api/health: Supabase URL is not ready')
  expect(body?.checks?.supabaseServiceRole === true, '/api/health: Supabase service role is not ready')
  if (body?.checks?.telegramLeadDelivery !== true) note('/api/health: Telegram lead delivery is not configured; Supabase fallback must stay healthy.')
}

async function findLeadRecord({ phone, schoolName }) {
  const leadRequestQuery = buildQuery({
    select: '*',
    phone: `eq.${phone}`,
    school_name: `eq.${schoolName}`,
    order: 'created_at.desc',
    limit: '1',
  })
  const leadRequests = await trySupabaseFetch(`/rest/v1/lead_requests?${leadRequestQuery}`)
  if (Array.isArray(leadRequests) && leadRequests[0]) {
    return { table: 'lead_requests', row: leadRequests[0] }
  }

  const adminRecordQuery = buildQuery({
    select: '*',
    'payload->>type': 'eq.landing_lead',
    'payload->>phone': `eq.${phone}`,
    'payload->>school_name': `eq.${schoolName}`,
    order: 'updated_at.desc',
    limit: '1',
  })
  const adminRecords = await supabaseFetch(`/rest/v1/admin_records?${adminRecordQuery}`)
  if (Array.isArray(adminRecords) && adminRecords[0]) {
    return { table: 'admin_records', row: adminRecords[0] }
  }

  return null
}

async function cleanupLead(record, { phone, schoolName }) {
  if (!record) return
  if (record.table === 'lead_requests') {
    if (record.row.id) {
      await supabaseFetch(`/rest/v1/lead_requests?id=eq.${encodeURIComponent(record.row.id)}`, { method: 'DELETE' })
      return
    }
    const query = buildQuery({ phone: `eq.${phone}`, school_name: `eq.${schoolName}` })
    await supabaseFetch(`/rest/v1/lead_requests?${query}`, { method: 'DELETE' })
    return
  }

  if (record.row.id) await supabaseFetch(`/rest/v1/admin_records?id=eq.${encodeURIComponent(record.row.id)}`, { method: 'DELETE' })
}

async function checkLeadDelivery() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const payload = {
    name: 'Launch Check',
    phone: `+7 999 ${suffix.slice(-3)}-${suffix.slice(-2)}-${suffix.slice(-2)}`,
    schoolName: `Launch Check ${suffix}`,
    city: 'Launch City',
    comment: 'Disposable production launch verification lead.',
  }

  const { response, body } = await appFetch('/api/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  expect(response.ok, `/api/lead: HTTP ${response.status} ${JSON.stringify(body)}`)
  expect(body?.ok === true, '/api/lead: ok is not true')

  const record = await findLeadRecord({ phone: payload.phone, schoolName: payload.schoolName })
  expect(Boolean(record), '/api/lead: lead was accepted but not found in Supabase lead storage')
  if (record) cleanupTasks.push(() => cleanupLead(record, { phone: payload.phone, schoolName: payload.schoolName }))
}

async function cleanupStudent({ schoolId, normalizedPhone }) {
  const query = buildQuery({ school_id: `eq.${schoolId}`, normalized_phone: `eq.${normalizedPhone}` })
  await supabaseFetch(`/rest/v1/students?${query}`, { method: 'DELETE' })
}

async function checkStudentProfile() {
  const suffix = String(Date.now()).slice(-8)
  const schoolId = 'school-virazh'
  const phone = `+7 910 ${suffix.slice(0, 3)}-${suffix.slice(3, 5)}-${suffix.slice(5, 7)}`
  const normalizedPhone = normalizePhone(phone)
  const password = `Launch${suffix}!`
  const name = `Launch Student ${suffix}`

  const updatePayload = {
    action: 'update',
    schoolId,
    name,
    phone,
    password,
    email: `launch-${suffix}@example.test`,
    categoryCodes: ['B'],
    groupName: 'launch-check',
  }

  const update = await appFetch('/api/student-profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(updatePayload),
  })
  expect(update.response.ok, `/api/student-profile update: HTTP ${update.response.status} ${JSON.stringify(update.body)}`)
  expect(update.body?.studentId, '/api/student-profile update: missing studentId')
  expect(update.body?.normalizedPhone === normalizedPhone, '/api/student-profile update: normalized phone mismatch')
  cleanupTasks.push(() => cleanupStudent({ schoolId, normalizedPhone }))

  const login = await appFetch('/api/student-profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'login', schoolId, phone, password }),
  })
  expect(login.response.ok, `/api/student-profile login: HTTP ${login.response.status} ${JSON.stringify(login.body)}`)
  expect(login.body?.profile?.studentId === update.body?.studentId, '/api/student-profile login: profile does not match created student')
  expect(login.body?.profile?.name === name, '/api/student-profile login: profile name mismatch')
}

async function runCleanup() {
  for (const task of cleanupTasks.reverse()) {
    try {
      await task()
    } catch (error) {
      note(`cleanup failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

try {
  await checkStaticAssets()
  await checkSecurityHeaders()
  await checkHealth()
  await checkLeadDelivery()
  await checkStudentProfile()
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
} finally {
  await runCleanup()
}

for (const message of notes) console.warn(`NOTE: ${message}`)

if (failures.length > 0) {
  console.error('\nLaunch check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log(`Launch check passed for ${baseUrl}`)
