import { chromium } from 'playwright'

const baseUrl = process.env.AUDIT_BASE_URL || 'https://vroom.today'
const failures = []
const warnings = []
const findings = []
const routes = [
  { path: '/', expect: ['Онлайн-запись', 'Открыть демо автошколы'], reject: ['пустая настройка', 'DriveDesk'] },
  { path: '/school/virazh', expect: ['Автошкола «Вираж»', 'Войти'], reject: ['Автошкола не найдена', 'Здесь будут', 'Записаться на занятие'] },
  { path: '/school/virazh/book', expect: ['Запись только из личного кабинета', 'Войти в кабинет'], waitFor: 'Войти в кабинет', reject: ['Автошкола не найдена', 'name@example.ru', 'Если всё верно -', 'Нажмите свободное время'] },
  { path: '/school/virazh/register', expect: ['Введите фамилию'], reject: ['Автошкола не найдена'] },
  { path: '/school/virazh/login', expect: ['Телефон', 'Пароль', 'Забыли пароль?'], reject: ['скоро появится', 'Здесь будут'] },
  { path: '/login', expect: ['Телефон', 'Пароль', 'Забыли пароль?'], reject: ['скоро появится', 'Здесь будут'] },
  { path: '/instructor/tok-petrov-2024', expect: ['Кабинет инструктора', 'Эта страница только показывает расписание'], waitFor: 'Кабинет инструктора', reject: ['Автошкола не найдена'] },
  { path: '/terms', expect: ['Условия'], reject: ['404'] },
  { path: '/privacy', expect: ['Политика'], reject: ['404'] },
  { path: '/workspace-admin', expect: ['Сегодня'], reject: ['404'] },
  { path: '/virazh-office-73q/settings', auth: true, expect: ['Настройки', 'Сохранить изменения'], reject: ['Школа не найдена'] },
  { path: '/virazh-office-73q/branches', auth: true, expect: ['Филиалы', 'Создать филиал'], reject: ['Школа не найдена'] },
  { path: '/virazh-office-73q/instructors', auth: true, expect: ['Инструкторы', 'Создать инструктора'], reject: ['Школа не найдена'] },
  { path: '/virazh-office-73q/slots', auth: true, expect: ['Расписание', 'Добавить занятия'], reject: ['Школа не найдена'] },
  { path: '/virazh-office-73q/bookings', auth: true, expect: ['Записи', 'Фильтры'], reject: ['Школа не найдена'] },
  { path: '/virazh-office-73q/students', auth: true, expect: ['Ученики', 'Список учеников'], reject: ['Школа не найдена'] },
  { path: '/virazh-office-73q/modules', auth: true, expect: ['Модули', 'Стоимость'], reject: ['Школа не найдена'] },
  { path: '/root-entrance-91x', expect: ['Вход супер-админа'], reject: ['404'] },
]

function assert(condition, message) {
  if (!condition) failures.push(message)
}

async function grantAdmin(page) {
  await page.goto(`${baseUrl}/workspace-admin`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(300)
}

async function runRouteAudit() {
  const browser = await chromium.launch({ headless: true })
  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: 430, height: 900 } })
    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (error) => consoleErrors.push(error.message))
    try {
      if (route.auth) await grantAdmin(page)
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' })
      if (route.waitFor) await page.getByText(route.waitFor).first().waitFor({ timeout: 8_000 }).catch(() => undefined)
      await page.waitForTimeout(1800)
      const body = await page.locator('body').innerText().catch(() => '')
      for (const expected of route.expect) assert(body.includes(expected), `${route.path}: missing "${expected}"`)
      for (const rejected of route.reject ?? []) assert(!body.includes(rejected), `${route.path}: contains rejected "${rejected}"`)
      const badConsole = consoleErrors.filter((text) => !text.includes('404') || !route.path.startsWith('/instructor/'))
      if (badConsole.length) warnings.push(`${route.path}: console errors: ${badConsole.slice(0, 3).join(' | ')}`)
    } catch (error) {
      failures.push(`${route.path}: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      await context.close()
    }
  }
  await browser.close()
}

async function runStudentJourney() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 430, height: 900 } })
  const page = await context.newPage()
  const stamp = Date.now().toString().slice(-6)
  const phone = `999${stamp}0`.slice(0, 10)
  const password = `pass${stamp}`
  try {
    await page.goto(`${baseUrl}/school/virazh/register`, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Фамилия *').fill(`Иванов${stamp}`)
    await page.getByRole('button', { name: /Дальше/ }).click()
    await page.getByLabel('Имя *').fill('Тест')
    await page.getByRole('button', { name: /Дальше/ }).click()
    await page.getByRole('button', { name: 'Пропустить' }).click()
    await page.locator('input[type=tel]').fill(phone)
    await page.getByRole('button', { name: /Дальше/ }).click()
    await page.getByRole('textbox', { name: 'Пароль *', exact: true }).fill(password)
    await page.getByLabel('Повторите пароль *').fill(password)
    await page.getByLabel(/услов/).check({ force: true }).catch(async () => {
      await page.locator('input[type=checkbox]').check({ force: true })
    })
    await page.getByRole('button', { name: /Создать кабинет/ }).click()
    await page.getByText(/Готово|кабинет/).waitFor({ timeout: 8_000 }).catch(() => undefined)
    await page.goto(`${baseUrl}/school/virazh/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('input[type=tel]').fill(phone)
    await page.getByLabel('Пароль').fill(password)
    await page.getByRole('button', { name: /^Войти/ }).click()
    await page.waitForTimeout(1500)
    assert(page.url().includes('/student'), 'student register/login: did not enter student cabinet')
  } catch (error) {
    failures.push(`student register/login journey: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await browser.close()
  }
}

async function runSuperAdminJourney() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  try {
    await page.goto(`${baseUrl}/root-entrance-91x`, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Логин').fill('drivedesk-root')
    await page.getByLabel('Пароль').fill('drivedesk-root-2026')
    await page.getByRole('button', { name: /^Войти по логину/ }).click()
    await page.getByRole('link', { name: 'Автошколы' }).waitFor({ timeout: 8_000 })
    const body = await page.locator('body').innerText()
    assert(body.includes('Автошколы') || body.includes('Всего автошкол'), 'superadmin: opened but expected content missing')
  } catch (error) {
    failures.push(`superadmin login journey: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await browser.close()
  }
}

async function runCodeAudit() {
  const fs = await import('node:fs/promises')
  const files = await fs.readdir('src/pages', { recursive: true })
  const pageFiles = files.filter((file) => file.endsWith('.tsx'))
  for (const file of pageFiles) {
    const full = `src/pages/${file}`
    const content = await fs.readFile(full, 'utf8')
    if (content.includes('скоро появится')) findings.push(`${full}: contains "скоро появится" copy`)
    if (content.includes('Здесь будут')) findings.push(`${full}: contains unfinished copy "Здесь будут"`)
    if (content.includes("navigate('/student/book')")) findings.push(`${full}: navigates to generic /student/book`) 
  }
}

await runRouteAudit()
await runStudentJourney()
await runSuperAdminJourney()
await runCodeAudit()

const report = { baseUrl, failures, warnings, findings }
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exit(1)
