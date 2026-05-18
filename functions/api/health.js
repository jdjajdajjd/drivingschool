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

export async function onRequestGet({ env }) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const checks = {
    supabaseUrl: isSupabaseUrl(supabaseUrl),
    supabaseServiceRole: isJwt(env.SUPABASE_SERVICE_ROLE_KEY),
    telegramLeadDelivery: hasValue(env.TELEGRAM_BOT_TOKEN) && hasValue(env.TELEGRAM_LEADS_CHAT_ID),
  }
  const ok = checks.supabaseUrl && checks.supabaseServiceRole
  return json({
    ok,
    service: 'vroom',
    version: 'launch',
    checks,
    timestamp: new Date().toISOString(),
  }, { status: ok ? 200 : 503 })
}
