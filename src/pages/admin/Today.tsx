import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDays, format, isBefore, isSameDay, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { WarningTriangle as AlertTriangle, CalendarPlus, CheckCircle as CheckCircle2, Clock, OpenNewWindow as ExternalLink, Filter, CreditCards } from 'iconoir-react'
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

const TODAY_BLOCK_IDS: AdminDashboardBlockId[] = ['finance', 'stats', 'launchChecklist', 'nearest', 'attention', 'quickActions']
const TODAY_BLOCKS = ADMIN_DASHBOARD_BLOCKS.filter((block) => TODAY_BLOCK_IDS.includes(block.id))

function money(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`
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
          <span className="v-admin-pill v-tone-warning">Мастер запуска {doneCount}/{items.length}</span>
          <h2 className="mt-3 text-[20px] font-semibold text-[#111827]">Довести школу до рабочего состояния</h2>
          <p className="mt-1 max-w-2xl text-[13px] font-medium leading-5 text-[#667085]">Это путь первого директора: заполнить базу, открыть окна, проверить запись и уже после этого продавать доступ ученикам.</p>
        </div>
        {nextItem ? <Link to={nextItem.to} className="v-admin-button is-blue justify-center">Следующий шаг: {nextItem.title}</Link> : null}
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
    data.overdueBookings > 0 ? { title: 'Закрыть прошедшие занятия', text: `${data.overdueBookings} занятий уже прошли, но не отмечены`, tone: 'danger' as const, to: `${getAdminBasePathForLocation()}/schedule` } : null,
    data.debtStudentsCount > 0 ? { title: 'Разобрать долги учеников', text: `${data.debtStudentsCount} учеников должны ${money(data.overdueAmount)}`, tone: 'danger' as const, to: `${getAdminBasePathForLocation()}/payments` } : null,
    data.openProblems > 0 ? { title: 'Открытые проблемы', text: `${data.openProblems} ситуаций ждут решения`, tone: 'warning' as const, to: `${getAdminBasePathForLocation()}/reports` } : null,
    data.carsInRepair > 0 ? { title: 'Машины недоступны', text: `${data.carsInRepair} машин в ремонте или обслуживании`, tone: 'warning' as const, to: `${getAdminBasePathForLocation()}/cars` } : null,
    data.docsExpiring > 0 ? { title: 'Документы скоро истекут', text: `${data.docsExpiring} документов проверить за 14 дней`, tone: 'info' as const, to: `${getAdminBasePathForLocation()}/documents` } : null,
    data.openStudentRequests > 0 ? { title: 'Запросы учеников', text: `${data.openStudentRequests} переносов или отмен ждут ответа`, tone: 'info' as const, to: `${getAdminBasePathForLocation()}/students` } : null,
    data.availableFutureSlots < Math.max(6, data.activeInstructors * 2) ? { title: 'Мало свободных окон', text: `Открыто ${data.availableFutureSlots} будущих окон: ученикам сложнее записаться`, tone: 'warning' as const, to: `${getAdminBasePathForLocation()}/schedule` } : null,
  ].filter(Boolean)
  const freeSlots = data.todaySlots
    .filter((slot) => slot.status === 'available')
    .sort((left, right) => left.time.localeCompare(right.time))
    .slice(0, 8)
  const nextEntry = data.upcoming[0] ?? null
  const nextInstructor = nextEntry ? data.instructors.find((item) => item.id === nextEntry.booking.instructorId) : null
  const nextBranch = nextEntry ? data.branches.find((item) => item.id === nextEntry.booking.branchId) : null
  const firstPriority = priorities[0] ?? null
  const firstFreeSlot = freeSlots[0] ?? null
  const firstFreeInstructor = firstFreeSlot ? data.instructors.find((item) => item.id === firstFreeSlot.instructorId) : null
  const firstFreeBranch = firstFreeSlot ? data.branches.find((item) => item.id === firstFreeSlot.branchId) : null
  const dayPlan = [
    firstPriority ? { label: 'Сначала', title: firstPriority.title, text: firstPriority.text, to: firstPriority.to, tone: firstPriority.tone } : { label: 'Сначала', title: 'Открыть день', text: nextEntry ? `Ближайшее занятие в ${format(getSlotDateTime(nextEntry.slot), 'HH:mm')}` : 'Проверить свободные окна и записи', to: `${getAdminBasePathForLocation()}/schedule`, tone: 'info' as const },
    data.debtQueue[0] ? { label: 'Деньги', title: data.debtQueue[0].student.name, text: `Долг ${money(data.debtQueue[0].debt)}${data.debtQueue[0].nextBooking?.slot ? ` · занятие ${format(getSlotDateTime(data.debtQueue[0].nextBooking.slot), 'dd.MM HH:mm')}` : ''}`, to: `${getAdminBasePathForLocation()}/students/${data.debtQueue[0].student.id}`, tone: 'danger' as const } : { label: 'Деньги', title: 'Нет срочной долговой очереди', text: `Поступило сегодня ${money(data.paidToday)}`, to: `${getAdminBasePathForLocation()}/payments`, tone: 'info' as const },
    data.studentRequests[0] ? { label: 'Запрос', title: 'Ответить ученику', text: data.studentRequests[0].reason, to: `${getAdminBasePathForLocation()}/students`, tone: 'warning' as const } : { label: 'Запросы', title: 'Новых запросов нет', text: 'Переносы и отмены не ждут ответа', to: `${getAdminBasePathForLocation()}/students`, tone: 'info' as const },
  ]

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
          <div className="flex flex-wrap gap-2">
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
        <TodayMetric label="ближайших записей" value={data.upcoming.length} tone="muted" to={`${getAdminBasePathForLocation()}/schedule`} />
        <TodayMetric label="запросов / долгов" value={data.openStudentRequests + data.debtStudentsCount} tone={data.openStudentRequests + data.debtStudentsCount ? 'red' : 'green'} to={`${getAdminBasePathForLocation()}/reports`} />
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-3">
        {dayPlan.map((item) => (
          <Link key={item.label} to={item.to} className={`v-admin-panel p-4 transition hover:-translate-y-0.5 ${item.tone === 'danger' ? 'border-[rgba(255,59,48,0.18)]' : item.tone === 'warning' ? 'border-[rgba(10,132,255,0.18)]' : 'border-[rgba(15,23,42,0.07)]'}`}>
            <span className={`v-route-pill ${item.tone === 'danger' ? 'bg-[rgba(255,59,48,0.10)] text-[#C92820]' : item.tone === 'warning' ? 'bg-[#EAF4FF] text-[#075EBC]' : 'bg-[#F2F4F7] text-[#667085]'}`}>{item.label}</span>
            <strong className="mt-3 block text-[17px] font-semibold text-[#111827]">{item.title}</strong>
            <span className="mt-1 line-clamp-2 block text-[13px] font-medium leading-5 text-[#667085]">{item.text}</span>
          </Link>
        ))}
      </section>

      {hasBlock('launchChecklist') ? <LaunchChecklist
        schoolName={school.name}
        schoolPhone={school.phone}
        branchCount={data.branches.length}
        instructorCount={data.activeInstructors}
        availableFutureSlots={data.availableFutureSlots}
        studentCount={data.students.length}
      /> : null}

      <section className="v-admin-focus-board mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(300px,.86fr)_minmax(260px,.72fr)]">
        <button type="button" onClick={() => navigate(`${getAdminBasePathForLocation()}/schedule`)} className="v-focus-card is-primary min-w-0 p-5 text-left">
          <span className="v-route-pill bg-white/80 text-[#075EBC]">Главный фокус</span>
          {nextEntry ? (
            <>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#4F6275]">Ближайшее занятие</p>
                  <strong className="mt-1 block text-[38px] font-semibold leading-none text-[#0F172A] tabular-nums md:text-[48px]">
                    {format(getSlotDateTime(nextEntry.slot), 'HH:mm')}
                  </strong>
                </div>
                <span className="rounded-full bg-[#0F172A] px-3 py-2 text-[12px] font-semibold text-white">{format(getSlotDateTime(nextEntry.slot), 'dd.MM')}</span>
              </div>
              <div className="mt-5 min-w-0">
                <strong className="block truncate text-[19px] font-semibold text-[#111827]">{nextEntry.booking.studentName}</strong>
                <span className="mt-1 block truncate text-[14px] font-medium text-[#667085]">
                  {nextInstructor?.name ?? 'Инструктор не назначен'} · {nextBranch?.name ?? 'Филиал не указан'} · {formatDuration(nextEntry.slot.duration)}
                </span>
              </div>
            </>
          ) : (
            <>
              <strong className="mt-5 block text-[24px] font-semibold leading-7 text-[#111827]">На ближайшее время записей нет</strong>
              <span className="mt-2 block max-w-xl text-[14px] font-medium leading-6 text-[#667085]">Откройте окна на неделю вперед, чтобы ученики могли записаться без ручной переписки.</span>
            </>
          )}
        </button>

        <Link to={firstPriority?.to ?? `${getAdminBasePathForLocation()}/reports`} className={`v-focus-card min-w-0 p-5 ${firstPriority ? `is-${firstPriority.tone}` : 'is-ok'}`}>
          <span className="v-route-pill bg-[#F8FAFC] text-[#667085]">Контроль</span>
          {firstPriority ? (
            <>
              <strong className="mt-4 block text-[18px] font-semibold leading-6 text-[#111827]">{firstPriority.title}</strong>
              <span className="mt-2 block text-[14px] font-medium leading-6 text-[#667085]">{firstPriority.text}</span>
            </>
          ) : (
            <>
              <strong className="mt-4 block text-[18px] font-semibold leading-6 text-[#111827]">Критичных задач нет</strong>
              <span className="mt-2 block text-[14px] font-medium leading-6 text-[#667085]">Долги, документы, заявки и прошедшие занятия сейчас без красных флагов.</span>
            </>
          )}
        </Link>

        <button type="button" onClick={() => navigate(`${getAdminBasePathForLocation()}/schedule`)} className="v-focus-card min-w-0 p-5 text-left is-free">
          <span className="v-route-pill bg-[rgba(52,199,89,0.12)] text-[#1F8F3F]">Свободное окно</span>
          {firstFreeSlot ? (
            <>
              <strong className="mt-4 block text-[34px] font-semibold leading-none text-[#111827] tabular-nums">{firstFreeSlot.time}</strong>
              <span className="mt-3 block truncate text-[14px] font-medium text-[#667085]">{firstFreeInstructor?.name ?? 'Инструктор'} · {firstFreeBranch?.name ?? 'Филиал'} · {formatDuration(firstFreeSlot.duration)}</span>
            </>
          ) : (
            <>
              <strong className="mt-4 block text-[19px] font-semibold leading-6 text-[#111827]">Сегодня все окна разобраны</strong>
              <span className="mt-2 block text-[14px] font-medium leading-6 text-[#667085]">Проверьте неделю и добавьте резервные слоты.</span>
            </>
          )}
        </button>
      </section>

      {(hasBlock('nearest') || hasBlock('attention') || hasBlock('quickActions')) ? <section className={`mt-4 grid gap-4 ${hasBlock('nearest') && (hasBlock('attention') || hasBlock('quickActions')) ? 'lg:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
        {hasBlock('nearest') ? <div className="v-admin-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[#111827]/[0.07] p-4">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111315]">Ближайшие занятия</h2>
              <p className="v-admin-note mt-1">Маршрут дня по времени</p>
            </div>
            <Link to={`${getAdminBasePathForLocation()}/schedule`} className="v-admin-button-secondary">
              Все
              <ExternalLink width={15} height={15} />
            </Link>
          </div>
          {data.upcoming.length === 0 ? (
            <div className="v-admin-empty m-4">
              <CheckCircle2 className="mb-2 h-8 w-8 text-[#247A4B]" />
              <strong>Ближайших занятий нет</strong>
              <span>Создайте окна или запишите ученика из расписания.</span>
            </div>
          ) : (
            <div className="v-route-list">
              {data.upcoming.map(({ booking, slot }) => {
                const instructor = data.instructors.find((item) => item.id === booking.instructorId)
                const branch = data.branches.find((item) => item.id === booking.branchId)
                return (
                  <button
                    key={booking.id}
                    onClick={() => navigate(`${getAdminBasePathForLocation()}/schedule`)}
                    className="v-route-item w-full transition hover:bg-[#F8FAFC]"
                  >
                    <span className="v-route-dot" />
                    <span className="v-route-time">
                      {format(getSlotDateTime(slot), 'HH:mm')}
                    </span>
                    <span className="min-w-0">
                      <span className="v-route-title">{booking.studentName}</span>
                      <span className="v-route-meta">{instructor?.name ?? 'Инструктор'} · {branch?.name ?? 'Филиал'} · {format(getSlotDateTime(slot), 'dd.MM')}</span>
                    </span>
                    <span className="v-route-pill hidden sm:inline-flex">{formatDuration(slot.duration)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div> : null}

        {(hasBlock('attention') || hasBlock('quickActions')) ? <aside className="grid gap-4">
          {hasBlock('attention') ? <div className="v-admin-panel p-4">
            <h2 className="text-[18px] font-semibold text-[#111315]">Требует внимания</h2>
            <div className="mt-3 grid gap-2">
              {priorities.length ? priorities.map((item) => (
                <PriorityCard key={item!.title} {...item!} />
              )) : (
                <div className="rounded-[20px] bg-[#EAF6EE] p-4">
                  <strong className="block text-[15px] font-semibold text-[#111315]">Критичных задач нет</strong>
                  <span className="mt-1 block text-[13px] font-medium text-[#247A4B]">День выглядит спокойно.</span>
                </div>
              )}
            </div>
          </div> : null}

          {hasBlock('quickActions') ? <div className="v-admin-panel p-4">
            <h2 className="text-[18px] font-semibold text-[#111315]">Быстрые действия</h2>
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
        </aside> : null}
      </section> : null}

      <section className="mt-4 grid gap-3 lg:grid-cols-4">
        {[
          { label: 'Деньги под контролем', value: money(data.overdueAmount), text: data.debtStudentsCount ? `${data.debtStudentsCount} учеников с долгом` : 'Долгов не видно', tone: data.debtStudentsCount ? 'danger' : 'ok' },
          { label: 'Потери времени', value: data.freeSlotsToday, text: 'свободных окон сегодня', tone: data.freeSlotsToday ? 'warning' : 'ok' },
          { label: 'Запросы учеников', value: data.openStudentRequests, text: 'нужно разобрать администратору', tone: data.openStudentRequests ? 'warning' : 'ok' },
          { label: 'Операционный риск', value: data.overdueBookings + data.carsInRepair + data.docsExpiring, text: 'занятия, машины и документы', tone: data.overdueBookings + data.carsInRepair + data.docsExpiring ? 'danger' : 'ok' },
        ].map((item) => (
          <div key={item.label} className={`v-admin-panel min-h-[132px] p-4 ${item.tone === 'danger' ? 'border-[rgba(255,59,48,0.18)]' : item.tone === 'warning' ? 'border-[rgba(10,132,255,0.18)]' : 'border-[rgba(52,199,89,0.18)]'}`}>
            <span className={`v-route-pill ${item.tone === 'danger' ? 'bg-[rgba(255,59,48,0.10)] text-[#C92820]' : item.tone === 'warning' ? 'bg-[#EAF4FF] text-[#075EBC]' : 'bg-[#EAF7EF] text-[#1F8F3F]'}`}>{item.label}</span>
            <strong className="mt-4 block text-[28px] font-semibold leading-none text-[#111827] tabular-nums">{item.value}</strong>
            <span className="mt-2 block text-[13px] font-medium leading-5 text-[#667085]">{item.text}</span>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="v-admin-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[#111827]/[0.07] p-4">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">Свободные окна</h2>
              <p className="v-admin-note mt-1">Ближайшие остановки, куда можно записать ученика</p>
            </div>
            <Link to={`${getAdminBasePathForLocation()}/schedule`} className="v-admin-button-tertiary">
              Расписание
              <ExternalLink width={15} height={15} />
            </Link>
          </div>
          {freeSlots.length === 0 ? (
            <div className="v-admin-empty m-4">
              <strong>Свободных окон сегодня нет</strong>
              <span>Откройте расписание и добавьте время.</span>
            </div>
          ) : (
            <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-4">
              {freeSlots.map((slot) => {
                const instructor = data.instructors.find((item) => item.id === slot.instructorId)
                const branch = data.branches.find((item) => item.id === slot.branchId)
                return (
                  <button key={slot.id} onClick={() => navigate(`${getAdminBasePathForLocation()}/schedule`)} className="rounded-[22px] border border-[rgba(52,199,89,0.18)] bg-[rgba(52,199,89,0.08)] p-3 text-left transition hover:-translate-y-0.5 hover:bg-[rgba(52,199,89,0.12)]">
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1F8F3F]"><span className="h-2 w-2 rounded-full bg-[#34C759]" />{slot.time}</span>
                    <strong className="mt-2 block text-[15px] font-semibold text-[#111827]">{formatDuration(slot.duration)}</strong>
                    <span className="mt-1 block truncate text-[12px] font-medium text-[#667085]">{instructor?.name ?? 'Инструктор'} · {branch?.name ?? 'Филиал'}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {hasBlock('finance') ? <aside className="v-admin-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">Оплаты</h2>
              <p className="v-admin-note mt-1">Сегодня и общий долг</p>
            </div>
            <WalletCards className="h-6 w-6 text-[#34C759]" />
          </div>
          <div className="mt-5 grid gap-3">
            <div className="rounded-[22px] bg-[rgba(52,199,89,0.10)] p-4">
              <span className="text-[12px] font-medium text-[#1F8F3F]">Оплачено сегодня</span>
              <strong className="mt-1 block text-[28px] font-semibold leading-none text-[#111827]">{money(data.paidToday)}</strong>
            </div>
            <div className="rounded-[22px] bg-[rgba(255,59,48,0.08)] p-4">
              <span className="text-[12px] font-medium text-[#C92820]">Долг учеников</span>
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
      <div className="grid max-h-[min(64vh,560px)] gap-2 overflow-y-auto p-4">
        {TODAY_BLOCKS.map((block) => {
          const enabled = draft.includes(block.id)
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => toggle(block.id)}
              className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[20px] border p-4 text-left transition ${enabled ? 'border-[#111827]/20 bg-[#EAF3FF]' : 'border-white/70 bg-white/75 hover:border-[#111827]/15'}`}
            >
              <span className="min-w-0">
                <strong className="block text-[14px] font-semibold text-[#111315]">{block.label}</strong>
                <span className="mt-1 block text-[13px] font-medium leading-5 text-[#687381]">{block.description}</span>
              </span>
              <span className={`mt-0.5 h-6 w-10 rounded-full p-1 transition ${enabled ? 'bg-[#111827]' : 'bg-[#DCE2E8]'}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition ${enabled ? 'translate-x-4' : ''}`} />
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex shrink-0 gap-2 border-t border-[#111827]/[0.07] bg-white/95 p-4 backdrop-blur-2xl">
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
