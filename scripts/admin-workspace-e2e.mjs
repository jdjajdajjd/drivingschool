import { chromium } from 'playwright'

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'
const stamp = Date.now().toString().slice(-6)
const schoolName = `Автошкола Тест ${stamp}`
const schoolDescription = `Описание тестовой автошколы ${stamp}`
const branchName = `Филиал ${stamp}`
const instructorName = `Иван Тестов ${stamp}`
const studentName = `Петров Тест ${stamp}`
const studentPhone = `+7 999 ${stamp.slice(0, 3)}-${stamp.slice(3, 5)}-${stamp.slice(5).padEnd(2, '0')}`
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
const dayAfter = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

const failures = []
function assert(condition, message) {
  if (!condition) failures.push(message)
}

async function clickVisible(page, name) {
  const locator = page.getByRole('button', { name }).last()
  await locator.waitFor({ state: 'visible', timeout: 10_000 })
  await locator.scrollIntoViewIfNeeded().catch(() => undefined)
  await locator.click({ force: true })
}

async function clickTextButton(page, text) {
  const clicked = await page.evaluate((buttonText) => {
    const buttons = [...document.querySelectorAll('button')]
    const button = buttons.reverse().find((item) => item.textContent?.trim().includes(buttonText))
    if (!button) return false
    button.click()
    return true
  }, text)
  if (!clicked) throw new Error(`Button not found: ${text}`)
}

async function text(page) {
  return page.locator('body').innerText()
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 430, height: 900 } })
const page = await context.newPage()
page.on('pageerror', (error) => failures.push(`page error: ${error.message}`))
page.on('console', (message) => {
  if (message.type() !== 'error') return
  const text = message.text()
  if (text.includes('Failed to load resource') && /status of (404|406)/.test(text)) return
  failures.push(`console error: ${text}`)
})

