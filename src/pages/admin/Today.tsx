import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDays, format, isBefore, isSameDay, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { WarningTriangle as AlertTriangle, CalendarPlus, Clock, OpenNewWindow as ExternalLink, Filter, CreditCards } from 'iconoir-react'
const Clock3 = Clock
const SlidersHorizontal = Filter
const WalletCards = CreditCards
import { Modal } from '../../components/ui/Modal'
import { db } from '../../services/storage'
import { adminCars, adminDocuments, adminInternalExams, adminPayments, problemCases } from '../../services/adminStorage'
import { loadStudentRequests, refreshStudentRequestsFromSupabase } from '../../services/studentProfile'
import { getSlotDateTime } from '../../services/bookingService'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { formatDuration } from '../../lib/utils'
import {
  ADMIN_DASHBOARD_BLOCKS,
  getEnabledDashboardBlockIds,
  saveEnabledDashboardBlockIds,
  type AdminDashboardBlockId,
} from '../../services/adminPanelPreferences'

const TODAY_BLOCK_IDS: AdminDashboardBlockId[] = ['finance', 'stats', 'launchChecklist', 'attention', 'quickActions']
const TODAY_BLOCKS = ADMIN_DASHBOARD_BLOCKS.filter((block) => TODAY_BLOCK_IDS.includes(block.id))

