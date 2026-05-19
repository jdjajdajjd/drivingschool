const MAX_FIELD_LENGTH = 700
const ASSET_SCAN_TIMEOUT_MS = 4500
const RATE_STORE_KEY = '__vroomLeadRateLimit'

const rateStore = globalThis[RATE_STORE_KEY] ?? new Map()
globalThis[RATE_STORE_KEY] = rateStore

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...init.headers,
    },
  })
}

function clean(value) {
  return String(value ?? '').trim().slice(0, MAX_FIELD_LENGTH)
}

function getClientIp(request) {
  return clean(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown')
}

function rateLimit(request, bucket, limit, windowMs) {
  const now = Date.now()
  const key = `${bucket}:${getClientIp(request)}`
  const current = rateStore.get(key) ?? { count: 0, resetAt: now + windowMs }
  if (current.resetAt <= now) {
    current.count = 0
    current.resetAt = now + windowMs
  }
  current.count += 1
  rateStore.set(key, current)

  for (const [entryKey, entry] of rateStore.entries()) {
    if (entry.resetAt <= now) rateStore.delete(entryKey)
  }

  if (current.count <= limit) return null
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  return json(
    { error: 'Слишком много заявок. Попробуйте позже.' },
    { status: 429, headers: { 'retry-after': String(retryAfter) } },
  )
}

function isAllowedOrigin(request) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  const requestOrigin = new URL(request.url).origin
  return origin === requestOrigin || origin === 'https://vroom.today'
}

function isValidLeadPhone(value) {
  const digits = clean(value).replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Moscow',
    }).format(value)
  } catch {
    return value.toISOString()
  }
}

function buildTelegramMessage(payload, meta = {}) {
  const createdAt = meta.createdAt instanceof Date ? meta.createdAt : new Date()
  const lines = [
    '<b>Новая заявка с vroom.today</b>',
    '',
    `<b>Клиент:</b> ${escapeHtml(payload.name)}`,
    `<b>Телефон:</b> <code>${escapeHtml(payload.phone)}</code>`,
    `<b>Автошкола:</b> ${escapeHtml(payload.schoolName)}`,
  ]

  if (payload.city) lines.push(`<b>Город:</b> ${escapeHtml(payload.city)}`)
  if (payload.comment) {
    lines.push('', '<b>Комментарий</b>', escapeHtml(payload.comment))
  }

  lines.push('', `<b>Время:</b> ${escapeHtml(formatDateTime(createdAt))}`)
  if (meta.pageUrl) lines.push(`<b>Страница:</b> ${escapeHtml(meta.pageUrl)}`)

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
  if (isSupabaseUrl(envUrl) && (isJwt(envAnonKey) || isJwt(serviceRoleKey))) {
    return {
      url: envUrl,
      anonKey: isJwt(envAnonKey) ? envAnonKey : null,
      serviceRoleKey: isJwt(serviceRoleKey) ? serviceRoleKey : null,
    }
  }

  const discovered = await discoverSupabaseConfigFromAssets(request)
  return discovered ? { ...discovered, serviceRoleKey: isJwt(serviceRoleKey) ? serviceRoleKey : null } : null
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

  const leadRequestsKey = config.anonKey || config.serviceRoleKey
  if (leadRequestsKey) {
    const response = await fetch(`${config.url}/rest/v1/lead_requests`, {
      method: 'POST',
      headers: {
        apikey: leadRequestsKey,
        authorization: `Bearer ${leadRequestsKey}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify(leadRecord),
    })

    if (response.ok) return true
  }

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
      text: buildTelegramMessage(payload, { createdAt: new Date(), pageUrl: payload.pageUrl }),
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

  if (!isAllowedOrigin(request)) {
    return json({ error: 'Forbidden origin.' }, { status: 403 })
  }

  const burstLimit = rateLimit(request, 'lead-burst', 4, 60_000)
  if (burstLimit) return burstLimit
  const hourlyLimit = rateLimit(request, 'lead-hour', 20, 60 * 60_000)
  if (hourlyLimit) return hourlyLimit

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
    pageUrl: clean(request.headers.get('referer') || new URL(request.url).origin),
  }

  if (!payload.name || !payload.phone || !payload.schoolName) {
    return json({ error: 'Заполните имя, телефон и название автошколы.' }, { status: 400 })
  }

  if (!isValidLeadPhone(payload.phone)) {
    return json({ error: 'Укажите корректный телефон.' }, { status: 400 })
  }

  let saved = false
  let notified = false
  try {
    saved = await saveLeadToSupabase(request, env, payload)
    notified = await sendLeadToTelegram(env, payload)
  } catch (error) {
    console.error('Lead delivery failed', error instanceof Error ? error.message : error)
  }

  if (!saved && !notified) {
    console.error('Lead accepted without configured delivery', payload)
    return json({ ok: true, queued: false })
  }

  return json({ ok: true, saved, notified })
}
