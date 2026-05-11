import 'dotenv/config'
import { spawn } from 'node:child_process'
import { mkdir, appendFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const token = process.env.TELEGRAM_BOT_TOKEN
const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID
const model = process.env.OPENCODE_MODEL
const agent = process.env.OPENCODE_AGENT
const skipPermissions = process.env.OPENCODE_SKIP_PERMISSIONS === '1'
const pollMs = Number(process.env.TELEGRAM_POLL_MS || 1200)
const taskTimeoutMs = Number(process.env.TELEGRAM_TASK_TIMEOUT_MS || 10 * 60 * 1000)
const opencodePort = Number(process.env.OPENCODE_SERVER_PORT || 4096)
const opencodeUrl = `http://127.0.0.1:${opencodePort}`
const workdir = process.cwd()
const logDir = path.join(workdir, 'tasks', 'telegram')
const opencodeCli = process.env.OPENCODE_CLI || path.join(
  process.env.APPDATA || '',
  'npm',
  'node_modules',
  'opencode-ai',
  'bin',
  'opencode',
)
let opencodeServer

function humanStatus(status) {
  return {
    idle: 'свободен, жду задачу',
    in_progress: 'в работе',
    done: 'готово',
    failed: 'ошибка',
  }[status] || status
}

if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN in environment or .env')
  process.exit(1)
}

let offset = 0
let running = false
const queue = []

await mkdir(logDir, { recursive: true })

async function ensureOpenCodeServer() {
  try {
    await fetch(opencodeUrl)
    return
  } catch {
    // Start a local server for Windows; direct opencode run can fail without it.
  }

  opencodeServer = spawn(process.execPath, [opencodeCli, 'serve', '--port', String(opencodePort), '--hostname', '127.0.0.1'], {
    cwd: workdir,
    env: process.env,
    stdio: 'ignore',
    detached: false,
  })

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    try {
      await fetch(opencodeUrl)
      return
    } catch {
      // keep waiting
    }
  }

  throw new Error(`OpenCode server did not start at ${opencodeUrl}`)
}

async function telegram(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} failed: ${res.status} ${text}`)
  }

  return res.json()
}

async function send(chatId, text) {
  const chunks = String(text).match(/[\s\S]{1,3800}/g) || ['']
  for (const chunk of chunks) {
    await telegram('sendMessage', {
      chat_id: chatId,
      text: chunk,
      disable_web_page_preview: true,
    })
  }
}

function isAllowed(chatId) {
  return !allowedChatId || String(chatId) === String(allowedChatId)
}

function buildPrompt(text) {
  return [
    'Ты получаешь задачу из Telegram от владельца проекта.',
    'Работай в текущем репозитории как OpenCode agent: изучи контекст, внеси изменения если нужно, проверь результат, кратко напиши что сделал и какие команды проверки запускал.',
    'Не коммить изменения, если пользователь явно не попросил.',
    'Задача пользователя:',
    text,
  ].join('\n')
}

async function runOpenCode(task) {
  running = true
  const id = new Date().toISOString().replace(/[:.]/g, '-')
  const logFile = path.join(logDir, `${id}.log`)
  const prompt = buildPrompt(task.text)
  const args = ['run', '--attach', opencodeUrl, '--dir', workdir]

  if (model) args.push('--model', model)
  if (agent) args.push('--agent', agent)
  if (skipPermissions) args.push('--dangerously-skip-permissions')
  args.push(prompt)

  await writeFile(logFile, `Task: ${task.text}\nStarted: ${new Date().toISOString()}\n\n`, 'utf8')
  await send(task.chatId, `Взял в работу.\nСтатус: ${humanStatus('in_progress')}\nЛог: ${path.relative(workdir, logFile)}`)

  const child = spawn(process.execPath, [opencodeCli, ...args], {
    cwd: workdir,
    env: process.env,
  })

  let output = ''
  let lastUpdate = Date.now()
  const timeout = setTimeout(async () => {
    await appendFile(logFile, `\n\nStopped: task exceeded ${Math.round(taskTimeoutMs / 1000)} seconds\n`, 'utf8')
    child.kill('SIGTERM')
  }, taskTimeoutMs)

  child.stdout.on('data', async (data) => {
    const text = data.toString()
    output += text
    await appendFile(logFile, text, 'utf8')

    if (Date.now() - lastUpdate > 45000) {
      lastUpdate = Date.now()
      await send(task.chatId, `Статус: ${humanStatus('in_progress')}\nЕще выполняю задачу.`)
    }
  })

  child.stderr.on('data', async (data) => {
    const text = data.toString()
    output += text
    await appendFile(logFile, text, 'utf8')
  })

  child.on('close', async (code) => {
    clearTimeout(timeout)
    await appendFile(logFile, `\n\nFinished: ${new Date().toISOString()}\nExit code: ${code}\n`, 'utf8')
    const tail = output.trim().slice(-3200) || '(без вывода)'
    const status = code === 0 ? 'done' : 'failed'
    await send(task.chatId, `Статус: ${humanStatus(status)}\nКод завершения: ${code}\n\n${tail}`)
    running = false
    void processQueue()
  })
}

async function processQueue() {
  if (running || queue.length === 0) return
  const task = queue.shift()
  await runOpenCode(task)
}

async function handleMessage(message) {
  const chatId = message.chat.id
  const text = message.text?.trim()

  if (!isAllowed(chatId)) {
    await send(chatId, `Нет доступа. Твой chat_id: ${chatId}`)
    return
  }

  if (!text) return

  if (text === '/start') {
    await send(chatId, [
      'Бот подключен к этому ПК и проекту DRIVING-SCHOOLS.',
      `chat_id: ${chatId}`,
      'Пиши задачу обычным сообщением. Я поставлю ее в очередь, выполню на этом ПК и верну статус/результат сюда.',
      'Команды: /status',
    ].join('\n'))
    return
  }

  if (text === '/status') {
    await send(chatId, `Статус: ${humanStatus(running ? 'in_progress' : 'idle')}\nВ очереди задач: ${queue.length}`)
    return
  }

  if (text === '/ping') {
    await send(chatId, 'Я на связи. Бот запущен на этом ПК.')
    return
  }

  queue.push({ chatId, text })
  await send(chatId, `Задача принята.\nПозиция в очереди: ${queue.length}${running ? '\nСейчас выполняется предыдущая задача.' : ''}`)
  await processQueue()
}

async function poll() {
  try {
    const res = await telegram('getUpdates', {
      offset,
      timeout: 25,
      allowed_updates: ['message'],
    })

    for (const update of res.result || []) {
      offset = update.update_id + 1
      if (update.message) await handleMessage(update.message)
    }
  } catch (error) {
    console.error(error)
  } finally {
    setTimeout(poll, pollMs)
  }
}

console.log('Telegram OpenCode bot is running')
await ensureOpenCodeServer()
void poll()
