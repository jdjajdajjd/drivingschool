import { chromium } from 'playwright'

const baseUrl = process.env.SMOKE_BASE_URL || 'https://vroom.today'
const expectedTimeoutMs = 15_000

const forbiddenTexts = [
  'DriveDesk',
  'drivingschool-6wy',
  'localStorage',
  'админка',
  'слоты',
  'VROOM',
]

const mojibakePatterns = [
  'Рђ',
  'Р—',
  'Рџ',
  'Рљ',
  'РЎ',
  'Рµ',
]

const routes = [
  {
    path: '/',
    checks: ['vroom', 'Я ученик', 'Я школа'],
    rejects: [],
  },
  {
    path: '/school/virazh',
    checks: ['Автошкола «Вираж»', 'Открыть личный кабинет', 'Создать доступ'],
    rejects: ['Автошкола не найдена', 'Выберите инструктора', 'Выберите дату'],
  },
  {
    path: '/school/virazh/book',
    checks: ['Телефон', 'Пароль'],
    rejects: ['Выберите инструктора', 'Выберите дату'],
  },
  {
    path: '/login',
    checks: ['Телефон', 'Пароль'],
    rejects: [],
  },
  {
    path: '/staff-entrance-73q',
    checks: ['Кабинет школы', 'Логин', 'Пароль'],
    rejects: ['Админка', 'VROOM'],
  },
  {
    path: '/terms',
    checks: ['vroom'],
    rejects: [],
  },
  {
    path: '/privacy',
    checks: ['vroom'],
    rejects: [],
  },
]

const failures = []
let browser

try {
  browser = await chromium.launch({ headless: true })

  for (const route of routes) {
    const url = new URL(route.path, baseUrl).toString()
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()

    page.on('console', (message) => {
      if (message.type() === 'error') {
        failures.push(`${route.path} (${url}): console error: ${message.text()}`)
      }
    })

    page.on('pageerror', (error) => {
      failures.push(`${route.path} (${url}): page error: ${error.message}`)
    })

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' })
      const status = response?.status() ?? 0

      if (status < 200 || status >= 400) {
        failures.push(`${route.path} (${url}): HTTP ${status}`)
      }

      for (const expected of route.checks) {
        try {
          await page.locator('body', { hasText: expected }).waitFor({ timeout: expectedTimeoutMs })
        } catch {
          failures.push(`${route.path} (${url}): missing expected text "${expected}" after ${expectedTimeoutMs}ms`)
        }
      }

      const text = await page.locator('body').innerText()
      const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      const ddWorkspaceKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('dd:workspace:')))

      for (const rejected of [...route.rejects, ...forbiddenTexts]) {
        if (text.includes(rejected)) failures.push(`${route.path} (${url}): contains forbidden text "${rejected}"`)
      }

      for (const pattern of mojibakePatterns) {
        if (text.includes(pattern)) failures.push(`${route.path} (${url}): contains mojibake fragment "${pattern}"`)
      }

      if (hasHorizontalOverflow) failures.push(`${route.path} (${url}): horizontal overflow on mobile viewport`)
      if (ddWorkspaceKeys.length > 0) failures.push(`${route.path} (${url}): workspace business localStorage keys present ${ddWorkspaceKeys.join(', ')}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${route.path} (${url}): route smoke failed: ${message}`)
    } finally {
      await context.close()
    }
  }
} finally {
  if (browser) await browser.close()
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Smoke passed for ${baseUrl}`)
