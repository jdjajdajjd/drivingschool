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

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return json({ ok: true }, { headers: { allow: 'POST, OPTIONS' } })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405, headers: { allow: 'POST, OPTIONS' } })
  }

  const token = env.TELEGRAM_BOT_TOKEN
  const chatId = env.TELEGRAM_LEADS_CHAT_ID

  if (!token || !chatId) {
    return json({ error: 'Прием заявок пока не настроен.' }, { status: 503 })
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

  if (!telegramResponse.ok) {
    return json({ error: 'Не удалось отправить заявку. Попробуйте позже.' }, { status: 502 })
  }

  return json({ ok: true })
}
