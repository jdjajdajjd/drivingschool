import { chromium } from 'playwright'

const baseUrl = process.env.QA_BASE_URL || process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'
const timeout = 15_000

const failures = []

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

async function waitForApp(page, routeLabel) {
  await page.waitForLoadState('domcontentloaded')
  await page.locator('body').waitFor({ state: 'visible', timeout })
  await page.waitForTimeout(500)
  const text = await page.locator('body').innerText()
  assert(!text.includes('Failed to fetch dynamically imported module'), `${routeLabel}: dynamic import failed`)
  assert(!text.includes('404'), `${routeLabel}: visible 404 text`)
  return text
}

async function assertNoHorizontalOverflow(page, routeLabel) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  assert(!overflow, `${routeLabel}: horizontal overflow`)
}

async function withPage(browser, routeLabel, viewport, callback) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  page.on('pageerror', (error) => fail(`${routeLabel}: page error: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (text.includes('Failed to load resource') && /status of (400|404|406)/.test(text)) return
    fail(`${routeLabel}: console error: ${text}`)
  })

  try {
    await callback(page)
  } catch (error) {
    fail(`${routeLabel}: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await page.close()
  }
}

async function openRoute(page, path, expectedTexts) {
  await page.goto(new URL(path, baseUrl).toString(), { waitUntil: 'domcontentloaded' })
  await waitForApp(page, path)
  await assertNoHorizontalOverflow(page, path)
  for (const expected of expectedTexts) {
    try {
      await page.locator('body', { hasText: expected }).waitFor({ timeout })
    } catch {
      const text = await page.locator('body').innerText()
      assert(text.includes(expected), `${path}: missing "${expected}"`)
    }
  }
  const text = await page.locator('body').innerText()
  return text
}

async function seedStudent(page) {
  await page.addInitScript(() => {
    const profile = {
      name: 'Владимир Иванов',
      phone: '79990000000',
      email: '',
      avatarUrl: '',
      passwordSet: true,
      assignedBranchId: 'branch-central',
      assignedInstructorId: 'inst-petrov',
      categoryCodes: ['B'],
      trainingStage: 'city',
      groupName: 'B-24',
      updatedAt: new Date().toISOString(),
      createdByConsent: true,
    }
    localStorage.setItem('dd:student_profile:school-virazh', JSON.stringify(profile))
    localStorage.setItem('dd:student_login:79990000000', JSON.stringify({ schoolId: 'school-virazh', phone: '79990000000', password: '123456' }))
  })
}

async function grantWorkspaceAdmin(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('dd:data_namespace', 'workspace')
    sessionStorage.setItem('dd:access:admin:workspace', 'granted')
    sessionStorage.setItem('dd:access_password:admin:workspace', 'qa-password')
  })
}

async function checkStudentCabinet(browser, viewport, label) {
  await withPage(browser, `student ${label}`, viewport, async (page) => {
    await seedStudent(page)
    await openRoute(page, '/student', ['Владимир', 'Мои записи', 'Расписание автошколы'])

    const navMetrics = await page.evaluate(() => {
      const nav = document.querySelector('.bottom-nav')
      const main = document.querySelector('main')
      const navRect = nav?.getBoundingClientRect()
      const mainRect = main?.getBoundingClientRect()
      return {
        nav: navRect ? { left: Math.round(navRect.left), width: Math.round(navRect.width) } : null,
        main: mainRect ? { left: Math.round(mainRect.left), width: Math.round(mainRect.width) } : null,
      }
    })

    assert(Boolean(navMetrics.nav), `student ${label}: bottom nav missing`)
    if (navMetrics.nav && navMetrics.main) {
      assert(navMetrics.nav.left === navMetrics.main.left, `student ${label}: bottom nav is not aligned with app shell`)
      assert(navMetrics.nav.width === Math.min(viewport.width, 430), `student ${label}: bottom nav width is wrong`)
    }

    await page.getByRole('button', { name: /Расписание/ }).last().click()
    await page.locator('body', { hasText: 'Сегодня' }).waitFor({ timeout })
    await page.getByRole('button', { name: /Профиль/ }).last().click()
    await page.locator('body', { hasText: 'Профиль' }).waitFor({ timeout })
    await page.getByRole('button', { name: /Связь/ }).last().click()
    await page.locator('body', { hasText: /Связь|Контакты|Написать/ }).waitFor({ timeout })
  })
}

async function checkAdminWorkspace(browser, viewport, label) {
  await withPage(browser, `admin ${label}`, viewport, async (page) => {
    await grantWorkspaceAdmin(page)
    const adminRoutes = [
      ['/virazh-office-73q', ['vroom']],
      ['/virazh-office-73q/schedule', ['Расписание']],
      ['/virazh-office-73q/students', ['Ученики']],
      ['/virazh-office-73q/instructors', ['Инструкторы']],
      ['/virazh-office-73q/payments', ['Оплаты']],
      ['/virazh-office-73q/settings', ['Настройки']],
    ]

    for (const [path, expected] of adminRoutes) {
      await openRoute(page, path, expected)
      const url = page.url()
      assert(!url.includes('/workspace-admin'), `admin ${label}: ${path} redirected to login`)
    }
  })
}

async function checkPublicRoutes(browser) {
  await withPage(browser, 'public mobile', { width: 390, height: 844 }, async (page) => {
    await openRoute(page, '/', ['Мобильный кабинет автошколы', '4990 ₽'])
    await openRoute(page, '/school/virazh', ['Автошкола «Вираж»', 'Открыть личный кабинет'])
    await openRoute(page, '/school/virazh/register', ['Регистрация', 'Фамилия'])
    await openRoute(page, '/login', ['Телефон', 'Пароль'])
  })
}

const browser = await chromium.launch({ headless: true })

try {
  await checkPublicRoutes(browser)
  await checkStudentCabinet(browser, { width: 390, height: 844 }, 'mobile')
  await checkStudentCabinet(browser, { width: 1440, height: 900 }, 'desktop')
  await checkAdminWorkspace(browser, { width: 390, height: 844 }, 'mobile')
  await checkAdminWorkspace(browser, { width: 1440, height: 900 }, 'desktop')
} finally {
  await browser.close()
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Product QA passed for ${baseUrl}`)
