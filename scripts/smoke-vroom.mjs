import { chromium } from 'playwright'

const baseUrl = process.env.SMOKE_BASE_URL || 'https://vroom.today'
const forbidden = ['DriveDesk', 'drivingschool-6wy', 'localStorage', 'онлайн-оплата', 'предоплата']

const routes = [
  {
    path: '/school/virazh',
    checks: ['Автошкола «Вираж»', 'Записаться на занятие'],
    rejects: ['Автошкола не найдена'],
  },
  {
    path: '/school/virazh/book',
    checks: ['Расписание', 'Записаться'],
    rejects: ['Автошкола не найдена'],
  },
  {
    path: '/login',
    checks: ['Телефон', 'Пароль', 'Забыли пароль?'],
    rejects: [],
  },
  {
    path: '/instructor/tok-petrov-2024',
    checks: ['Кабинет инструктора', 'Эта страница только показывает расписание'],
    rejects: ['Проведено', 'Отменено'],
  },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const failures = []

page.on('console', (message) => {
  if (message.type() === 'error') failures.push(`console error: ${message.text()}`)
})

for (const route of routes) {
  const url = new URL(route.path, baseUrl).toString()
  await page.goto(url, { waitUntil: 'networkidle' })
  const text = await page.locator('body').innerText()
  const ddKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('dd:')))

  for (const expected of route.checks) {
    if (!text.includes(expected)) failures.push(`${route.path}: missing "${expected}"`)
  }

  for (const rejected of [...route.rejects, ...forbidden]) {
    if (text.includes(rejected)) failures.push(`${route.path}: contains forbidden "${rejected}"`)
  }

  if (ddKeys.length > 0) failures.push(`${route.path}: business localStorage keys present ${ddKeys.join(', ')}`)
}

await browser.close()

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Smoke passed for ${baseUrl}`)
