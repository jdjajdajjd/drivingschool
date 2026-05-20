import { chromium } from 'playwright'

const baseUrl = process.env.QA_BASE_URL || process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'
const timeout = 15_000
const demoSchoolId = 'school-virazh'
const demoSchoolPath = '/school/virazh'

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
  assert(!text.includes('Cannot GET /'), `${routeLabel}: server returned plain fallback`)
  assertNoMojibakeText(text, routeLabel)
  return text
}

function assertNoMojibakeText(text, routeLabel) {
  const markers = ['Рђ', 'Рџ', 'РЎ', 'Р°', 'Рµ', 'Рё', 'РЅ', 'Р»', 'вЂ', 'в‚Ѕ', 'В«', 'В»']
  const found = markers.find((marker) => text.includes(marker))
  assert(!found, `${routeLabel}: mojibake marker "${found}" found in rendered text`)
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

  return page.locator('body').innerText()
}

async function seedStudent(page) {
  await page.addInitScript(() => {
    const schoolId = 'school-virazh'
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

    localStorage.setItem(`dd:student_profile:${schoolId}`, JSON.stringify(profile))
    localStorage.setItem(
      'dd:student_login:79990000000',
      JSON.stringify({ schoolId, phone: '79990000000', password: '123456' }),
    )
  })
}

async function grantWorkspaceAdmin(page) {
  await page.addInitScript(() => {
    const now = new Date()
    const school = {
      id: 'school-workspace',
      name: 'Рабочая автошкола',
      slug: 'workspace',
      description: 'Рабочий тестовый контур',
      phone: '+7 999 000-10-10',
      email: 'office@example.test',
      address: 'Москва',
      createdAt: now.toISOString(),
      primaryColor: '#1f5b43',
      bookingLimitEnabled: true,
      maxActiveBookingsPerStudent: 2,
      branchSelectionMode: 'student_choice',
      maxSlotsPerBooking: 1,
      defaultLessonDuration: 90,
      enabledCategoryCodes: ['B'],
      isActive: true,
    }

    sessionStorage.setItem('dd:data_namespace', 'workspace')
    sessionStorage.setItem('dd:access:admin:workspace', 'granted')
    sessionStorage.setItem('dd:access_secret:admin:workspace', 'qa-password')
    sessionStorage.setItem('dd:staff_context:workspace', JSON.stringify({ role: 'admin', schoolId: school.id, branchIds: [], name: 'QA школа' }))
    localStorage.setItem('dd:workspace:schools', JSON.stringify([school]))
    localStorage.setItem('dd:workspace:branches', JSON.stringify([]))
    localStorage.setItem('dd:workspace:instructors', JSON.stringify([]))
    localStorage.setItem('dd:workspace:students', JSON.stringify([]))
    localStorage.setItem('dd:workspace:slots', JSON.stringify([]))
    localStorage.setItem('dd:workspace:bookings', JSON.stringify([]))
  })
}

async function grantWorkspaceRole(page, role, options = {}) {
  await page.addInitScript(({ role, options }) => {
    const now = new Date()
    const school = {
      id: 'school-workspace',
      name: 'Рабочая автошкола',
      slug: 'workspace',
      description: 'Рабочий тестовый контур',
      phone: '+7 999 000-10-10',
      email: 'office@example.test',
      address: 'Москва',
      createdAt: now.toISOString(),
      primaryColor: '#1f5b43',
      bookingLimitEnabled: true,
      maxActiveBookingsPerStudent: 2,
      branchSelectionMode: 'student_choice',
      maxSlotsPerBooking: 1,
      defaultLessonDuration: 90,
      enabledCategoryCodes: ['B'],
      isActive: options.isActive ?? true,
      accessStatus: options.accessStatus ?? 'active',
      accessPaidUntil: options.accessPaidUntil,
    }
    sessionStorage.setItem('dd:data_namespace', 'workspace')
    sessionStorage.setItem('dd:access:admin:workspace', 'granted')
    sessionStorage.setItem('dd:access_secret:admin:workspace', 'qa-password')
    sessionStorage.setItem('dd:staff_context:workspace', JSON.stringify({ role, schoolId: school.id, branchIds: options.branchIds ?? [], name: 'QA роль' }))
    localStorage.setItem('dd:workspace:schools', JSON.stringify([school]))
    localStorage.setItem('dd:workspace:branches', JSON.stringify([]))
    localStorage.setItem('dd:workspace:instructors', JSON.stringify([]))
    localStorage.setItem('dd:workspace:students', JSON.stringify([]))
    localStorage.setItem('dd:workspace:slots', JSON.stringify([]))
    localStorage.setItem('dd:workspace:bookings', JSON.stringify([]))
  }, { role, options })
}

