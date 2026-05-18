const HASH_ITERATIONS = 160000
const MAX_FIELD_LENGTH = 700

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

function normalizePhone(value) {
  let digits = clean(value).replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('9')) digits = `7${digits}`
  return digits
}

function bytesToBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64ToBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function derivePasswordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: HASH_ITERATIONS, hash: 'SHA-256' }, key, 256)
  return new Uint8Array(bits)
}

async function hashPassword(password) {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const hash = await derivePasswordHash(password, salt)
  return `pbkdf2-sha256$${HASH_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`
}

async function verifyPassword(password, stored) {
  const parts = String(stored ?? '').split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return false
  const iterations = Number(parts[1])
  if (!Number.isFinite(iterations) || iterations < 100000) return false
  const salt = base64ToBytes(parts[2])
  const expected = base64ToBytes(parts[3])
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256)
  const actual = new Uint8Array(bits)
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let index = 0; index < actual.length; index += 1) diff |= actual[index] ^ expected[index]
  return diff === 0
}

function getSupabaseConfig(env) {
  const url = clean(env.SUPABASE_URL || env.VITE_SUPABASE_URL)
  const serviceRoleKey = clean(env.SUPABASE_SERVICE_ROLE_KEY)
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || !serviceRoleKey) {
    throw new Error('Student profile API is not configured.')
  }
  return { url, serviceRoleKey }
}

async function supabaseFetch(env, path, init = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig(env)
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(data?.message || data?.error || `Supabase request failed: ${response.status}`)
  return data
}

async function updateProfile(env, body) {
  const schoolId = clean(body.schoolId)
  const name = clean(body.name)
  const phone = normalizePhone(body.phone)
  const password = String(body.password ?? '')
  if (!schoolId || name.length < 2 || !/^7\d{10}$/.test(phone) || password.length < 6) {
    return json({ error: 'Некорректные данные ученика.' }, { status: 400 })
  }

  const payload = {
    id: `stu-${crypto.randomUUID().replace(/-/g, '')}`,
    school_id: schoolId,
    name,
    phone,
    normalized_phone: phone,
    email: clean(body.email),
    password_hash: await hashPassword(password),
    avatar_url: clean(body.avatarUrl) || null,
    categories: Array.isArray(body.categoryCodes) && body.categoryCodes.length ? body.categoryCodes.map(clean).filter(Boolean) : ['B'],
    group_name: clean(body.groupName),
  }

  const rows = await supabaseFetch(env, '/rest/v1/students?on_conflict=school_id,normalized_phone&select=id,normalized_phone', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload),
  })
  const row = Array.isArray(rows) ? rows[0] : null
  if (!row?.id) throw new Error('Student profile was not saved.')
  return json({ studentId: row.id, normalizedPhone: row.normalized_phone })
}

async function login(env, body) {
  const schoolId = clean(body.schoolId)
  const phone = normalizePhone(body.phone)
  const password = String(body.password ?? '')
  if (!schoolId || !/^7\d{10}$/.test(phone) || password.length < 6) {
    return json({ error: 'Некорректные данные входа.' }, { status: 400 })
  }

  const params = new URLSearchParams({
    select: 'id,name,phone,email,avatar_url,assigned_branch_id,password_hash',
    school_id: `eq.${schoolId}`,
    normalized_phone: `eq.${phone}`,
    limit: '1',
  })
  const rows = await supabaseFetch(env, `/rest/v1/students?${params.toString()}`)
  const row = Array.isArray(rows) ? rows[0] : null
  if (!row?.password_hash || !(await verifyPassword(password, row.password_hash))) return json({ profile: null })

  return json({
    profile: {
      studentId: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email || '',
      avatarUrl: row.avatar_url || '',
      assignedBranchId: row.assigned_branch_id || '',
    },
  })
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return json({ ok: true }, { headers: { allow: 'POST, OPTIONS' } })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405, headers: { allow: 'POST, OPTIONS' } })

  try {
    const body = await request.json()
    if (body?.action === 'update') return await updateProfile(env, body)
    if (body?.action === 'login') return await login(env, body)
    return json({ error: 'Unknown action.' }, { status: 400 })
  } catch (error) {
    console.error('Student profile API failed', error instanceof Error ? error.message : error)
    return json({ error: 'Не удалось обработать кабинет ученика.', reason: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
