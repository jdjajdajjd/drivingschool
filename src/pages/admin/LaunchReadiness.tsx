import { addDays } from 'date-fns'
import { NavArrowRight as ChevronRight, CheckCircle, WarningTriangle } from 'iconoir-react'
import { Link } from 'react-router-dom'
import { db } from '../../services/storage'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { adminDocuments, adminSettings, getDebtForStudent } from '../../services/adminStorage'
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
  const branches = db.branches.bySchool(school.id)
  const activeBranches = branches.filter((branch) => branch.isActive)
  const instructors = db.instructors.bySchool(school.id)
  const activeInstructors = instructors.filter((instructor) => instructor.isActive)
  const students = db.students.bySchool(school.id)
  const slots = db.slots.bySchool(school.id)
  const bookings = db.bookings.bySchool(school.id)
  const documents = adminDocuments.all(school.id)
  const settings = adminSettings.get(school.id)
  const now = new Date()
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
  const studentsWithoutInstructor = students.filter((student) => !student.assignedInstructorId)
  const studentsWithoutFutureBooking = students.filter((student) => !bookings.some((booking) => {
    const slot = db.slots.byId(booking.slotId)
    return booking.studentId === student.id && booking.status === 'active' && slot !== null && getSlotDateTime(slot) > now
  }))
  const integrityIssues = validateDataIntegrity(school.id)

  const items: ReadinessItem[] = [
    { title: 'Данные школы', text: school.name && school.phone ? 'Название и телефон заполнены' : 'Заполните название и телефон школы', done: Boolean(school.name && school.phone), to: `${basePath}/settings` },
    { title: 'Филиалы', text: activeBranches.length ? `${activeBranches.length} активных филиалов` : 'Добавьте хотя бы один активный филиал', done: activeBranches.length > 0, to: `${basePath}/branches` },
    { title: 'Инструкторы', text: activeInstructors.length ? `${activeInstructors.length} инструкторов в работе` : 'Добавьте инструкторов, иначе расписание не стартует', done: activeInstructors.length > 0, to: `${basePath}/instructors` },
    { title: 'Ученики', text: students.length ? `${students.length} учеников в базе` : 'Загрузите учеников или добавьте первого вручную', done: students.length > 0, to: `${basePath}/students` },
    { title: 'Свободные окна', text: weekFreeSlots.length ? `${weekFreeSlots.length} окон на ближайшие 7 дней` : 'Откройте время в расписании на неделю', done: weekFreeSlots.length > 0, to: `${basePath}/schedule` },
    { title: 'Тестовая запись', text: bookings.length ? 'Записи уже есть' : 'Сделайте тестовую запись ученика', done: bookings.length > 0, to: `${basePath}/schedule`, tone: 'warning' },
    { title: 'Долги', text: debtStudents.length ? `${debtStudents.length} учеников должны ${money(totalDebt)}` : 'Критичных долгов не видно', done: debtStudents.length === 0, to: `${basePath}/payments`, tone: debtStudents.length ? 'danger' : 'ok' },
    { title: 'Документы', text: missingDocuments.length ? `${missingDocuments.length} документов требуют внимания` : 'Документы без красных флагов', done: missingDocuments.length === 0, to: `${basePath}/documents`, tone: missingDocuments.length ? 'warning' : 'ok' },
    { title: 'Прошедшие занятия', text: overdueBookings.length ? `${overdueBookings.length} занятий не закрыты` : 'Прошедшие занятия закрыты', done: overdueBookings.length === 0, to: `${basePath}/schedule`, tone: overdueBookings.length ? 'danger' : 'ok' },
    { title: 'Настройки записи', text: settings.blockBookingOnDebt ? 'Запись при долге блокируется' : 'Проверьте правило записи при долге', done: settings.blockBookingOnDebt, to: `${basePath}/settings`, tone: 'warning' },
    { title: 'Связи данных', text: integrityIssues.length ? `${integrityIssues.length} проблем связей` : 'Связи данных выглядят нормально', done: integrityIssues.length === 0, to: `${basePath}/reports`, tone: integrityIssues.length ? 'danger' : 'ok' },
  ]

  const doneCount = items.filter((item) => item.done).length
  const readiness = Math.round((doneCount / items.length) * 100)
  const blockers = items.filter((item) => !item.done && item.tone === 'danger')
  const nextItems = items.filter((item) => !item.done).slice(0, 4)
  const directorQueueItems = [
    debtStudents.length ? { label: 'Разобрать долги', text: `${debtStudents.length} учеников, сумма ${money(totalDebt)}`, to: `${basePath}/payments`, danger: true } : null,
    studentsWithoutInstructor.length ? { label: 'Назначить инструкторов', text: `${studentsWithoutInstructor.length} учеников без инструктора`, to: `${basePath}/students`, danger: false } : null,
    studentsWithoutFutureBooking.length ? { label: 'Вернуть учеников в график', text: `${studentsWithoutFutureBooking.length} учеников без будущей записи`, to: `${basePath}/students`, danger: false } : null,
    overdueBookings.length ? { label: 'Закрыть прошедшие занятия', text: `${overdueBookings.length} занятий не отмечены`, to: `${basePath}/schedule`, danger: true } : null,
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
              <h2 className="text-[20px] font-semibold text-[#111827]">Что сделать следующим</h2>
              <p className="mt-1 text-[13px] font-bold text-[#667085]">Короткий маршрут до рабочего состояния школы.</p>
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
        <h2 className="text-[20px] font-semibold text-[#111827]">Рабочая очередь директора</h2>
        <p className="mt-1 text-[13px] font-bold text-[#667085]">Не статистика ради статистики, а список того, что надо разобрать в первую очередь.</p>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {directorQueueItems.length === 0 ? (
            <div className="rounded-[18px] border border-[rgba(52,199,89,0.20)] bg-[#F0FAF3] p-4 lg:col-span-2">
              <strong className="block text-[15px] font-black text-[#111827]">Критичных задач нет</strong>
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