async function grantBranchAdminWithWorkspaceData(page) {
  await page.addInitScript(() => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const school = {
      id: 'school-workspace',
      name: 'Рабочая автошкола',
      slug: 'workspace',
      description: 'Рабочий тестовый контур',
      phone: '+7 999 000-10-10',
      email: 'office@example.test',
      address: 'Москва',
      createdAt: now.toISOString(),
      primaryColor: '#1f5b43',
      bookingLimitEnabled: true,
      maxActiveBookingsPerStudent: 2,
      branchSelectionMode: 'student_choice',
      maxSlotsPerBooking: 1,
      defaultLessonDuration: 90,
      enabledCategoryCodes: ['B'],
      isActive: true,
    }
    const branches = [
      { id: 'branch-central', schoolId: school.id, name: 'Центральный филиал', address: 'ул. Центральная, 1', phone: '+7 999 000-11-11', isActive: true },
      { id: 'branch-north', schoolId: school.id, name: 'Северный филиал', address: 'ул. Северная, 7', phone: '+7 999 000-22-22', isActive: true },
    ]
    const instructors = [
      { id: 'inst-central', schoolId: school.id, branchId: 'branch-central', name: 'Павел Центральный', phone: '79990001111', email: '', token: 'tok-central', bio: '', experience: 5, isActive: true, categories: ['B'], avatarInitials: 'ПЦ', avatarColor: '#10201F', car: 'Solaris', transmission: 'manual' },
      { id: 'inst-north', schoolId: school.id, branchId: 'branch-north', name: 'Нина Северная', phone: '79990002222', email: '', token: 'tok-north', bio: '', experience: 8, isActive: true, categories: ['B'], avatarInitials: 'НС', avatarColor: '#1f5b43', car: 'Rio', transmission: 'auto' },
    ]
    const students = [
      { id: 'stu-central', schoolId: school.id, name: 'Олег Центральный', phone: '79991110000', normalizedPhone: '79991110000', email: '', assignedBranchId: 'branch-central', assignedInstructorId: 'inst-central', categoryCodes: ['B'], trainingStage: 'city', createdAt: now.toISOString() },
      { id: 'stu-north', schoolId: school.id, name: 'Анна Северная', phone: '79992220000', normalizedPhone: '79992220000', email: '', assignedBranchId: 'branch-north', assignedInstructorId: 'inst-north', categoryCodes: ['B'], trainingStage: 'city', createdAt: now.toISOString() },
    ]
    const slots = [
      { id: 'slot-central', schoolId: school.id, instructorId: 'inst-central', branchId: 'branch-central', date: today, time: '12:00', duration: 90, lessonType: 'city', status: 'booked', bookingId: 'booking-central', createdAt: now.toISOString() },
      { id: 'slot-north', schoolId: school.id, instructorId: 'inst-north', branchId: 'branch-north', date: today, time: '14:00', duration: 90, lessonType: 'city', status: 'booked', bookingId: 'booking-north', createdAt: now.toISOString() },
      { id: 'slot-north-free', schoolId: school.id, instructorId: 'inst-north', branchId: 'branch-north', date: tomorrow, time: '16:00', duration: 90, lessonType: 'practice_ground', status: 'available', createdAt: now.toISOString() },
    ]
    const bookings = [
      { id: 'booking-central', schoolId: school.id, slotId: 'slot-central', instructorId: 'inst-central', branchId: 'branch-central', studentId: 'stu-central', studentName: 'Олег Центральный', studentPhone: '79991110000', studentEmail: '', status: 'active', createdAt: now.toISOString() },
      { id: 'booking-north', schoolId: school.id, slotId: 'slot-north', instructorId: 'inst-north', branchId: 'branch-north', studentId: 'stu-north', studentName: 'Анна Северная', studentPhone: '79992220000', studentEmail: '', status: 'active', createdAt: now.toISOString() },
    ]

    sessionStorage.setItem('dd:data_namespace', 'workspace')
    sessionStorage.setItem('dd:access:admin:workspace', 'granted')
    sessionStorage.setItem('dd:access_secret:admin:workspace', 'qa-password')
    sessionStorage.setItem('dd:staff_context:workspace', JSON.stringify({ role: 'branch_admin', schoolId: school.id, branchIds: ['branch-north'], name: 'QA филиал' }))
    localStorage.setItem('dd:workspace:schools', JSON.stringify([school]))
    localStorage.setItem('dd:workspace:branches', JSON.stringify(branches))
    localStorage.setItem('dd:workspace:instructors', JSON.stringify(instructors))
    localStorage.setItem('dd:workspace:students', JSON.stringify(students))
    localStorage.setItem('dd:workspace:slots', JSON.stringify(slots))
    localStorage.setItem('dd:workspace:bookings', JSON.stringify(bookings))
  })
}

