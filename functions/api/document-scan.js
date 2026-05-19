const RATE_STORE_KEY = '__vroomDocumentScanRateLimit'
const rateStore = globalThis[RATE_STORE_KEY] ?? new Map()
globalThis[RATE_STORE_KEY] = rateStore

const DOCUMENT_TYPES = [
  'contract', 'passport', 'medical_certificate', 'consent_data_processing', 'application', 'parent_consent',
  'snils', 'state_fee_receipt', 'photo', 'internal_certificate', 'gibdd_exam_doc',
]
const DOCUMENT_STATUSES = ['uploaded', 'verified', 'pending', 'missing', 'rejected', 'expired']

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

function clean(value, max = 1200) {
  return String(value ?? '').trim().slice(0, max)
}

function getClientIp(request) {
  return clean(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown', 120)
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
  return json({ error: 'Слишком много сканов. Попробуйте позже.' }, { status: 429 })
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

function normalizeScan(value) {
  const object = value && typeof value === 'object' ? value : {}
  const documentType = DOCUMENT_TYPES.includes(object.documentType) ? object.documentType : 'gibdd_exam_doc'
  const status = DOCUMENT_STATUSES.includes(object.status) ? object.status : 'uploaded'
  const confidence = Number(object.confidence)
  const expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(clean(object.expiresAt, 20)) ? clean(object.expiresAt, 20) : ''
  return {
    documentType,
    status,
    expiresAt,
    summary: clean(object.summary, 600),
    notes: clean(object.notes, 700),
    studentName: clean(object.studentName, 160),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
  }
}

async function askVisionModel(env, payload) {
  const apiKey = env.DEEPSEEK_API_KEY
  if (!apiKey) return null
  const model = env.DEEPSEEK_VISION_MODEL || env.DEEPSEEK_MODEL || 'deepseek-v4-pro'
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
          content: `Ты распознаешь фото документов автошколы. Верни только JSON: {"documentType":"...","status":"uploaded|verified|pending|rejected|expired","expiresAt":"YYYY-MM-DD или пусто","studentName":"если видно","summary":"что это","notes":"важные поля без паспортных номеров целиком","confidence":0..1}. Тип документа только один из: ${DOCUMENT_TYPES.join(', ')}. Не сохраняй полные паспортные номера и медданные в notes. Если не уверен — status pending и confidence ниже 0.6.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: JSON.stringify({ fileName: payload.fileName, studentName: payload.studentName }) },
            { type: 'image_url', image_url: { url: payload.imageDataUrl } },
          ],
        },
      ],
    }),
  })
  if (!response.ok) throw new Error(`Vision model returned ${response.status}`)
  const data = await response.json()
  return extractJson(data?.choices?.[0]?.message?.content)
}

export async function onRequestPost({ request, env }) {
  if (!isAllowedOrigin(request)) return json({ error: 'Forbidden origin.' }, { status: 403 })
  const limited = rateLimit(request, 'document-scan', 20, 60 * 60_000)
  if (limited) return limited

  const token = clean(request.headers.get('x-vroom-staff-token'), 240)
  const role = clean(request.headers.get('x-vroom-staff-role'), 40) || 'admin'
  if (isSupabaseUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL)) {
    const ok = token ? await verifyStaffSession(env, role === 'branch_admin' ? 'branch_admin' : 'admin', token) : false
    if (!ok) return json({ error: 'Сессия администратора не подтверждена.' }, { status: 401 })
  }

  if (!env.DEEPSEEK_API_KEY) return json({ error: 'DEEPSEEK_API_KEY не настроен.' }, { status: 503 })

  try {
    const body = await request.json()
    const imageDataUrl = clean(body?.imageDataUrl, 6_500_000)
    if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(imageDataUrl)) {
      return json({ error: 'Загрузите фото PNG, JPG или WEBP.' }, { status: 400 })
    }
    const result = await askVisionModel(env, {
      imageDataUrl,
      fileName: clean(body?.fileName, 180),
      studentName: clean(body?.studentName, 180),
    })
    return json({ scan: normalizeScan(result), provider: 'deepseek' })
  } catch (error) {
    console.error('Document scan failed', error instanceof Error ? error.message : error)
    return json({ error: 'Не удалось распознать документ. Попробуйте другое фото или заполните вручную.' }, { status: 500 })
  }
}
