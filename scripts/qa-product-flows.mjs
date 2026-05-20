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

async function assertModalFitsViewport(page, routeLabel) {
  const result = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]')
    if (!dialog) return { ok: false, reason: 'dialog missing' }
    const rect = dialog.getBoundingClientRect()
    const action = dialog.querySelector('.v-modal-actions')
    const actionRect = action?.getBoundingClientRect()
    const width = window.innerWidth
    const height = window.innerHeight
    if (rect.top < -1 || rect.left < -1 || rect.right > width + 1 || rect.bottom > height + 1) {
      return { ok: false, reason: `dialog out of viewport: ${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)} / ${width}x${height}` }
    }
    if (actionRect && (actionRect.bottom > height + 1 || actionRect.top < -1)) {
      return { ok: false, reason: `actions out of viewport: ${Math.round(actionRect.top)}-${Math.round(actionRect.bottom)} / ${height}` }
    }
    return { ok: true, reason: '' }
  })
  assert(result.ok, `${routeLabel}: ${result.reason}`)
}

async function seedLaunchWorkspace(page) {
  await page.addInitScript(() => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const tomorrowKey = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const todayDate = new Date(now)
    todayDate.setHours(23, 0, 0, 0)
    if (todayDate.getTime() <= now.getTime()) todayDate.setDate(todayDate.getDate() + 1)
    const todaySlotDate = todayDate.toISOString().slice(0, 10)
    const school = {
      id: 'school-workspace', name: 'Рабочая автошкола', slug: 'workspace', description: 'Рабочий контур', phone: '+7 999 000-10-10', email: 'office@example.test', address: 'Москва', createdAt: now.toISOString(), primaryColor: '#111827', bookingLimitEnabled: true, maxActiveBookingsPerStudent: 2, branchSelectionMode: 'student_choice', maxSlotsPerBooking: 1, defaultLessonDuration: 90, enabledCategoryCodes: ['B'], isActive: true, accessStatus: 'active', accessPaidUntil: '2099-12-31',
    }
    const branch = { id: 'branch-main', schoolId: school.id, name: 'Главный филиал', address: 'Москва, Тестовая 1', phone: '+7 999 000-11-11', isActive: true }
    const instructor = { id: 'inst-main', schoolId: school.id, branchId: branch.id, name: 'Мария Инструкторова', phone: '79990001111', email: '', token: 'tok-main', bio: '', experience: 7, isActive: true, categories: ['B'], avatarInitials: 'МИ', avatarColor: '#111827', car: 'Solaris', transmission: 'manual' }
    const car = { id: 'car-main', schoolId: school.id, branchId: branch.id, instructorId: instructor.id, brand: 'Hyundai', model: 'Solaris', licensePlate: 'А123ВС777', category: 'B', transmission: 'manual', status: 'working', insuranceExpiry: '2099-12-31', nextServiceDate: '2099-12-31', createdAt: now.toISOString(), updatedAt: now.toISOString() }
    instructor.car = car.id
    const students = [
      { id: 'stu-main', schoolId: school.id, name: 'Ирина Готовая', phone: '79995550000', normalizedPhone: '79995550000', email: '', assignedBranchId: branch.id, assignedInstructorId: instructor.id, categoryCodes: ['B'], trainingStage: 'city', hasPassword: true, createdAt: now.toISOString() },
      { id: 'stu-debt', schoolId: school.id, name: 'Дмитрий Должников', phone: '79994440000', normalizedPhone: '79994440000', email: '', assignedBranchId: branch.id, assignedInstructorId: instructor.id, categoryCodes: ['B'], trainingStage: 'city', hasPassword: true, createdAt: now.toISOString() },
    ]
    const slots = [
      { id: 'slot-free', schoolId: school.id, instructorId: instructor.id, branchId: branch.id, date: todaySlotDate, time: '23:00', duration: 60, lessonType: 'city', status: 'available', createdAt: now.toISOString() },
      { id: 'slot-booked', schoolId: school.id, instructorId: instructor.id, branchId: branch.id, date: today, time: '16:00', duration: 90, lessonType: 'city', status: 'booked', bookingId: 'booking-active', createdAt: now.toISOString() },
      { id: 'slot-overlap', schoolId: school.id, instructorId: instructor.id, branchId: branch.id, date: tomorrowKey, time: '10:00', duration: 60, lessonType: 'city', status: 'available', createdAt: now.toISOString() },
    ]
    const bookings = [{ id: 'booking-active', schoolId: school.id, slotId: 'slot-booked', instructorId: instructor.id, branchId: branch.id, studentId: 'stu-main', studentName: 'Ирина Готовая', studentPhone: '79995550000', studentEmail: '', status: 'active', createdAt: now.toISOString(), updatedAt: now.toISOString() }]
    const settings = [{ schoolId: school.id, defaultLessonDuration: 90, maxDaysAheadForBooking: 14, minHoursBeforeCancel: 4, maxActiveBookingsPerStudent: 2, allowBookingWithDebt: false, allowBookingWithoutMedical: false, allowBookingWithoutContract: false, requireManualModeration: false, allowChangeInstructor: true, allowStudentChooseInstructor: true, allowDifferentInstructors: true, maxLessonsPerDay: 2, maxLessonsPerWeek: 6, breakBetweenLessons: 15, workDays: [1,2,3,4,5], workStartHour: 8, workEndHour: 20, defaultPricingPlans: [], blockBookingOnDebt: true, debtGracePeriodDays: 7, notifyAdminOnNoShow: true, notifyAdminOnCancel: true, notifyAdminOnNewBooking: true, notifyAdminOnDebt: true, requiredDocuments: ['contract', 'medical_certificate'], documentExpiryWarningDays: 14 }]
    const documents = [
      { id: 'doc-contract', schoolId: school.id, studentId: 'stu-main', type: 'contract', status: 'verified', fileName: 'dogovor.pdf', uploadedAt: now.toISOString(), verifiedAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: 'doc-med', schoolId: school.id, studentId: 'stu-main', type: 'medical_certificate', status: 'verified', fileName: 'med.pdf', uploadedAt: now.toISOString(), verifiedAt: now.toISOString(), expiresAt: '2099-12-31', createdAt: now.toISOString(), updatedAt: now.toISOString() },
    ]
    const payments = [{ id: 'pay-debt', schoolId: school.id, studentId: 'stu-debt', amount: 5000, paidAmount: 0, remainingAmount: 5000, status: 'overdue', method: 'transfer', paidAt: today, dueDate: today, comment: 'Долг для проверки блокировки', createdAt: now.toISOString(), updatedAt: now.toISOString() }]

    sessionStorage.setItem('dd:data_namespace', 'workspace')
    sessionStorage.setItem('dd:access:admin:workspace', 'granted')
    sessionStorage.setItem('dd:access_secret:admin:workspace', 'qa-password')
    sessionStorage.setItem('dd:staff_context:workspace', JSON.stringify({ role: 'director', schoolId: school.id, branchIds: [], name: 'QA запуск' }))
    localStorage.setItem('dd:workspace:schools', JSON.stringify([school]))
    localStorage.setItem('dd:workspace:branches', JSON.stringify([branch]))
    localStorage.setItem('dd:workspace:instructors', JSON.stringify([instructor]))
    localStorage.setItem('dd:workspace:students', JSON.stringify(students))
    localStorage.setItem('dd:workspace:slots', JSON.stringify(slots))
    localStorage.setItem('dd:workspace:bookings', JSON.stringify(bookings))
    localStorage.setItem('workspace:admin:cars', JSON.stringify([car]))
    localStorage.setItem('workspace:admin:settings', JSON.stringify(settings))
    localStorage.setItem('workspace:admin:documents', JSON.stringify(documents))
    localStorage.setItem('workspace:admin:payments', JSON.stringify(payments))
    localStorage.setItem('workspace:admin:problem_cases', JSON.stringify([{ id: 'problem-main', schoolId: school.id, studentId: 'stu-debt', title: 'Нет будущей записи после долга', description: 'Нужно связаться с учеником', type: 'debt', priority: 'high', status: 'open', createdAt: now.toISOString(), updatedAt: now.toISOString() }]))
    localStorage.setItem('workspace:admin:audit_log', JSON.stringify([{ id: 'audit-doc', schoolId: school.id, userId: 'qa', userName: 'QA запуск', action: 'document_verified', entityType: 'document', entityId: 'doc-contract', description: 'Документ проверен перед запуском', createdAt: now.toISOString() }]))
  })
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

