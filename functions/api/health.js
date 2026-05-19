function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...init.headers,
    },
  })
}

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isSupabaseUrl(value) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(value ?? ''))
}

function isJwt(value) {
  return /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(String(value ?? ''))
}

async function supabaseRest(env, path, init = {}) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })
  if (!response.ok) throw new Error(`${path} returned ${response.status}`)
  return response
}

async function checkSupabaseTables(env) {
  const requiredTables = ['schools', 'students', 'slots', 'bookings', 'staff_access_sessions']
  await Promise.all(requiredTables.map((table) => supabaseRest(env, `/rest/v1/${table}?select=*&limit=1`)))
  return true
}

async function checkSupabaseRpc(env) {
  const requiredFunctions = ['public_open_staff_session', 'public_verify_staff_session', 'public_create_booking']
  await Promise.all(requiredFunctions.map(async (name) => {
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    if (response.status === 400) return true
    if (!response.ok) throw new Error(`${name} returned ${response.status}`)
    return true
  }))
  return true
}

export async function onRequestGet({ env }) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const checks = {
    supabaseUrl: isSupabaseUrl(supabaseUrl),
    supabaseServiceRole: isJwt(env.SUPABASE_SERVICE_ROLE_KEY),
    telegramLeadDelivery: hasValue(env.TELEGRAM_BOT_TOKEN) && hasValue(env.TELEGRAM_LEADS_CHAT_ID),
    supabaseTables: false,
    supabaseRpc: false,
  }

  if (checks.supabaseUrl && checks.supabaseServiceRole) {
    try {
      checks.supabaseTables = await checkSupabaseTables(env)
    } catch {
      checks.supabaseTables = false
    }
    try {
      checks.supabaseRpc = await checkSupabaseRpc(env)
    } catch {
      checks.supabaseRpc = false
    }
  }

  const ok = checks.supabaseUrl && checks.supabaseServiceRole && checks.supabaseTables && checks.supabaseRpc
  return json({
    ok,
    service: 'vroom',
    version: 'launch',
    checks,
    timestamp: new Date().toISOString(),
  }, { status: ok ? 200 : 503 })
}