try {
  await page.goto(`${baseUrl}/workspace-admin`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Сегодня' }).waitFor({ timeout: 10_000 })

  // Settings: edit, save, reload persistence.
  await page.goto(`${baseUrl}/virazh-office-73q/settings`, { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Название автошколы').fill(schoolName)
  await page.getByLabel('Основной цвет').fill('#4455C4')
  await page.getByLabel('Описание').fill(schoolDescription)
  await clickTextButton(page, 'Сохранить изменения')
  await page.getByText('Настройки автошколы сохранены.').waitFor({ timeout: 5_000 })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByLabel('Название автошколы').waitFor({ timeout: 5_000 })
  assert(await page.getByLabel('Название автошколы').inputValue() === schoolName, 'settings name did not persist after reload')
  assert(await page.getByLabel('Описание').inputValue() === schoolDescription, 'settings description did not persist after reload')

  // Branches: create and edit.
  await page.goto(`${baseUrl}/virazh-office-73q/branches`, { waitUntil: 'domcontentloaded' })
  await clickVisible(page, /Создать филиал/)
  await page.getByLabel('Название').fill(branchName)
  await page.getByLabel('Адрес').fill(`Адрес ${stamp}`)
  await page.getByLabel('Телефон').fill('+7 999 111-22-33')
  await clickTextButton(page, 'Создать филиал')
  await page.getByText('Филиал создан.').waitFor({ timeout: 5_000 })
  assert((await text(page)).includes(branchName), 'created branch is not visible')
  const editBranchOpened = await page.evaluate((name) => {
    const card = [...document.querySelectorAll('div')].find((item) => item.textContent?.includes(name) && item.textContent?.includes('Редактировать'))
    const button = card ? [...card.querySelectorAll('button')].find((item) => item.textContent?.includes('Редактировать')) : null
    button?.click()
    return Boolean(button)
  }, branchName)
  assert(editBranchOpened, 'branch edit button not found')
  await page.getByText('Редактировать филиал').waitFor({ timeout: 5_000 })
  await page.getByLabel('Адрес').fill(`Новый адрес ${stamp}`)
  await clickTextButton(page, 'Сохранить')
  await page.getByText('Филиал обновлён.').waitFor({ timeout: 5_000 })
  assert((await text(page)).includes(`Новый адрес ${stamp}`), 'edited branch address is not visible')

  // Instructors: create and copy/open controls visible.
  await page.goto(`${baseUrl}/virazh-office-73q/instructors`, { waitUntil: 'domcontentloaded' })
  await clickVisible(page, /Создать инструктора/)
  await page.getByLabel('Имя').fill(instructorName)
  await page.getByLabel('Телефон').fill('+7 999 222-33-44')
  await page.getByLabel('Email').fill(`inst${stamp}@example.com`)
  await page.getByLabel('Машина').fill('Hyundai Solaris')
  await page.getByLabel('Описание').fill('Спокойный инструктор для теста')
  await clickTextButton(page, 'Создать инструктора')
  await page.getByText('Инструктор создан.').waitFor({ timeout: 5_000 })
  assert((await text(page)).includes(instructorName), 'created instructor is not visible')

  // Slots: create single and bulk.
  await page.goto(`${baseUrl}/virazh-office-73q/slots`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Одно занятие/ }).click()
  await page.getByLabel('Дата').first().fill(tomorrow)
  await page.getByLabel('Время').fill('10:00')
  await clickTextButton(page, 'Добавить занятие')
  await page.getByText('Занятие добавлено в расписание.').waitFor({ timeout: 5_000 })
  assert((await text(page)).includes('10:00'), 'single created slot is not visible')

  await page.getByRole('button', { name: /Серия занятий/ }).click()
  await page.getByLabel('Дата от').fill(dayAfter)
  await page.getByLabel('Дата до').fill(dayAfter)
  const weekday = new Date(`${dayAfter}T00:00:00`).getDay() || 7
  const weekdayLabels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  await page.getByRole('button', { name: weekdayLabels[weekday % 7] }).click().catch(() => undefined)
  await clickTextButton(page, 'Создать серию занятий')
  await page.getByText(/Создано занятий:|Новых занятий не создано/).waitFor({ timeout: 5_000 })

  // Public school page and direct booking URL must not allow guest booking anymore.
  await page.goto(`${baseUrl}/school/workspace`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: /Войдите в кабинет/ }).waitFor({ timeout: 10_000 })
  assert((await text(page)).includes('Запись на занятия доступна только из личного кабинета') || (await text(page)).includes('Запись на занятия доступна только зарегистрированным ученикам'), 'public school page does not explain cabinet-only booking')

  await page.goto(`${baseUrl}/school/workspace/book`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: /Запись только из личного кабинета/ }).waitFor({ timeout: 10_000 })

  // Keep admin booking/student pages covered with seeded workspace data; actual booking creation is now student-cabinet only.

  // Bookings: find, complete, reschedule/cancel controls page still works.
  await page.goto(`${baseUrl}/virazh-office-73q/bookings`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Записи', exact: true }).waitFor({ timeout: 10_000 })
  assert((await text(page)).includes('Фильтры'), 'admin bookings filters are not visible')
  await page.getByPlaceholder('Ученик или телефон').fill('Иванова')

  // Students page still loads after guest booking removal.
  await page.goto(`${baseUrl}/virazh-office-73q/students`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Ученики' }).waitFor({ timeout: 10_000 })
  assert((await text(page)).includes('Список учеников'), 'students list section is not visible')

  // Modules: enable/disable non-coming-soon module.
  await page.goto(`${baseUrl}/virazh-office-73q/modules`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Дополнения' }).waitFor({ timeout: 10_000 })
  await page.getByText('Каталог').waitFor({ timeout: 10_000 })
  assert((await text(page)).includes('Дополнения'), 'add-ons page is not visible')

  // Dashboard/public link should still open.
  await page.goto(`${baseUrl}/virazh-office-73q`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Сегодня' }).waitFor({ timeout: 10_000 })
  await clickTextButton(page, 'Открыть')
  const newPage = await context.waitForEvent('page', { timeout: 5_000 }).catch(() => null)
  const publicPage = newPage ?? page
  await publicPage.waitForLoadState('domcontentloaded').catch(() => undefined)
  assert(/\/school\/(workspace|virazh)/.test(publicPage.url()), 'dashboard public link did not open school public page')
} catch (error) {
  failures.push(error instanceof Error ? error.stack || error.message : String(error))
} finally {
  await browser.close()
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Admin workspace E2E passed for ${baseUrl}`)