async function grantDemoAdmin(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('dd:data_namespace', 'demo')
    sessionStorage.setItem('dd:access:admin:demo', 'granted')
  })
}

async function checkPublicRoutes(browser) {
  await withPage(browser, 'public mobile', { width: 390, height: 844 }, async (page) => {
    const rootText = await openRoute(page, '/', ['vroom', 'Онлайн-запись для автошкол', 'Посмотреть демо'])
    assert(!rootText.includes('Супер-админка'), 'root: exposes internal superadmin wording')
    assert(!rootText.includes('Платформа'), 'root: exposes internal platform wording')
    assert(!rootText.includes('owner'), 'root: exposes owner wording')
    assert(!rootText.includes('владелец сервиса'), 'root: exposes owner wording')
    assert(!rootText.includes('Где супер-админка'), 'root: contains user-facing internal complaint wording')
    await openRoute(page, '/demo', ['Посмотрите vroom в деле', 'Демо ученика', 'Демо автошколы'])
    await openRoute(page, '/login', ['Выберите кабинет', 'Автошкола', 'Ученик'])
    await openRoute(page, '/demo/admin-login', ['vroom'])
    await openRoute(page, '/admin-login', ['Автошкола', 'Кабинет школы', 'Логин', 'Пароль'])
    await openRoute(page, '/operator/login', ['Операторский вход', 'Логин', 'Пароль'])
    const schoolText = await openRoute(page, demoSchoolPath, ['Автошкола «Вираж»', 'Открыть личный кабинет'])
    assert(!schoolText.includes('Создать доступ'), 'school page: public registration access button is visible')
    await openRoute(page, `${demoSchoolPath}/register`, ['Регистрация ученика', 'Введите фамилию'])
    await openRoute(page, `${demoSchoolPath}/login`, ['Телефон', 'Пароль'])
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
      const navCenter = navMetrics.nav.left + navMetrics.nav.width / 2
      const mainCenter = navMetrics.main.left + navMetrics.main.width / 2
      assert(Math.abs(navCenter - mainCenter) <= 6, `student ${label}: bottom nav is not centered with app shell`)
      assert(navMetrics.nav.width <= Math.min(viewport.width, 430), `student ${label}: bottom nav width is wrong`)
    }

    await page.getByRole('button', { name: /Расписание/ }).last().click()
    await page.getByRole('heading', { name: 'Расписание' }).waitFor({ timeout })

    await page.getByRole('button', { name: /Профиль/ }).last().click()
    await page.getByRole('heading', { name: 'Профиль' }).waitFor({ timeout })

    await page.getByRole('button', { name: /Связь/ }).last().click()
    await page.locator('body', { hasText: /Связь|Контакты|Написать/ }).waitFor({ timeout })
  })
}

