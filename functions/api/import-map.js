const RATE_STORE_KEY = '__vroomImportAiRateLimit'
const rateStore = globalThis[RATE_STORE_KEY] ?? new Map()
globalThis[RATE_STORE_KEY] = rateStore

const ALLOWED_FIELDS = [
  'name', 'phone', 'email', 'category', 'groupName', 'instructorName', 'branchName', 'trainingStage', 'debt', 'notes', 'ignore',
]

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

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max)
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
  return json({ error: 'Слишком много импортов. Попробуйте позже.' }, { status: 429 })
}

function isAllowedOrigin(request) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  const requestOrigin = new URL(request.url).origin
  return origin === requestOrigin || origin === 'https://vroom.today'
}

function isSupabaseUrl(value) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(value ?? ''))
}

async function verifyStaffSession(env, role, token) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!isSupabaseUrl(supabaseUrl) || !serviceRoleKey) return false
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/public_verify_staff_session`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_role: role, p_session_token: token }),
  })
  if (!response.ok) return false
  const rows = await response.json().catch(() => null)
  return Array.isArray(rows) && rows.length > 0
}

function extractJson(text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return null
  try { return JSON.parse(trimmed) } catch {}
  const match = trimmed.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

function sanitizeMapping(value, headers) {
  const raw = value && typeof value === 'object' && value.mapping && typeof value.mapping === 'object' ? value.mapping : value
  const mapping = {}
  for (const header of headers) {
    const mapped = clean(raw?.[header], 80)
    mapping[header] = ALLOWED_FIELDS.includes(mapped) ? mapped : 'ignore'
  }
  return mapping
}

async function askDeepSeek(env, payload) {
  const apiKey = env.DEEPSEEK_API_KEY
  if (!apiKey) return null
  const model = env.DEEPSEEK_MODEL || 'deepseek-v4-pro'
  const baseUrl = env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Ты помогаешь импортировать таблицу автошколы в vroom.today. Верни только JSON {"mapping":{...}}. Для каждого исходного заголовка выбери одно поле из: ${ALLOWED_FIELDS.join(', ')}. name=ФИО ученика, phone=телефон, email=почта, category=категория прав, groupName=группа, instructorName=инструктор, branchName=филиал, trainingStage=этап обучения, debt=долг/остаток к оплате, notes=комментарий. Не выдумывай данные. Если колонка не нужна — ignore.`,
        },
        {
          role: 'user',
          content: JSON.stringify(payload),
        },
      ],
    }),
  })
  if (!response.ok) throw new Error(`DeepSeek returned ${response.status}`)
  const data = await response.json()
  return extractJson(data?.choices?.[0]?.message?.content)
}

export async function onRequestPost({ request, env }) {
  if (!isAllowedOrigin(request)) return json({ error: 'Forbidden origin.' }, { status: 403 })
  const limited = rateLimit(request, 'import-ai', 12, 60 * 60_000)
  if (limited) return limited

  const token = clean(request.headers.get('x-vroom-staff-token'), 240)
  const role = clean(request.headers.get('x-vroom-staff-role'), 40) || 'admin'
  if (isSupabaseUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL)) {
    const ok = token ? await verifyStaffSession(env, role === 'branch_admin' ? 'branch_admin' : 'admin', token) : false
    if (!ok) return json({ error: 'Сессия администратора не подтверждена.' }, { status: 401 })
  }

  if (!env.DEEPSEEK_API_KEY) {
    return json({ error: 'DEEPSEEK_API_KEY не настроен.' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const headers = Array.isArray(body?.headers) ? body.headers.map((item) => clean(item, 120)).filter(Boolean).slice(0, 80) : []
    const sampleRows = Array.isArray(body?.sampleRows)
      ? body.sampleRows.slice(0, 25).map((row) => Array.isArray(row) ? row.slice(0, 80).map((cell) => clean(cell, 160)) : [])
      : []
    if (!headers.length) return json({ error: 'В таблице не найдены заголовки.' }, { status: 400 })

    const result = await askDeepSeek(env, { headers, sampleRows })
    return json({ mapping: sanitizeMapping(result, headers), provider: 'deepseek' })
  } catch (error) {
    console.error('Import AI failed', error instanceof Error ? error.message : error)
    return json({ error: 'Не удалось разобрать таблицу через нейронку.' }, { status: 500 })
  }
}