function money(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`
}

function plural(value: number, one: string, few: string, many: string) {
  const mod10 = Math.abs(value) % 10
  const mod100 = Math.abs(value) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function useTodayData(schoolId: string, version = 0) {
  return useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const slots = db.slots.bySchool(schoolId)
    const bookings = db.bookings.bySchool(schoolId)
    const instructors = db.instructors.bySchool(schoolId)
    const students = db.students.bySchool(schoolId)
    const branches = db.branches.bySchool(schoolId)
    const payments = adminPayments.all(schoolId)
    const studentRequests = loadStudentRequests(schoolId)

    const todaySlots = slots.filter((slot) => slot.date === today)
    const availableFutureSlots = slots.filter((slot) => slot.status === 'available' && getSlotDateTime(slot) > now).length
    const activeInstructors = instructors.filter((instructor) => instructor.isActive).length
    const todayBookings = bookings
      .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
      .filter((entry) => entry.slot && isSameDay(getSlotDateTime(entry.slot), now))

    const activeToday = todayBookings.filter((entry) => entry.booking.status === 'active')
    const upcoming = bookings
      .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
      .filter((entry): entry is { booking: typeof bookings[number]; slot: NonNullable<ReturnType<typeof db.slots.byId>> } =>
        Boolean(entry.slot && entry.booking.status === 'active' && getSlotDateTime(entry.slot) > now),
      )
      .sort((left, right) => getSlotDateTime(left.slot).getTime() - getSlotDateTime(right.slot).getTime())
      .slice(0, 7)

    const debtStudents = new Set<string>()
    payments.forEach((payment) => {
      if ((payment.status === 'overdue' || payment.status === 'partial' || payment.status === 'unpaid') && payment.remainingAmount > 0) {
        debtStudents.add(payment.studentId)
      }
    })

    const overdueAmount = payments.reduce((sum, payment) => {
      if (payment.status === 'overdue' || payment.status === 'partial' || payment.status === 'unpaid') return sum + payment.remainingAmount
      return sum
    }, 0)
    const paidToday = payments
      .filter((payment) => payment.paidAt && isSameDay(new Date(payment.paidAt), now))
      .reduce((sum, payment) => sum + payment.paidAmount, 0)
    const studentNextBookings = new Map<string, Date>()
    bookings
      .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
      .filter((entry): entry is { booking: typeof bookings[number]; slot: NonNullable<ReturnType<typeof db.slots.byId>> } => Boolean(entry.slot && entry.booking.status === 'active' && getSlotDateTime(entry.slot) > now))
      .sort((left, right) => getSlotDateTime(left.slot).getTime() - getSlotDateTime(right.slot).getTime())
      .forEach((entry) => {
        const studentId = entry.booking.studentId
        if (studentId && !studentNextBookings.has(studentId)) studentNextBookings.set(studentId, getSlotDateTime(entry.slot))
      })

    const debtQueue = students
      .map((student) => {
        const debt = payments.filter((payment) => payment.studentId === student.id && ['overdue', 'partial', 'unpaid', 'disputed'].includes(payment.status) && payment.remainingAmount > 0).reduce((sum, payment) => sum + payment.remainingAmount, 0)
        const nextBooking = bookings
          .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
          .filter((entry) => entry.booking.studentId === student.id && entry.booking.status === 'active' && entry.slot && getSlotDateTime(entry.slot) > now)
          .sort((left, right) => getSlotDateTime(left.slot!).getTime() - getSlotDateTime(right.slot!).getTime())[0]
        return { student, debt, nextBooking }
      })
      .filter((entry) => entry.debt > 0)
      .sort((left, right) => right.debt - left.debt)
      .slice(0, 5)

    const studentsWithoutInstructor = students.filter((student) => !student.assignedInstructorId).length
    const studentsWithoutNextBooking = students.filter((student) => !studentNextBookings.has(student.id) && !['archived', 'refused', 'completed', 'training_completed'].includes(student.trainingStage ?? '')).length
    const requiredDocuments = ['contract', 'medical_certificate']
    const studentsWithMissingDocs = students.filter((student) => requiredDocuments.some((type) => {
      const doc = adminDocuments.byType(student.id, type as 'contract' | 'medical_certificate')
      return !doc || ['missing', 'rejected', 'expired', 'required'].includes(doc.status)
    })).length

    const overdueBookings = bookings.filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return Boolean(slot && booking.status === 'active' && isBefore(getSlotDateTime(slot), startOfDay(now)))
    }).length

    const instructorLoads = instructors.filter((instructor) => instructor.isActive).map((instructor) => {
      const ownSlots = todaySlots.filter((slot) => slot.instructorId === instructor.id)
      const booked = ownSlots.filter((slot) => slot.status === 'booked').length
      return { instructor, booked, total: ownSlots.length }
    })

    const next7Days = addDays(now, 7)
    const examsSoon = adminInternalExams.all(schoolId).filter((exam) => {
      if (!exam.scheduledDate || exam.status !== 'scheduled') return false
      const date = new Date(exam.scheduledDate)
      return date >= now && date <= next7Days
    }).length

    return {
      slots,
      bookings,
      instructors,
      activeInstructors,
      students,
      branches,
      todaySlots,
      availableFutureSlots,
      activeToday,
      upcoming,
      freeSlotsToday: todaySlots.filter((slot) => slot.status === 'available').length,
      cancelledToday: todayBookings.filter((entry) => entry.booking.status === 'cancelled').length,
      noShowsToday: todayBookings.filter((entry) => entry.booking.status === 'no_show').length,
      debtStudentsCount: debtStudents.size,
      overdueAmount,
      paidToday,
      overdueBookings,
      carsInRepair: adminCars.all(schoolId).filter((car) => car.status === 'repair' || car.status === 'maintenance').length,
      docsExpiring: adminDocuments.expiringSoon(schoolId, 14).length,
      openProblems: problemCases.open(schoolId).length,
      examsSoon,
      openStudentRequests: studentRequests.filter((request) => request.status === 'new' || request.status === 'reviewing').length,
      studentsWithoutInstructor,
      studentsWithoutNextBooking,
      studentsWithMissingDocs,
      studentRequests: studentRequests.filter((request) => request.status === 'new' || request.status === 'reviewing').slice(0, 5),
      debtQueue,
      idleInstructors: instructorLoads.filter((load) => load.total > 0 && load.booked === 0).length,
      busyInstructors: instructorLoads.filter((load) => load.booked >= 5).length,
    }
  }, [schoolId, version])
}

function PriorityCard({ title, text, tone, to }: { title: string; text: string; tone: 'danger' | 'warning' | 'info'; to: string }) {
  const iconClass = tone === 'danger' ? 'text-[#FF3B30]' : tone === 'warning' ? 'text-[#315A7C]' : 'text-[#0A84FF]'
  return (
    <Link to={to} className="flex items-start gap-3 rounded-[20px] border border-[rgba(15,23,42,0.07)] bg-[#F9FAFB] p-4 transition hover:border-[rgba(15,23,42,0.14)] hover:bg-white">
      <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold leading-5 text-[#111827]">{title}</span>
        <span className="mt-1 block text-[13px] font-medium leading-5 text-[#667085]">{text}</span>
      </span>
    </Link>
  )
}

function TodayMetric({ label, value, tone = 'muted', to }: { label: string; value: string | number; tone?: 'blue' | 'green' | 'red' | 'amber' | 'muted'; to: string }) {
  const toneClass = {
    blue: 'bg-[#EAF4FF] text-[#075EBC]',
    green: 'bg-[rgba(52,199,89,0.12)] text-[#1F8F3F]',
    red: 'bg-[rgba(255,59,48,0.10)] text-[#C92820]',
    amber: 'bg-[rgba(10,132,255,0.16)] text-[#315A7C]',
    muted: 'bg-[#F2F4F7] text-[#667085]',
  }[tone]
  return (
    <Link to={to} className={`vroom-kpi-card is-${tone} v-admin-panel group grid min-h-[112px] content-between p-4 transition hover:-translate-y-0.5 hover:border-[rgba(10,132,255,0.20)]`}>
      <span className={`v-route-pill w-max ${toneClass}`}>{label}</span>
      <strong className="mt-4 text-[34px] font-semibold leading-none text-[#111827] tabular-nums">{value}</strong>
    </Link>
  )
}

function LaunchChecklist({
  schoolName,
  schoolPhone,
  branchCount,
  instructorCount,
  availableFutureSlots,
  studentCount,
}: {
  schoolName: string
  schoolPhone: string
  branchCount: number
  instructorCount: number
  availableFutureSlots: number
  studentCount: number
}) {
  const items = [
    {
      title: 'Данные школы',
      text: schoolName && schoolPhone ? 'Название и телефон заполнены' : 'Заполните название и телефон школы',
      done: Boolean(schoolName && schoolPhone),
      to: `${getAdminBasePathForLocation()}/settings`,
    },
    {
      title: 'Филиалы',
      text: branchCount > 0 ? `${branchCount} филиалов добавлено` : 'Добавьте хотя бы один филиал',
      done: branchCount > 0,
      to: `${getAdminBasePathForLocation()}/branches`,
    },
    {
      title: 'Инструкторы',
      text: instructorCount > 0 ? `${instructorCount} инструкторов в работе` : 'Добавьте инструкторов',
      done: instructorCount > 0,
      to: `${getAdminBasePathForLocation()}/instructors`,
    },
    {
      title: 'Свободное время',
      text: availableFutureSlots > 0 ? `${availableFutureSlots} вариантов доступно ученикам` : 'Создайте время для занятий',
      done: availableFutureSlots > 0,
      to: `${getAdminBasePathForLocation()}/schedule`,
    },
    {
      title: 'Ученики',
      text: studentCount > 0 ? `${studentCount} учеников в базе` : 'Добавьте первого ученика или отправьте ссылку на вход',
      done: studentCount > 0,
      to: `${getAdminBasePathForLocation()}/students`,
    },
  ]
  const doneCount = items.filter((item) => item.done).length
  const isReady = doneCount === items.length
  const nextItem = items.find((item) => !item.done)
  if (isReady) return null

  return (
    <section className="v-admin-panel v-launch-compact mt-4 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="v-admin-pill v-tone-warning">Настройка школы {doneCount}/{items.length}</span>
          <h2 className="mt-3 text-[20px] font-semibold text-[#111827]">Проверка перед работой</h2>
          <p className="mt-1 max-w-2xl text-[13px] font-medium leading-5 text-[#667085]">Проверяются базовые данные, сотрудники, расписание и ученики для корректной работы кабинета.</p>
        </div>
        {nextItem ? <Link to={nextItem.to} className="v-admin-button is-blue justify-center">Открыть: {nextItem.title}</Link> : null}
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-5">
        {items.map((item, index) => (
          <Link key={item.title} to={item.to} className={`rounded-[16px] border p-3 transition hover:-translate-y-0.5 ${item.done ? 'border-[rgba(52,199,89,0.18)] bg-[rgba(52,199,89,0.08)]' : nextItem?.title === item.title ? 'border-[rgba(10,132,255,0.24)] bg-[#EAF4FF]' : 'border-[#E5EAF1] bg-white'}`}>
            <span className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-black ${item.done ? 'bg-[#188447] text-white' : 'bg-white text-[#075EBC]'}`}>{item.done ? '✓' : index + 1}</span>
            <strong className="mt-3 block text-[13px] font-black text-[#111827]">{item.title}</strong>
            <span className="mt-1 line-clamp-2 block text-[12px] font-semibold leading-4 text-[#667085]">{item.text}</span>
          </Link>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Link to={`${getAdminBasePathForLocation()}/launch`} className="v-admin-button-tertiary justify-center">
          Полная проверка запуска
        </Link>
      </div>
    </section>
  )
}

