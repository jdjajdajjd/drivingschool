import { chromium } from 'playwright'

const baseUrl = process.env.SMOKE_BASE_URL || 'https://vroom.today'
const forbidden = ['DriveDesk', 'drivingschool-6wy', 'localStorage', 'онлайн-оплата', 'предоплата']
const expectedTimeoutMs = 15_000

function isExpectedCompatibilityConsoleError(route, text) {
  return route.path.startsWith('/instructor/') && text.includes('server responded with a status of 404')
}

const routes = [
  {
    path: '/school/virazh',
    checks: ['Автошкола «Вираж»', 'Главная', 'Запись', 'О нас', 'Контакты'],
    rejects: ['Автошкола не найдена'],
  },
  {
    path: '/school/virazh/book',
    checks: ['Назад', 'Расписание', 'Выберите дату'],
    rejects: ['Автошкола не найдена'],
  },
  {
    path: '/login',
    checks: ['Телефон', 'Пароль'],
    rejects: [],
  },
  {
    path: '/instructor/tok-petrov-2024',
    checks: ['Кабинет инструктора'],
    rejects: ['Проведено', 'Отменено'],
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
      if (message.type() === 'error' && !isExpectedCompatibilityConsoleError(route, message.text())) {
        failures.push(`${route.path} (${url}): console error: ${message.text()}`)
      }
    })

    page.on('pageerror', (error) => {
      failures.push(`${route.path} (${url}): page error: ${error.message}`)
    })

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })

      for (const expected of route.checks) {
        try {
          await page.locator('body', { hasText: expected }).waitFor({ timeout: expectedTimeoutMs })
        } catch {
          failures.push(`${route.path} (${url}): missing expected text "${expected}" after ${expectedTimeoutMs}ms`)
        }
      }

      const text = await page.locator('body').innerText()
      const ddKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('dd:workspace:')))

      for (const rejected of [...route.rejects, ...forbidden]) {
        if (text.includes(rejected)) failures.push(`${route.path} (${url}): contains forbidden text "${rejected}"`)
      }

      if (ddKeys.length > 0) failures.push(`${route.path} (${url}): business localStorage keys present ${ddKeys.join(', ')}`)
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
