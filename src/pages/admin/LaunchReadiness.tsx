import { addDays } from 'date-fns'
import { NavArrowRight as ChevronRight, CheckCircle, WarningTriangle } from '@/components/icons/lucide'
import { Link } from 'react-router-dom'
import { db } from '../../services/storage'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { adminCars, adminDocuments, adminGIBDDExams, adminInternalExams, adminPayments, adminSettings, adminUsers, getDebtForStudent, studentProgress } from '../../services/adminStorage'
import { loadStudentRequests } from '../../services/studentProfile'
import { getSlotDateTime } from '../../services/bookingService'
import { validateDataIntegrity } from '../../services/integrityService'

type ReadinessTone = 'ok' | 'warning' | 'danger'

type ReadinessItem = {
  title: string
  text: string
  done: boolean
  to: string
  tone?: ReadinessTone
}

function money(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₽`
}

function toneClass(tone: ReadinessTone, done: boolean): string {
  if (done) return 'border-[rgba(52,199,89,0.20)] bg-[#F0FAF3] text-[#188447]'
  if (tone === 'danger') return 'border-[rgba(255,59,48,0.20)] bg-[#FFF1F0] text-[#C92820]'
  return 'border-[rgba(10,132,255,0.22)] bg-[#EAF4FF] text-[#075EBC]'
}

export function AdminLaunchReadiness() {
  const school = db.schools.currentAdmin()
  if (!school) return null

  const basePath = getAdminBasePathForLocation()
  const now = new Date()
  const branches = db.branches.bySchool(school.id)
  const activeBranches = branches.filter((branch) => branch.isActive)
  const instructors = db.instructors.bySchool(school.id)
  const activeInstructors = instructors.filter((instructor) => instructor.isActive)
  const students = db.students.bySchool(school.id)
  const cars = adminCars.all(school.id)
  const activeCars = cars.filter((car) => car.status !== 'written_off')
  const slots = db.slots.bySchool(school.id)
  const bookings = db.bookings.bySchool(school.id)
  const activeFutureBookings = bookings.filter((booking) => {
    const slot = db.slots.byId(booking.slotId)
    return booking.status === 'active' && slot !== null && getSlotDateTime(slot) > now
  })
  const documents = adminDocuments.all(school.id)
  const payments = adminPayments.all(school.id)
  const internalExams = adminInternalExams.all(school.id)
  const gibddExams = adminGIBDDExams.all(school.id)
  const users = adminUsers.all(school.id)
  const studentRequests = loadStudentRequests(school.id)
  const settings = adminSettings.get(school.id)
  const sevenDays = addDays(now, 7)
  const futureFreeSlots = slots.filter((slot) => slot.status === 'available' && getSlotDateTime(slot) > now)
  const weekFreeSlots = futureFreeSlots.filter((slot) => getSlotDateTime(slot) <= sevenDays)
  const overdueBookings = bookings.filter((booking) => {
    const slot = db.slots.byId(booking.slotId)
    return booking.status === 'active' && slot && getSlotDateTime(slot) < now
  })
  const debtStudents = students.filter((student) => getDebtForStudent(student.id) > 0)
  const totalDebt = debtStudents.reduce((sum, student) => sum + getDebtForStudent(student.id), 0)
  const missingDocuments = documents.filter((doc) => doc.status === 'missing' || doc.status === 'rejected' || doc.status === 'expired')
  const docsExpiringSoon = adminDocuments.expiringSoon(school.id, settings.documentExpiryWarningDays ?? 14)
  const pendingStudentRequests = studentRequests.filter((request) => request.status === 'new' || request.status === 'reviewing')
  const todayDate = now.toISOString().slice(0, 10)
  const freeSlotsToday = futureFreeSlots.filter((slot) => slot.date === todayDate)
  const lowWeekSlots = activeInstructors.length > 0 && weekFreeSlots.length < Math.max(10, activeInstructors.length * 5)
  const idleInstructors = activeInstructors.filter((instructor) => !slots.some((slot) => slot.instructorId === instructor.id && getSlotDateTime(slot) > now && getSlotDateTime(slot) <= sevenDays))
  const studentsWithoutInstructor = students.filter((student) => !student.assignedInstructorId)
  const studentsWithoutAccess = students.filter((student) => !student.hasPassword)
  const accessLooksActive = school.isActive !== false && school.accessStatus !== 'blocked' && school.accessStatus !== 'overdue'
  const studentsWithoutFutureBooking = students.filter((student) => !bookings.some((booking) => {
    const slot = db.slots.byId(booking.slotId)
    return booking.studentId === student.id && booking.status === 'active' && slot !== null && getSlotDateTime(slot) > now
  }))
  const studentsWithoutProgress = students.filter((student) => !studentProgress.get(student.id))
  const studentsWithPracticePlan = students.filter((student) => (studentProgress.get(student.id)?.drivingHoursTotal ?? 0) > 0)
  const studentsPracticeDoneNoInternal = students.filter((student) => {
    const progress = studentProgress.get(student.id)
    if (!progress) return false
    return (progress.confirmedHours ?? 0) >= (progress.drivingHoursTotal ?? 56) && !progress.internalExamPassed && !internalExams.some((exam) => exam.studentId === student.id && exam.status === 'passed')
  })
  const studentsInternalPassedNoGibdd = students.filter((student) => {
    const progress = studentProgress.get(student.id)
    const internalPassed = progress?.internalExamPassed || internalExams.some((exam) => exam.studentId === student.id && exam.status === 'passed')
    const gibddPassed = gibddExams.some((exam) => exam.studentId === student.id && exam.status === 'passed')
    return internalPassed && !gibddPassed
  })
  const partialPayments = payments.filter((payment) => payment.status === 'partial' || payment.status === 'overdue' || payment.status === 'unpaid')
  const hasDocumentTemplates = documents.some((document) => document.type === 'contract') || students.length === 0
  const hasRoleCoverage = ['director', 'admin'].every((role) => users.some((user) => user.role === role && user.isActive))
  const requiredDocumentsConfigured = settings.requiredDocuments.length >= 3
  const integrityIssues = validateDataIntegrity(school.id)

  const items: ReadinessItem[] = [
    { title: 'Данные школы', text: school.name && school.phone ? 'Название и телефон заполнены' : 'Заполните название и телефон школы', done: Boolean(school.name && school.phone), to: `${basePath}/settings` },
    { title: 'Филиалы', text: activeBranches.length ? `${activeBranches.length} активных филиалов` : 'Добавьте хотя бы один активный филиал', done: activeBranches.length > 0, to: `${basePath}/branches` },
    { title: 'Инструкторы', text: activeInstructors.length ? `${activeInstructors.length} инструкторов в работе` : 'Добавьте инструкторов, иначе расписание не стартует', done: activeInstructors.length > 0, to: `${basePath}/instructors` },
    { title: 'Машины', text: activeCars.length ? `${activeCars.length} машин в учете` : 'Добавьте хотя бы одну учебную машину, если ведете автопарк', done: activeCars.length > 0, to: `${basePath}/cars`, tone: 'warning' },
    { title: 'Ученики', text: students.length ? `${students.length} учеников в базе` : 'Загрузите учеников или добавьте первого вручную', done: students.length > 0, to: `${basePath}/students` },
    { title: 'Свободные окна', text: weekFreeSlots.length ? `${weekFreeSlots.length} окон на ближайшие 7 дней` : 'Откройте время в расписании на неделю', done: weekFreeSlots.length > 0 && !lowWeekSlots, to: `${basePath}/schedule`, tone: lowWeekSlots ? 'warning' : 'ok' },
    { title: 'Тестовая запись', text: activeFutureBookings.length ? 'Есть будущая активная запись' : 'Сделайте тестовую запись ученика на будущее время', done: activeFutureBookings.length > 0, to: `${basePath}/schedule`, tone: 'warning' },
    { title: 'Доступ учеников', text: studentsWithoutAccess.length ? `${studentsWithoutAccess.length} учеников без пароля` : 'Ученикам можно выдать личные кабинеты', done: students.length > 0 && studentsWithoutAccess.length === 0, to: `${basePath}/students`, tone: 'warning' },
    { title: 'Доступ школы', text: accessLooksActive ? 'Кабинет школы доступен' : 'Доступ школы просрочен или заблокирован', done: accessLooksActive, to: `${basePath}/launch`, tone: accessLooksActive ? 'ok' : 'danger' },
    { title: 'Оплаты', text: debtStudents.length ? `${debtStudents.length} учеников с задолженностью на ${money(totalDebt)}` : 'Задолженностей не видно', done: debtStudents.length === 0, to: `${basePath}/payments`, tone: debtStudents.length ? 'danger' : 'ok' },
    { title: 'Документы', text: missingDocuments.length ? `${missingDocuments.length} документов требуют внимания` : docsExpiringSoon.length ? `${docsExpiringSoon.length} документов скоро истекают` : 'Документы без красных флагов', done: missingDocuments.length === 0 && docsExpiringSoon.length === 0, to: `${basePath}/documents`, tone: missingDocuments.length ? 'warning' : docsExpiringSoon.length ? 'warning' : 'ok' },
    { title: 'Запросы учеников', text: pendingStudentRequests.length ? `${pendingStudentRequests.length} запросов в очереди` : 'Новых запросов нет', done: pendingStudentRequests.length === 0, to: `${basePath}/students`, tone: pendingStudentRequests.length ? 'warning' : 'ok' },
    { title: 'Прошедшие занятия', text: overdueBookings.length ? `${overdueBookings.length} занятий не закрыты` : 'Прошедшие занятия закрыты', done: overdueBookings.length === 0, to: `${basePath}/schedule`, tone: overdueBookings.length ? 'danger' : 'ok' },
    { title: 'Настройки', text: settings.blockBookingOnDebt ? 'Запись при задолженности блокируется' : 'Проверьте правило записи при задолженности', done: settings.blockBookingOnDebt, to: `${basePath}/settings`, tone: 'warning' },
    { title: 'Связи данных', text: integrityIssues.length ? `${integrityIssues.length} проблем связей` : 'Связи данных выглядят нормально', done: integrityIssues.length === 0, to: `${basePath}/reports`, tone: integrityIssues.length ? 'danger' : 'ok' },
    { title: 'Учет практики', text: studentsWithoutProgress.length ? `${studentsWithoutProgress.length} учеников без плана часов` : `${studentsWithPracticePlan.length} учеников с планом практики`, done: students.length > 0 && studentsWithoutProgress.length === 0, to: `${basePath}/students`, tone: studentsWithoutProgress.length ? 'warning' : 'ok' },
    { title: 'Допуск к экзаменам', text: studentsPracticeDoneNoInternal.length ? `${studentsPracticeDoneNoInternal.length} завершили практику без внутреннего` : 'Практика связана с внутренним экзаменом', done: studentsPracticeDoneNoInternal.length === 0, to: `${basePath}/exams`, tone: studentsPracticeDoneNoInternal.length ? 'danger' : 'ok' },
    { title: 'Экзамены ГИБДД', text: studentsInternalPassedNoGibdd.length ? `${studentsInternalPassedNoGibdd.length} после внутреннего без ГИБДД` : 'После внутреннего не теряем следующий шаг', done: studentsInternalPassedNoGibdd.length === 0, to: `${basePath}/exams`, tone: studentsInternalPassedNoGibdd.length ? 'warning' : 'ok' },
    { title: 'Частичные оплаты', text: partialPayments.length ? `${partialPayments.length} оплат требуют контроля` : 'Частичные оплаты и просрочки закрыты', done: partialPayments.length === 0, to: `${basePath}/payments`, tone: partialPayments.length ? 'warning' : 'ok' },
    { title: 'Пакет документов', text: hasDocumentTemplates ? 'Договор и печатные формы доступны' : 'Добавьте договор или сформируйте пакет документов', done: hasDocumentTemplates, to: `${basePath}/documents`, tone: hasDocumentTemplates ? 'ok' : 'warning' },
    { title: 'Правила документов', text: requiredDocumentsConfigured ? `${settings.requiredDocuments.length} обязательных документов настроено` : 'Настройте обязательный пакет документов', done: requiredDocumentsConfigured, to: `${basePath}/settings`, tone: requiredDocumentsConfigured ? 'ok' : 'warning' },
    { title: 'Роли сотрудников', text: hasRoleCoverage ? 'Есть директор и администратор' : 'Нужны минимум директор и администратор', done: hasRoleCoverage, to: `${basePath}/users`, tone: hasRoleCoverage ? 'ok' : 'danger' },
  ]

  const doneCount = items.filter((item) => item.done).length
  const readiness = Math.round((doneCount / items.length) * 100)
  const blockers = items.filter((item) => !item.done && item.tone === 'danger')
  const nextItems = items.filter((item) => !item.done).slice(0, 4)
  function exportLaunchChecklistCsv() {
    const rows = [
      ['Пункт', 'Статус', 'Что видно', 'Раздел'],
      ...items.map((item) => [item.title, item.done ? 'готово' : 'нужно сделать', item.text, item.to]),
      ['Готовность', `${readiness}%`, `${doneCount} из ${items.length}`, ''],
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `vroom-launch-checklist-${school.slug}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const directorQueueItems = [
    debtStudents.length ? { label: 'Проверить оплаты', text: `${debtStudents.length} учеников, задолженность ${money(totalDebt)}`, to: `${basePath}/payments`, danger: true } : null,
    studentsWithoutInstructor.length ? { label: 'Назначить инструкторов', text: `${studentsWithoutInstructor.length} учеников без инструктора`, to: `${basePath}/students`, danger: false } : null,
    studentsWithoutAccess.length ? { label: 'Выдать доступ ученикам', text: `${studentsWithoutAccess.length} учеников без личного кабинета`, to: `${basePath}/students`, danger: false } : null,
    studentsWithoutFutureBooking.length ? { label: 'Проверить записи учеников', text: `${studentsWithoutFutureBooking.length} учеников без будущей записи`, to: `${basePath}/students`, danger: false } : null,
    studentsWithoutProgress.length ? { label: 'Заполнить практику', text: `${studentsWithoutProgress.length} учеников без плана часов`, to: `${basePath}/students`, danger: false } : null,
    studentsPracticeDoneNoInternal.length ? { label: 'Назначить внутренний', text: `${studentsPracticeDoneNoInternal.length} учеников закрыли практику`, to: `${basePath}/exams`, danger: true } : null,
    studentsInternalPassedNoGibdd.length ? { label: 'Проверить этап ГИБДД', text: `${studentsInternalPassedNoGibdd.length} учеников ждут следующий шаг`, to: `${basePath}/exams`, danger: false } : null,
    overdueBookings.length ? { label: 'Отметить прошедшие занятия', text: `${overdueBookings.length} занятий не отмечены`, to: `${basePath}/schedule`, danger: true } : null,
    freeSlotsToday.length ? { label: 'Свободные окна сегодня', text: `${freeSlotsToday.length} свободных окон можно заполнить`, to: `${basePath}/schedule`, danger: false } : null,
    pendingStudentRequests.length ? { label: 'Ответить ученикам', text: `${pendingStudentRequests.length} запросов в очереди`, to: `${basePath}/students`, danger: false } : null,
    docsExpiringSoon.length ? { label: 'Проверить документы', text: `${docsExpiringSoon.length} документов скоро истекают`, to: `${basePath}/documents`, danger: false } : null,
    idleInstructors.length ? { label: 'Проверить загрузку инструкторов', text: `${idleInstructors.length} без окон на неделе`, to: `${basePath}/schedule`, danger: false } : null,
  ].filter(Boolean)

  return (
    <div className="v-admin-workspace">
      <section className="v-admin-panel overflow-hidden p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="v-route-pill bg-[#EAF4FF] text-[#075EBC]">Запуск школы</p>
            <h1 className="mt-4 text-[32px] font-semibold leading-none text-[#111827] md:text-[44px]">Готовность к работе</h1>
            <p className="mt-3 max-w-3xl text-[15px] font-medium leading-6 text-[#667085]">Экран показывает, может ли автошкола уже вести учеников и расписание через vroom, или что ещё мешает запуску.</p>
          </div>
          <div className="rounded-[28px] border border-[#D7E2EC] bg-[#F8FBFE] p-5 text-center lg:min-w-[220px]">
            <p className="text-[13px] font-black uppercase tracking-[0.08em] text-[#667085]">Готовность</p>
            <strong className={`mt-2 block text-[52px] font-black leading-none ${readiness >= 85 ? 'text-[#188447]' : readiness >= 60 ? 'text-[#075EBC]' : 'text-[#C92820]'}`}>{readiness}%</strong>
            <p className="mt-2 text-[13px] font-bold text-[#667085]">{doneCount} из {items.length} пунктов</p>
            <button type="button" onClick={exportLaunchChecklistCsv} className="mt-4 min-h-10 w-full rounded-xl border border-[#D7DEE8] bg-white px-4 py-2 text-[13px] font-black text-[#334155] transition hover:bg-[#F1F5F9]">Выгрузить чеклист</button>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="v-admin-panel p-4">
          <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#667085]">Красные блокеры</p>
          <strong className="mt-2 block text-[30px] font-black text-[#C92820]">{blockers.length}</strong>
          <p className="mt-1 text-[13px] font-bold text-[#667085]">То, что может сорвать запуск школы.</p>
        </div>
        <div className="v-admin-panel p-4">
          <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#667085]">Свободные окна</p>
          <strong className="mt-2 block text-[30px] font-black text-[#188447]">{weekFreeSlots.length}</strong>
          <p className="mt-1 text-[13px] font-bold text-[#667085]">На ближайшие 7 дней.</p>
        </div>
        <div className="v-admin-panel p-4">
          <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#667085]">Ученики без записи</p>
          <strong className="mt-2 block text-[30px] font-black text-[#075EBC]">{studentsWithoutFutureBooking.length}</strong>
          <p className="mt-1 text-[13px] font-bold text-[#667085]">Их можно вернуть в расписание.</p>
        </div>
      </section>

      {nextItems.length ? (
        <section className="mt-4 v-admin-panel p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-semibold text-[#111827]">Ближайшие настройки</h2>
              <p className="mt-1 text-[13px] font-bold text-[#667085]">Пункты, которые ещё не закрыты для стабильной работы.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {nextItems.map((item) => (
              <Link key={item.title} to={item.to} className={`rounded-[18px] border p-4 transition hover:-translate-y-0.5 ${toneClass(item.tone ?? 'warning', false)}`}>
                <WarningTriangle width={20} height={20} />
                <strong className="mt-3 block text-[15px] font-black text-[#111827]">{item.title}</strong>
                <span className="mt-1 block text-[13px] font-bold leading-5 text-[#667085]">{item.text}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link key={item.title} to={item.to} className={`min-h-[150px] rounded-[22px] border p-4 transition hover:-translate-y-0.5 ${toneClass(item.tone ?? 'warning', item.done)}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/80">
                {item.done ? <CheckCircle width={21} height={21} /> : <WarningTriangle width={21} height={21} />}
              </span>
              <ChevronRight width={18} height={18} />
            </div>
            <strong className="mt-4 block text-[17px] font-black text-[#111827]">{item.title}</strong>
            <span className="mt-2 block text-[13px] font-bold leading-5 text-[#667085]">{item.text}</span>
          </Link>
        ))}
      </section>

      <section className="mt-4 v-admin-panel p-4 md:p-5">
        <h2 className="text-[20px] font-semibold text-[#111827]">Рабочие вопросы</h2><span className="sr-only">Рабочая очередь директора</span>
        <p className="mt-1 text-[13px] font-bold text-[#667085]">Список процессов, которые требуют проверки.</p>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {directorQueueItems.length === 0 ? (
            <div className="rounded-[18px] border border-[rgba(52,199,89,0.20)] bg-[#F0FAF3] p-4 lg:col-span-2">
              <strong className="block text-[15px] font-black text-[#111827]">Проверки без замечаний</strong>
              <span className="mt-1 block text-[13px] font-bold text-[#667085]">Можно выдавать доступ, показывать расписание ученикам и работать по обычному циклу.</span>
            </div>
          ) : directorQueueItems.map((item) => (
            <Link key={item!.label} to={item!.to} className={`rounded-[18px] border p-4 ${item!.danger ? 'border-[rgba(255,59,48,0.20)] bg-[#FFF1F0]' : 'border-[#D7E2EC] bg-[#F8FBFE]'}`}>
              <strong className="block text-[15px] font-black text-[#111827]">{item!.label}</strong>
              <span className="mt-1 block text-[13px] font-bold text-[#667085]">{item!.text}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