export function AdminToday() {
  const school = db.schools.currentAdmin()
  const navigate = useNavigate()
  const [blockSettingsOpen, setBlockSettingsOpen] = useState(false)
  const [blocksVersion, setBlocksVersion] = useState(0)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    if (!school) return
    void refreshStudentRequestsFromSupabase(school.id)
      .then(() => setRequestVersion((value) => value + 1))
      .catch(() => undefined)
  }, [school?.id])

  const data = useTodayData(school?.id ?? '', requestVersion)

  if (!school) {
    return <div className="v-admin-empty m-4"><strong>Школа не найдена</strong><span>Проверьте рабочее пространство.</span></div>
  }
  const enabledBlocks = getEnabledDashboardBlockIds(school.id)
  const hasBlock = (id: AdminDashboardBlockId) => enabledBlocks.includes(id)
  void blocksVersion
  const priorities = [
    data.overdueBookings > 0 ? { title: 'Отметить прошедшие занятия', text: `${data.overdueBookings} занятий уже прошли, но не отмечены`, tone: 'danger' as const, to: `${getAdminBasePathForLocation()}/schedule` } : null,
    data.debtStudentsCount > 0 ? { title: 'Ученики с задолженностью', text: `${data.debtStudentsCount} ${plural(data.debtStudentsCount, 'ученик', 'ученика', 'учеников')}, сумма ${money(data.overdueAmount)}`, tone: 'danger' as const, to: `${getAdminBasePathForLocation()}/payments` } : null,
    data.openProblems > 0 ? { title: 'Открытые проблемы', text: `${data.openProblems} ${plural(data.openProblems, 'ситуация', 'ситуации', 'ситуаций')} в работе`, tone: 'warning' as const, to: `${getAdminBasePathForLocation()}/reports` } : null,
    data.carsInRepair > 0 ? { title: 'Машины недоступны', text: `${data.carsInRepair} ${plural(data.carsInRepair, 'машина', 'машины', 'машин')} в ремонте или обслуживании`, tone: 'warning' as const, to: `${getAdminBasePathForLocation()}/cars` } : null,
    data.docsExpiring > 0 ? { title: 'Документы скоро истекут', text: `${data.docsExpiring} документов проверить за 14 дней`, tone: 'info' as const, to: `${getAdminBasePathForLocation()}/documents` } : null,
    data.openStudentRequests > 0 ? { title: 'Запросы учеников', text: `${data.openStudentRequests} переносов или отмен в очереди`, tone: 'info' as const, to: `${getAdminBasePathForLocation()}/students` } : null,
    data.studentsWithoutInstructor > 0 ? { title: 'Ученики без инструктора', text: `${data.studentsWithoutInstructor} ${plural(data.studentsWithoutInstructor, 'ученик', 'ученика', 'учеников')} без закрепленного инструктора`, tone: 'warning' as const, to: `${getAdminBasePathForLocation()}/students` } : null,
    data.studentsWithoutNextBooking > 0 ? { title: 'Ученики без ближайшей записи', text: `${data.studentsWithoutNextBooking} ${plural(data.studentsWithoutNextBooking, 'ученик', 'ученика', 'учеников')} без будущей записи`, tone: 'warning' as const, to: `${getAdminBasePathForLocation()}/students` } : null,
    data.studentsWithMissingDocs > 0 ? { title: 'Документы к проверке', text: `${data.studentsWithMissingDocs} ${plural(data.studentsWithMissingDocs, 'ученик', 'ученика', 'учеников')} без договора или медсправки`, tone: 'danger' as const, to: `${getAdminBasePathForLocation()}/documents` } : null,
    data.availableFutureSlots < Math.max(6, data.activeInstructors * 2) ? { title: 'Мало свободных окон', text: `Открыто ${data.availableFutureSlots} будущих окон: ученикам сложнее записаться`, tone: 'warning' as const, to: `${getAdminBasePathForLocation()}/schedule` } : null,
  ].filter(Boolean)
  const freeSlots = data.todaySlots
    .filter((slot) => slot.status === 'available')
    .sort((left, right) => left.time.localeCompare(right.time))
    .slice(0, 8)
  return (
    <div className="v-admin-workspace vroom-admin-today">
      <section className="v-admin-panel vroom-command-hero overflow-hidden p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="v-route-pill bg-[#EAF4FF] text-[#075EBC]">Сегодня</p>
            <h1 className="mt-3 text-[30px] font-semibold leading-none text-[#111827] md:text-[42px]">
              {format(new Date(), 'EEEE, d MMMM', { locale: ru })}
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] font-medium leading-6 text-[#667085]">
              {data.activeToday.length ? `В расписании ${data.activeToday.length} активных занятий. Свободных окон сегодня: ${data.freeSlotsToday}.` : `Активных занятий сегодня нет. Свободных окон: ${data.freeSlotsToday}.`}
            </p>
          </div>
          <div className="v-toolbar-actions flex flex-wrap gap-2">
            <button className="v-admin-button is-blue" onClick={() => navigate(`${getAdminBasePathForLocation()}/schedule?create=slot`)}>
              <CalendarPlus width={16} height={16} />
              Создать окна
            </button>
            <button className="v-admin-button-tertiary" onClick={() => setBlockSettingsOpen(true)}>
              <SlidersHorizontal width={16} height={16} />
              Блоки
            </button>
          </div>
        </div>
      </section>

      <section className="v-today-metrics mt-4 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <TodayMetric label="занятий сегодня" value={data.activeToday.length} tone="blue" to={`${getAdminBasePathForLocation()}/schedule`} />
        <TodayMetric label="свободных окон" value={data.freeSlotsToday} tone="green" to={`${getAdminBasePathForLocation()}/schedule`} />
        <TodayMetric label="записей впереди" value={data.upcoming.length} tone="muted" to={`${getAdminBasePathForLocation()}/schedule`} />
        <TodayMetric label="в работе" value={data.openStudentRequests + data.debtStudentsCount} tone={data.openStudentRequests + data.debtStudentsCount ? 'red' : 'green'} to={`${getAdminBasePathForLocation()}/reports`} />
      </section>

      {hasBlock('launchChecklist') ? <LaunchChecklist
        schoolName={school.name}
        schoolPhone={school.phone}
        branchCount={data.branches.length}
        instructorCount={data.activeInstructors}
        availableFutureSlots={data.availableFutureSlots}
        studentCount={data.students.length}
      /> : null}



      {(hasBlock('attention') || hasBlock('quickActions')) ? <section className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  {hasBlock('attention') ? <div className="v-admin-panel p-4">
            <h2 className="text-[18px] font-semibold text-[#111315]">Операционные проверки</h2>
            <div className="mt-3 grid gap-2">
              {priorities.length ? priorities.map((item) => (
                <PriorityCard key={item!.title} {...item!} />
              )) : (
                <div className="rounded-[20px] bg-[#EAF6EE] p-4">
                  <strong className="block text-[15px] font-semibold text-[#111315]">Проверки без замечаний</strong>
                  <span className="mt-1 block text-[13px] font-medium text-[#247A4B]">По ключевым разделам замечаний нет.</span>
                </div>
              )}
            </div>
          </div> : null}

          {hasBlock('quickActions') ? <div className="v-admin-panel p-4">
            <h2 className="text-[18px] font-semibold text-[#111315]">Действия</h2>
            <div className="mt-3 grid gap-2">
              {[
                ['Записать ученика', `${getAdminBasePathForLocation()}/students`],
                ['Создать свободные окна', `${getAdminBasePathForLocation()}/schedule?create=slot`],
                ['Принять оплату', `${getAdminBasePathForLocation()}/payments`],
                ['Открыть страницу школы', `/school/${school.slug}`],
              ].map(([label, to]) => (
                <Link key={label} to={to} className="v-admin-button-secondary justify-start">
                  <Clock3 width={15} height={15} />
                  {label}
                </Link>
              ))}
            </div>
          </div> : null}
      </section> : null}

      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="v-admin-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[#111827]/[0.07] p-4">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">Расписание сегодня</h2>
              <p className="v-admin-note mt-1">Список занятий по времени</p>
            </div>
            <Link to={getAdminBasePathForLocation() + '/schedule'} className="v-admin-button-tertiary">
              Открыть
              <ExternalLink width={15} height={15} />
            </Link>
          </div>
          {data.activeToday.length === 0 ? (
            <div className="v-admin-empty m-4">
              <strong>Активных занятий сегодня нет</strong>
              <span>{data.freeSlotsToday ? 'Свободных окон сегодня: ' + data.freeSlotsToday + '.' : 'Свободных окон сегодня нет.'}</span>
            </div>
          ) : (
            <div className="divide-y divide-[#111827]/[0.06]">
              {data.activeToday
                .slice()
                .sort((left, right) => (left.slot?.time ?? '').localeCompare(right.slot?.time ?? ''))
                .slice(0, 8)
                .map(({ booking, slot }) => {
                  if (!slot) return null
                  const instructor = data.instructors.find((item) => item.id === booking.instructorId)
                  const branch = data.branches.find((item) => item.id === booking.branchId)
                  return (
                    <button key={booking.id} onClick={() => navigate(getAdminBasePathForLocation() + '/schedule')} className="grid w-full gap-2 p-4 text-left transition hover:bg-[#F8FAFC] sm:grid-cols-[80px_minmax(0,1fr)_150px] sm:items-center">
                      <span className="text-[18px] font-semibold tabular-nums text-[#111827]">{slot.time}</span>
                      <span className="min-w-0">
                        <strong className="block truncate text-[15px] font-semibold text-[#111827]">{booking.studentName}</strong>
                        <span className="mt-0.5 block truncate text-[12px] font-medium text-[#667085]">{instructor?.name ?? 'Инструктор'} · {branch?.name ?? 'Филиал'}</span>
                      </span>
                      <span className="flex flex-wrap gap-2 sm:justify-end">
                        <span className="v-route-pill">{formatDuration(slot.duration)}</span>
                        <span className="v-route-pill bg-[#EAF4FF] text-[#075EBC]">Открыть</span>
                      </span>
                    </button>
                  )
                })}
            </div>
          )}
          {freeSlots.length > 0 ? (
            <div className="border-t border-[#111827]/[0.07] bg-[#F8FAFC] px-4 py-3 text-[13px] font-medium text-[#667085]">
              Свободные окна сегодня: <span className="font-semibold text-[#111827]">{data.freeSlotsToday}</span>. Полный список открыт в расписании.
            </div>
          ) : null}
        </div>
        {hasBlock('finance') ? <aside className="v-admin-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">Оплаты</h2>
              <p className="v-admin-note mt-1">Поступления и задолженность</p>
            </div>
            <WalletCards className="h-6 w-6 text-[#34C759]" />
          </div>
          <div className="mt-5 grid gap-3">
            <div className="rounded-[22px] bg-[rgba(52,199,89,0.10)] p-4">
              <span className="text-[12px] font-medium text-[#1F8F3F]">Оплачено сегодня</span>
              <strong className="mt-1 block text-[28px] font-semibold leading-none text-[#111827]">{money(data.paidToday)}</strong>
            </div>
            <div className="rounded-[22px] bg-[rgba(255,59,48,0.08)] p-4">
              <span className="text-[12px] font-medium text-[#C92820]">Задолженность</span>
              <strong className="mt-1 block text-[28px] font-semibold leading-none text-[#111827]">{money(data.overdueAmount)}</strong>
            </div>
          </div>
        </aside> : null}
      </section>

      <TodayBlocksModal
        open={blockSettingsOpen}
        onClose={() => setBlockSettingsOpen(false)}
        schoolId={school.id}
        enabledIds={enabledBlocks}
        onSaved={() => setBlocksVersion((value) => value + 1)}
      />
    </div>
  )
}