async function checkWorkspaceAdmin(browser, viewport, label) {
  await withPage(browser, `workspace admin ${label}`, viewport, async (page) => {
    await grantWorkspaceAdmin(page)

    const routes = [
      ['/admin-panel', ['vroom']],
      ['/admin-panel/schedule', ['Расписание']],
      ['/admin-panel/students', ['Ученики']],
      ['/admin-panel/instructors', ['Инструкторы']],
      ['/admin-panel/payments', ['Оплаты']],
      ['/admin-panel/settings', ['Настройки']],
    ]

    for (const [path, expected] of routes) {
      await openRoute(page, path, expected)
      assert(!page.url().includes('/admin-login'), `workspace admin ${label}: ${path} redirected to login`)
    }
  })
}

async function checkBranchAdminScope(browser) {
  await withPage(browser, 'branch admin scope', { width: 1440, height: 900 }, async (page) => {
    await grantBranchAdminWithWorkspaceData(page)
    const branchesText = await openRoute(page, '/admin-panel/branches', ['Северный филиал'])
    assert(!branchesText.includes('Центральный филиал'), 'branch admin: sees another branch on branches page')

    const studentsText = await openRoute(page, '/admin-panel/students', ['Анна Северная'])
    assert(!studentsText.includes('Олег Центральный'), 'branch admin: sees another branch student')

    const instructorsText = await openRoute(page, '/admin-panel/instructors', ['Нина Северная'])
    assert(!instructorsText.includes('Павел Центральный'), 'branch admin: sees another branch instructor')

    await openRoute(page, '/admin-panel/schedule', ['Анна Северная'])
    const navText = await page.locator('body').innerText()
    assert(!navText.includes('Настройки'), 'branch admin: settings nav should be hidden')
    assert(!navText.includes('Пользователи'), 'branch admin: users nav should be hidden')
  })
}

async function checkRolePermissions(browser) {
  await withPage(browser, 'accountant role permissions', { width: 1440, height: 900 }, async (page) => {
    await grantWorkspaceRole(page, 'accountant')
    await openRoute(page, '/admin-panel/payments', ['Оплаты'])
    const deniedText = await openRoute(page, '/admin-panel/students', ['Недостаточно прав'])
    assert(!deniedText.includes('Добавить ученика'), 'accountant: can use students section')
  })

  await withPage(browser, 'overdue school access', { width: 390, height: 844 }, async (page) => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await grantWorkspaceRole(page, 'admin', { accessStatus: 'overdue', accessPaidUntil: yesterday })
    await openRoute(page, '/admin-panel', ['Доступ просрочен', 'сейчас недоступен'])
  })
}

async function checkDemoAdmin(browser, viewport, label) {
  await withPage(browser, `demo admin ${label}`, viewport, async (page) => {
    await grantDemoAdmin(page)

    const routes = [
      ['/demo/admin', ['vroom']],
      ['/demo/admin/schedule', ['Расписание']],
      ['/demo/admin/students', ['Ученики']],
    ]

    for (const [path, expected] of routes) {
      await openRoute(page, path, expected)
      assert(!page.url().includes('/demo/admin-login'), `demo admin ${label}: ${path} redirected to login`)
    }
  })
}

const browser = await chromium.launch({ headless: true })

try {
  await checkPublicRoutes(browser)
  await checkStudentCabinet(browser, { width: 390, height: 844 }, 'mobile')
  await checkStudentCabinet(browser, { width: 1440, height: 900 }, 'desktop')
  await checkWorkspaceAdmin(browser, { width: 390, height: 844 }, 'mobile')
  await checkWorkspaceAdmin(browser, { width: 1440, height: 900 }, 'desktop')
  await checkBranchAdminScope(browser)
  await checkRolePermissions(browser)
  await checkDemoAdmin(browser, { width: 390, height: 844 }, 'mobile')
} finally {
  await browser.close()
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Product QA passed for ${baseUrl}`)