async function grantWorkspaceBookingPolicyData(page) {
  await page.addInitScript(() => {
    const now = new Date()
    const today = new Date().toISOString().slice(0, 10)
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
      accessStatus: 'active',
    }
    const branch = { id: 'branch-main', schoolId: school.id, name: 'Главный филиал', address: 'Москва, Тестовая 1', phone: '+7 999 000-11-11', isActive: true }
    const instructor = { id: 'inst-main', schoolId: school.id, branchId: branch.id, name: 'Мария Инструкторова', phone: '79990001111', email: '', token: 'tok-main', bio: '', experience: 7, isActive: true, categories: ['B'], avatarInitials: 'МИ', avatarColor: '#1f5b43', car: 'Solaris', transmission: 'manual' }
    const students = [
      { id: 'stu-policy', schoolId: school.id, name: 'Ирина Политика', phone: '79995550000', normalizedPhone: '79995550000', email: '', assignedBranchId: branch.id, assignedInstructorId: instructor.id, categoryCodes: ['B'], trainingStage: 'city', hasPassword: true, createdAt: now.toISOString() },
      { id: 'stu-overlap', schoolId: school.id, name: 'Олег Пересечение', phone: '79996660000', normalizedPhone: '79996660000', email: '', assignedBranchId: branch.id, assignedInstructorId: instructor.id, categoryCodes: ['B'], trainingStage: 'city', hasPassword: true, createdAt: now.toISOString() },
    ]
    const slots = [
      { id: 'slot-policy-free', schoolId: school.id, instructorId: instructor.id, branchId: branch.id, date: today, time: '23:00', duration: 90, lessonType: 'city', status: 'available', createdAt: now.toISOString() },
      { id: 'slot-policy-overlap', schoolId: school.id, instructorId: instructor.id, branchId: branch.id, date: today, time: '23:30', duration: 90, lessonType: 'city', status: 'booked', bookingId: 'booking-overlap', createdAt: now.toISOString() },
    ]
    const bookings = [
      { id: 'booking-overlap', schoolId: school.id, slotId: 'slot-policy-overlap', instructorId: instructor.id, branchId: branch.id, studentId: 'stu-overlap', studentName: 'Олег Пересечение', studentPhone: '79996660000', studentEmail: '', status: 'active', createdAt: now.toISOString() },
    ]
    const settings = [{ id: 'settings-policy', schoolId: school.id, maxActiveBookingsPerStudent: 2, allowBookingWithoutMedical: false, allowBookingWithoutContract: false, maxLessonsPerDay: 2, maxLessonsPerWeek: 6, blockBookingOnDebt: true }]

    sessionStorage.setItem('dd:data_namespace', 'workspace')
    sessionStorage.setItem('dd:access:admin:workspace', 'granted')
    sessionStorage.setItem('dd:access_secret:admin:workspace', 'qa-password')
    sessionStorage.setItem('dd:staff_context:workspace', JSON.stringify({ role: 'admin', schoolId: school.id, branchIds: [], name: 'QA политика' }))
    localStorage.setItem('dd:workspace:schools', JSON.stringify([school]))
    localStorage.setItem('dd:workspace:branches', JSON.stringify([branch]))
    localStorage.setItem('dd:workspace:instructors', JSON.stringify([instructor]))
    localStorage.setItem('dd:workspace:students', JSON.stringify(students))
    localStorage.setItem('dd:workspace:slots', JSON.stringify(slots))
    localStorage.setItem('dd:workspace:bookings', JSON.stringify(bookings))
    localStorage.setItem('workspace:admin:settings', JSON.stringify(settings))
    localStorage.setItem('workspace:admin:documents', JSON.stringify([]))
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

async function checkBookingPolicy(browser) {
  await withPage(browser, 'booking policy guardrails', { width: 390, height: 844 }, async (page) => {
    await grantWorkspaceBookingPolicyData(page)
    await openRoute(page, '/admin-panel/schedule', ['Расписание', 'Свободно'])
    await page.locator('.v-mobile-slot-row, .vroom-slot-card', { hasText: 'Свободно' }).first().click()
    await page.getByRole('button', { name: /Записать ученика/ }).click()
    await page.locator('select').last().selectOption('stu-policy')
    await page.getByRole('button', { name: /^Записать$/ }).click()
    await page.locator('body', { hasText: 'нет загруженного договора' }).waitFor({ timeout })

    await page.evaluate(() => {
      const now = new Date().toISOString()
      localStorage.setItem('workspace:admin:documents', JSON.stringify([
        { id: 'doc-contract', schoolId: 'school-workspace', studentId: 'stu-policy', type: 'contract', status: 'verified', fileName: 'dogovor.pdf', uploadedAt: now, verifiedAt: now, createdAt: now, updatedAt: now },
        { id: 'doc-med', schoolId: 'school-workspace', studentId: 'stu-policy', type: 'medical_certificate', status: 'verified', fileName: 'med.pdf', uploadedAt: now, verifiedAt: now, expiresAt: '2099-12-31', createdAt: now, updatedAt: now },
      ]))
    })
    await page.getByRole('button', { name: /^Записать$/ }).click()
    await page.locator('body', { hasText: /инструктора уже есть занятие|конфликт|Машина уже занята/ }).waitFor({ timeout })
    await page.waitForTimeout(200)
    const stored = await page.evaluate(() => ({
      slots: JSON.parse(localStorage.getItem('dd:workspace:slots') || '[]'),
      bookings: JSON.parse(localStorage.getItem('dd:workspace:bookings') || '[]'),
    }))
    const bookedSlot = stored.slots.find((slot) => slot.id === 'slot-policy-free')
    assert(bookedSlot?.status === 'available' && !bookedSlot.bookingId, 'booking policy: conflict slot was booked anyway')
    assert(stored.bookings.filter((booking) => booking.slotId === 'slot-policy-free' && booking.status === 'active').length === 0, 'booking policy: conflict created an active booking')
  })
}

async function checkLaunchCriticalFlow(browser) {
  await withPage(browser, 'launch critical flow mobile', { width: 390, height: 844 }, async (page) => {
    await seedLaunchWorkspace(page)
    await openRoute(page, '/admin-panel/schedule', ['Расписание', 'Свободно'])

    await page.getByRole('button', { name: /Создать окна/ }).first().click()
    await page.getByRole('dialog').waitFor({ timeout })
    await assertModalFitsViewport(page, 'create slot modal mobile')
    await page.keyboard.press('Escape')

    await page.locator('.v-mobile-slot-row, .vroom-slot-card', { hasText: 'Свободно' }).first().click()
    await page.getByRole('dialog').waitFor({ timeout })
    await assertModalFitsViewport(page, 'slot detail modal mobile')
    await page.getByRole('button', { name: /Записать ученика/ }).click()
    await assertModalFitsViewport(page, 'book student modal mobile')
    await page.locator('select').last().selectOption('stu-main')
    await page.getByRole('button', { name: /^Записать$/ }).click()
    await page.waitForTimeout(300)
    const afterBook = await page.evaluate(() => ({
      slot: JSON.parse(localStorage.getItem('dd:workspace:slots') || '[]').find((item) => item.id === 'slot-free'),
      bookings: JSON.parse(localStorage.getItem('dd:workspace:bookings') || '[]').filter((item) => item.slotId === 'slot-free' && item.status === 'active'),
    }))
    assert(afterBook.slot?.status === 'booked', 'launch flow: admin booking did not mark slot as booked')
    assert(afterBook.bookings.length === 1, 'launch flow: admin booking did not create exactly one active booking')

    const rescheduleDate = await page.evaluate(() => JSON.parse(localStorage.getItem('dd:workspace:slots') || '[]').find((item) => item.id === 'slot-overlap')?.date)
    await page.locator('.v-mobile-slot-row, .vroom-slot-card', { hasText: 'Ирина Готовая' }).first().click()
    await page.getByRole('button', { name: /Перенести/ }).click()
    await page.getByRole('dialog').last().waitFor({ timeout })
    await assertModalFitsViewport(page, 'reschedule modal mobile')
    await page.locator('input[type="date"]').last().fill(rescheduleDate)
    await page.locator('select').last().selectOption('slot-overlap')
    await page.getByRole('dialog').last().getByRole('button', { name: /^Перенести$/ }).click()
    await page.waitForTimeout(300)
    const afterReschedule = await page.evaluate(() => ({
      moved: JSON.parse(localStorage.getItem('dd:workspace:bookings') || '[]').find((item) => item.slotId === 'slot-overlap' && item.status === 'active'),
      oldFreeSlot: JSON.parse(localStorage.getItem('dd:workspace:slots') || '[]').find((item) => item.id === 'slot-free'),
      oldBookedSlot: JSON.parse(localStorage.getItem('dd:workspace:slots') || '[]').find((item) => item.id === 'slot-booked'),
      nextSlot: JSON.parse(localStorage.getItem('dd:workspace:slots') || '[]').find((item) => item.id === 'slot-overlap'),
    }))
    assert(Boolean(afterReschedule.moved), 'launch flow: reschedule did not move booking to selected free slot')
    assert(afterReschedule.oldFreeSlot?.status === 'available' || afterReschedule.oldBookedSlot?.status === 'available', 'launch flow: reschedule did not free old slot')
    assert(afterReschedule.nextSlot?.status === 'booked', 'launch flow: reschedule did not book new slot')

    await openRoute(page, '/admin-panel/students', ['Ученики'])
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'students.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('ФИО;Телефон;Группа;Долг\nМария Импортова;+7 999 123-45-67;B-26;4500\nМария Импортова дубль;+7 999 123-45-67;B-26;4500\n', 'utf8'),
    })
    await page.getByRole('dialog').waitFor({ timeout })
    await assertModalFitsViewport(page, 'student import preview mobile')
    const importText = await page.locator('body').innerText()
    assert(importText.includes('Повторы телефонов') && importText.includes('Долги'), 'student import: preview does not warn about duplicates/debts')
    await page.keyboard.press('Escape')

    await openRoute(page, '/admin-panel/documents', ['Документы'])
    await page.getByRole('button', { name: /Загрузить документ/ }).first().click()
    await page.getByRole('dialog').waitFor({ timeout })
    await assertModalFitsViewport(page, 'document upload modal mobile')
    await page.locator('input[type="file"]').last().setInputFiles({
      name: 'contract.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lW7kSwAAAABJRU5ErkJggg==', 'base64'),
    })
    await page.locator('body', { hasText: 'contract.png' }).waitFor({ timeout })
    await assertModalFitsViewport(page, 'document upload after file mobile')
    await page.keyboard.press('Escape')

    await openRoute(page, '/admin-panel/payments', ['Оплаты'])
    await page.getByRole('button', { name: /Принять оплату/ }).first().click()
    await page.getByRole('dialog').waitFor({ timeout })
    await assertModalFitsViewport(page, 'payment modal mobile')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: /Закрыть долг/ }).first().click()
    await page.waitForTimeout(400)
    const debtPayment = await page.evaluate(() => JSON.parse(localStorage.getItem('workspace:admin:payments') || '[]').find((item) => item.id === 'pay-debt'))
    assert(debtPayment?.status === 'paid' && debtPayment.remainingAmount === 0 && debtPayment.paidAmount === debtPayment.amount, 'payments: close debt action did not mark manual transfer as paid')

    await page.getByRole('button', { name: /Принять оплату/ }).first().click()
    await page.getByRole('dialog').waitFor({ timeout })
    await page.locator('select').first().selectOption('stu-main')
    await page.locator('input[placeholder="35000"]').fill('12000')
    await page.locator('select').nth(2).selectOption('partial')
    await page.locator('input[placeholder="5000"]').fill('4000')
    await page.locator('input[type="date"]').fill(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
    await page.locator('input[placeholder="Оплата за обучение"]').fill('Рассрочка за практику')
    await page.getByRole('button', { name: /^Сохранить$/ }).click()
    await page.waitForTimeout(400)
    const partialPayment = await page.evaluate(() => JSON.parse(localStorage.getItem('workspace:admin:payments') || '[]').find((item) => item.description === 'Рассрочка за практику'))
    assert(partialPayment?.status === 'partial' && partialPayment.paidAmount === 4000 && partialPayment.remainingAmount === 8000 && Boolean(partialPayment.dueDate), 'payments: partial manual payment was not saved correctly')

    await openRoute(page, '/admin-panel/cars', ['Машины'])
    await page.getByRole('button', { name: /Добавить/ }).first().click()
    await page.getByRole('dialog').waitFor({ timeout })
    await assertModalFitsViewport(page, 'car form modal mobile')
    const carModalText = await page.locator('body').innerText()
    assert(carModalText.includes('ОСАГО до') && carModalText.includes('Сервис до'), 'cars: form does not collect insurance/service dates')
    await page.keyboard.press('Escape')

    await openRoute(page, '/admin-panel', ['Сегодня'])
    await page.getByRole('button', { name: /Блоки/ }).click()
    await page.getByRole('dialog').waitFor({ timeout })
    await assertModalFitsViewport(page, 'today blocks modal mobile')

    await openRoute(page, '/admin-panel/launch', ['Готовность к работе', 'Связи данных', 'Рабочая очередь директора'])
    const launchText = await page.locator('body').innerText()
    assert(launchText.includes('Доступ школы') && launchText.includes('Документы'), 'launch readiness: key checks missing')

    await openRoute(page, '/admin-panel/reports', ['Отчёты'])
    const reportsText = await page.locator('body').innerText()
    assert(reportsText.toLowerCase().includes('ученики без будущей записи') && reportsText.toLowerCase().includes('открытые проблемы'), `reports overview: director control queue missing. Text: ${reportsText.slice(0, 900)}`)
    await page.getByRole('button', { name: 'Машины' }).click()
    await page.locator('body', { hasText: 'Hyundai Solaris' }).waitFor({ timeout })
    const carReportText = await page.locator('body').innerText()
    assert(carReportText.includes('инструкторов') && carReportText.includes('проведено'), 'reports cars: real car utilization columns missing')
    await page.getByRole('button', { name: 'Журнал' }).click()
    await page.locator('select').selectOption('document_verified')
    const auditText = await page.locator('body').innerText()
    assert(auditText.includes('Документ проверен'), 'reports audit: document audit action is not filterable/readable')
  })
}

async function checkDemoIsolation(browser) {
  await withPage(browser, 'demo session isolation', { width: 390, height: 844 }, async (page) => {
    await grantDemoAdmin(page)
    await openRoute(page, '/demo/admin/schedule', ['Расписание'])
    await page.evaluate(() => sessionStorage.setItem('dd:demo:qa-marker', 'only-this-session'))
    assert(await page.evaluate(() => localStorage.getItem('dd:demo:qa-marker') === null), 'demo isolation: demo marker leaked to localStorage')
  })

  await withPage(browser, 'demo clean second session', { width: 390, height: 844 }, async (page) => {
    await grantDemoAdmin(page)
    await openRoute(page, '/demo/admin/schedule', ['Расписание'])
    const marker = await page.evaluate(() => sessionStorage.getItem('dd:demo:qa-marker'))
    assert(marker === null, 'demo isolation: another browser session sees previous demo changes')
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
  await checkBookingPolicy(browser)
  await checkLaunchCriticalFlow(browser)
  await checkDemoIsolation(browser)
  await checkDemoAdmin(browser, { width: 390, height: 844 }, 'mobile')
} finally {
  await browser.close()
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Product QA passed for ${baseUrl}`)
