const MAX_FIELD_LENGTH = 700
const ASSET_SCAN_TIMEOUT_MS = 4500

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  })
}

function clean(value) {
  return String(value ?? '').trim().slice(0, MAX_FIELD_LENGTH)
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildTelegramMessage(payload) {
  const lines = [
    '<b>Новая заявка vroom.today</b>',
    '',
    `<b>Имя:</b> ${escapeHtml(payload.name)}`,
    `<b>Телефон:</b> ${escapeHtml(payload.phone)}`,
    `<b>Автошкола:</b> ${escapeHtml(payload.schoolName)}`,
  ]

  if (payload.city) lines.push(`<b>Город:</b> ${escapeHtml(payload.city)}`)
  if (payload.comment) {
    lines.push('', '<b>Комментарий:</b>', escapeHtml(payload.comment))
  }

  return lines.join('\n')
}

function isSupabaseUrl(value) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(value ?? '')) && !String(value).includes('example.supabase.co')
}

function isJwt(value) {
  return /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(String(value ?? ''))
}

async function fetchText(url, signal) {
  const response = await fetch(url, { signal })
  if (!response.ok) return ''
  return response.text()
}

async function discoverSupabaseConfigFromAssets(request) {
  const origin = new URL(request.url).origin
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ASSET_SCAN_TIMEOUT_MS)

  try {
    const html = await fetchText(origin, controller.signal)
    const assetPaths = Array.from(html.matchAll(/\/assets\/[^"'\s>]+\.js/g), (match) => match[0]).slice(0, 14)
    const candidates = await Promise.all(assetPaths.map((path) => fetchText(`${origin}${path}`, controller.signal).catch(() => '')))
    const source = candidates.join('\n')
    const urls = Array.from(source.matchAll(/https:\/\/[a-z0-9-]+\.supabase\.co/gi), (match) => match[0]).filter(isSupabaseUrl)
    const keys = Array.from(source.matchAll(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g), (match) => match[0]).filter(isJwt)
    const url = urls.at(-1)
    const anonKey = keys.at(-1)
    return url && anonKey ? { url, anonKey, serviceRoleKey: null } : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function resolveSupabaseConfig(request, env) {
  const envUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const envAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (isSupabaseUrl(envUrl) && isJwt(envAnonKey)) return { url: envUrl, anonKey: envAnonKey, serviceRoleKey }
  return discoverSupabaseConfigFromAssets(request)
}

async function saveLeadToSupabase(request, env, payload) {
  const config = await resolveSupabaseConfig(request, env)
  if (!config) return false

  const leadRecord = {
    name: payload.name,
    phone: payload.phone,
    school_name: payload.schoolName,
    city: payload.city,
    comment: payload.comment,
    source: 'landing',
    page_url: request.headers.get('referer') || new URL(request.url).origin,
    user_agent: clean(request.headers.get('user-agent')),
  }

  const response = await fetch(`${config.url}/rest/v1/lead_requests`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      authorization: `Bearer ${config.anonKey}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify(leadRecord),
  })

  if (response.ok) return true
  if (!config.serviceRoleKey) return false

  const fallbackResponse = await fetch(`${config.url}/rest/v1/admin_records`, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify({
      id: `lead-${crypto.randomUUID()}`,
      school_id: env.LEAD_INBOX_SCHOOL_ID || 'school-virazh',
      kind: 'audit_log',
      payload: { type: 'landing_lead', ...leadRecord },
    }),
  })

  return fallbackResponse.ok
}

async function sendLeadToTelegram(env, payload) {
  const token = env.TELEGRAM_BOT_TOKEN
  const chatId = env.TELEGRAM_LEADS_CHAT_ID
  if (!token || !chatId) return false

  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: buildTelegramMessage(payload),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })

  return telegramResponse.ok
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return json({ ok: true }, { headers: { allow: 'POST, OPTIONS' } })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405, headers: { allow: 'POST, OPTIONS' } })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Некорректная заявка.' }, { status: 400 })
  }

  const payload = {
    name: clean(body.name),
    phone: clean(body.phone),
    schoolName: clean(body.schoolName),
    city: clean(body.city),
    comment: clean(body.comment),
  }

  if (!payload.name || !payload.phone || !payload.schoolName) {
    return json({ error: 'Заполните имя, телефон и название автошколы.' }, { status: 400 })
  }

  let delivered = false
  try {
    delivered = await sendLeadToTelegram(env, payload) || await saveLeadToSupabase(request, env, payload)
  } catch (error) {
    console.error('Lead delivery failed', error instanceof Error ? error.message : error)
  }

  if (!delivered) {
    console.error('Lead accepted without configured delivery', payload)
    return json({ ok: true, queued: false })
  }

  return json({ ok: true })
}
