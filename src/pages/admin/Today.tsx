import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDays, format, isBefore, isSameDay, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { AlertTriangle, CalendarPlus, CheckCircle2, Clock3, ExternalLink, SlidersHorizontal, WalletCards } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { db } from '../../services/storage'
import { adminCars, adminDocuments, adminInternalExams, adminPayments, problemCases } from '../../services/adminStorage'
import { getSlotDateTime } from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
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

function useTodayData(schoolId: string) {
  return useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const slots = db.slots.bySchool(schoolId)
    const bookings = db.bookings.bySchool(schoolId)
    const instructors = db.instructors.bySchool(schoolId)
    const students = db.students.bySchool(schoolId)
    const branches = db.branches.bySchool(schoolId)
    const payments = adminPayments.all(schoolId)

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
      idleInstructors: instructorLoads.filter((load) => load.total > 0 && load.booked === 0).length,
      busyInstructors: instructorLoads.filter((load) => load.booked >= 5).length,
    }
  }, [schoolId])
}

function PriorityCard({ title, text, tone, to }: { title: string; text: string; tone: 'danger' | 'warning' | 'info'; to: string }) {
  const iconClass = tone === 'danger' ? 'text-[#FF3B30]' : tone === 'warning' ? 'text-[#B86A00]' : 'text-[#0A84FF]'
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
    amber: 'bg-[rgba(255,176,32,0.16)] text-[#9A5A00]',
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
      to: `${ADMIN_BASE_PATH}/settings`,
    },
    {
      title: 'Филиалы',
      text: branchCount > 0 ? `${branchCount} филиалов добавлено` : 'Добавьте хотя бы один филиал',
      done: branchCount > 0,
      to: `${ADMIN_BASE_PATH}/branches`,
    },
    {
      title: 'Инструкторы',
      text: instructorCount > 0 ? `${instructorCount} инструкторов в работе` : 'Добавьте инструкторов',
      done: instructorCount > 0,
      to: `${ADMIN_BASE_PATH}/instructors`,
    },
    {
      title: 'Свободное время',
      text: availableFutureSlots > 0 ? `${availableFutureSlots} вариантов доступно ученикам` : 'Создайте время для занятий',
      done: availableFutureSlots > 0,
      to: `${ADMIN_BASE_PATH}/schedule`,
    },
    {
      title: 'Ученики',
      text: studentCount > 0 ? `${studentCount} учеников в базе` : 'Добавьте первого ученика или отправьте ссылку на вход',
      done: studentCount > 0,
      to: `${ADMIN_BASE_PATH}/students`,
    },
  ]
  const doneCount = items.filter((item) => item.done).length
  const isReady = doneCount === items.length

  return (
    <section className={`v-admin-panel mt-4 overflow-hidden ${isReady ? 'border-[#BFE7CF]' : 'border-[#F7D58B]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#DCE2E8] p-4">
        <div>
          <h2 className="text-[18px] font-black text-[#111418]">Готовность к работе</h2>
          <p className="v-admin-note mt-1">
            {isReady ? 'Основные настройки на месте. Можно вести день и принимать учеников.' : 'Закройте базовые шаги перед запуском школы.'}
          </p>
        </div>
        <span className={`v-admin-pill ${isReady ? 'v-tone-ok' : 'v-tone-warning'}`}>
          {doneCount}/{items.length}
        </span>
      </div>
      <div className="grid gap-0 divide-y divide-[#EEF2F5] lg:grid-cols-5 lg:divide-x lg:divide-y-0">
        {items.map((item) => (
          <Link key={item.title} to={item.to} className="flex min-h-[116px] flex-col gap-3 p-4 transition hover:bg-[#F8FAFC]">
            <span className={`grid h-9 w-9 place-items-center rounded-[10px] ${item.done ? 'bg-[#EAF7EF] text-[#157347]' : 'bg-[#FFF7E0] text-[#A45A00]'}`}>
              {item.done ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            </span>
            <span>
              <strong className="block text-[14px] font-black leading-5 text-[#111418]">{item.title}</strong>
              <span className="mt-1 block text-[12px] font-bold leading-4 text-[#66717D]">{item.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function AdminToday() {
  const school = db.schools.currentAdmin()
  const navigate = useNavigate()
  const [blockSettingsOpen, setBlockSettingsOpen] = useState(false)
  const [blocksVersion, setBlocksVersion] = useState(0)

  if (!school) {
    return <div className="v-admin-empty m-4"><strong>Школа не найдена</strong><span>Проверьте рабочее пространство.</span></div>
  }

  const data = useTodayData(school.id)
  const enabledBlocks = getEnabledDashboardBlockIds(school.id)
  const hasBlock = (id: AdminDashboardBlockId) => enabledBlocks.includes(id)
  void blocksVersion
  const priorities = [
    data.overdueBookings > 0 ? { title: 'Закрыть прошедшие занятия', text: `${data.overdueBookings} занятий уже прошли, но не отмечены`, tone: 'danger' as const, to: `${ADMIN_BASE_PATH}/schedule` } : null,
    data.debtStudentsCount > 0 ? { title: 'Разобрать долги учеников', text: `${data.debtStudentsCount} учеников должны ${money(data.overdueAmount)}`, tone: 'danger' as const, to: `${ADMIN_BASE_PATH}/payments` } : null,
    data.openProblems > 0 ? { title: 'Открытые проблемы', text: `${data.openProblems} ситуаций ждут решения`, tone: 'warning' as const, to: `${ADMIN_BASE_PATH}/reports` } : null,
    data.carsInRepair > 0 ? { title: 'Машины недоступны', text: `${data.carsInRepair} машин в ремонте или обслуживании`, tone: 'warning' as const, to: `${ADMIN_BASE_PATH}/cars` } : null,
    data.docsExpiring > 0 ? { title: 'Документы скоро истекут', text: `${data.docsExpiring} документов проверить за 14 дней`, tone: 'info' as const, to: `${ADMIN_BASE_PATH}/documents` } : null,
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
          <div className="flex flex-wrap gap-2">
            <button className="v-admin-button is-blue" onClick={() => navigate(`${ADMIN_BASE_PATH}/schedule`)}>
              <CalendarPlus size={16} />
              Создать окна
            </button>
            <button className="v-admin-button-tertiary" onClick={() => setBlockSettingsOpen(true)}>
              <SlidersHorizontal size={16} />
              Блоки
            </button>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TodayMetric label="занятий сегодня" value={data.activeToday.length} tone="blue" to={`${ADMIN_BASE_PATH}/schedule`} />
        <TodayMetric label="свободных окон" value={data.freeSlotsToday} tone="green" to={`${ADMIN_BASE_PATH}/schedule`} />
        <TodayMetric label="новых записей" value={data.upcoming.length} tone="muted" to={`${ADMIN_BASE_PATH}/students`} />
        <TodayMetric label="проблем / долгов" value={data.openProblems + data.debtStudentsCount} tone={data.openProblems + data.debtStudentsCount ? 'red' : 'green'} to={`${ADMIN_BASE_PATH}/reports`} />
      </section>

      {hasBlock('launchChecklist') ? <LaunchChecklist
        schoolName={school.name}
        schoolPhone={school.phone}
        branchCount={data.branches.length}
        instructorCount={data.activeInstructors}
        availableFutureSlots={data.availableFutureSlots}
        studentCount={data.students.length}
      /> : null}

      {(hasBlock('nearest') || hasBlock('attention') || hasBlock('quickActions')) ? <section className={`mt-4 grid gap-4 ${hasBlock('nearest') && (hasBlock('attention') || hasBlock('quickActions')) ? 'lg:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
        {hasBlock('nearest') ? <div className="v-admin-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[#111827]/[0.07] p-4">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111315]">Ближайшие занятия</h2>
              <p className="v-admin-note mt-1">Маршрут дня по времени</p>
            </div>
            <Link to={`${ADMIN_BASE_PATH}/schedule`} className="v-admin-button-secondary">
              Все
              <ExternalLink size={15} />
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
                    onClick={() => navigate(`${ADMIN_BASE_PATH}/schedule`)}
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
                    <span className="v-route-pill hidden sm:inline-flex">{slot.duration} мин</span>
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
                ['Записать ученика', `${ADMIN_BASE_PATH}/students`],
                ['Создать свободные окна', `${ADMIN_BASE_PATH}/schedule`],
                ['Принять оплату', `${ADMIN_BASE_PATH}/payments`],
                ['Открыть страницу школы', `/school/${school.slug}`],
              ].map(([label, to]) => (
                <Link key={label} to={to} className="v-admin-button-secondary justify-start">
                  <Clock3 size={15} />
                  {label}
                </Link>
              ))}
            </div>
          </div> : null}
        </aside> : null}
      </section> : null}

      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="v-admin-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[#111827]/[0.07] p-4">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">Свободные окна</h2>
              <p className="v-admin-note mt-1">Ближайшие остановки, куда можно записать ученика</p>
            </div>
            <Link to={`${ADMIN_BASE_PATH}/schedule`} className="v-admin-button-tertiary">
              Расписание
              <ExternalLink size={15} />
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
                  <button key={slot.id} onClick={() => navigate(`${ADMIN_BASE_PATH}/schedule`)} className="rounded-[22px] border border-[rgba(52,199,89,0.18)] bg-[rgba(52,199,89,0.08)] p-3 text-left transition hover:-translate-y-0.5 hover:bg-[rgba(52,199,89,0.12)]">
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1F8F3F]"><span className="h-2 w-2 rounded-full bg-[#34C759]" />{slot.time}</span>
                    <strong className="mt-2 block text-[15px] font-semibold text-[#111827]">{slot.duration} мин</strong>
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
      <div className="grid gap-2 p-4">
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
      <div className="sticky bottom-0 flex gap-2 border-t border-[#111827]/[0.07] bg-white/90 p-4 backdrop-blur-2xl">
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