function TodayBlocksModal({
  open,
  onClose,
  schoolId,
  enabledIds,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  schoolId: string
  enabledIds: AdminDashboardBlockId[]
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<AdminDashboardBlockId[]>(enabledIds.filter((id) => TODAY_BLOCK_IDS.includes(id)))

  const toggle = (id: AdminDashboardBlockId) => {
    setDraft((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const save = () => {
    saveEnabledDashboardBlockIds(schoolId, draft)
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Блоки главной" size="md">
      <div className="v-today-blocks-modal grid max-h-[min(64vh,560px)] gap-2 overflow-y-auto p-4">
        {TODAY_BLOCKS.map((block) => {
          const enabled = draft.includes(block.id)
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => toggle(block.id)}
              className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[20px] border p-4 text-left transition ${enabled ? 'border-[#0A84FF]/25 bg-[#EAF3FF]' : 'border-[#D7E2EC] bg-white hover:border-[#0A84FF]/20'}`}
            >
              <span className="min-w-0">
                <strong className="block text-[14px] font-semibold text-[#111315]">{block.label}</strong>
                <span className="mt-1 block text-[13px] font-medium leading-5 text-[#687381]">{block.description}</span>
              </span>
              <span className={`mt-0.5 h-6 w-10 rounded-full p-1 transition ${enabled ? 'bg-[#0A84FF]' : 'bg-[#DCE2E8]'}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition ${enabled ? 'translate-x-4' : ''}`} />
              </span>
            </button>
          )
        })}
      </div>
      <div className="v-modal-actions">
        <button type="button" onClick={onClose} className="v-admin-button-secondary flex-1">
          Отмена
        </button>
        <button type="button" onClick={save} className="v-admin-button flex-1">
          Сохранить
        </button>
      </div>
    </Modal>
  )
}
