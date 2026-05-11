import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, isSameDay, isBefore, startOfDay, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminPayments, adminCars, problemCases, adminDocuments, adminInternalExams } from '../../services/adminStorage'
import { getSlotDateTime } from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { motion } from 'framer-motion'

function useTodayData(schoolId: string) {
  return useMemo(() => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')

    const slots = db.slots.bySchool(schoolId)
    const bookings = db.bookings.bySchool(schoolId)
    const instructors = db.instructors.bySchool(schoolId)
    const students = db.students.bySchool(schoolId)
    const branches = db.branches.bySchool(schoolId)

    // Today's slots and bookings
    const todaySlots = slots.filter((s) => s.date === todayStr)
    const todayBookings = bookings.filter((b) => {
      const slot = db.slots.byId(b.slotId)
      if (!slot) return false
      return isSameDay(getSlotDateTime(slot), now)
    })

    const lessonsToday = todayBookings.filter((b) => b.status === 'active').length
    const cancelledToday = todayBookings.filter((b) => b.status === 'cancelled').length
    const noShowsToday = todayBookings.filter((b) => b.status === 'no_show').length
    const freeSlotsToday = todaySlots.filter((s) => s.status === 'available').length

    // Debt students
    const debtStudents = new Set<string>()
    adminPayments.byStatus(schoolId, 'overdue').forEach((p) => debtStudents.add(p.studentId))
    adminPayments.byStatus(schoolId, 'partial').forEach((p) => {
      if (p.remainingAmount > 0) debtStudents.add(p.studentId)
    })

    // Cars in repair
    const carsInRepair = adminCars.all(schoolId).filter((c) => c.status === 'repair' || c.status === 'maintenance').length

    // Open problem cases
    const openProblems = problemCases.open(schoolId).length

    // Overdue (past, not closed)
    const overdueBookings = bookings.filter((b) => {
      const slot = db.slots.byId(b.slotId)
      if (!slot || b.status !== 'active') return false
      return isBefore(getSlotDateTime(slot), startOfDay(now))
    })

    // Upcoming exams (next 7 days)
    const next7Days = addDays(now, 7)
    const upcomingExams = adminInternalExams.all(schoolId).filter((e) => {
      if (!e.scheduledDate || e.status !== 'scheduled') return false
      const d = new Date(e.scheduledDate)
      return d >= now && d <= next7Days
    })

    // Documents expiring soon (14 days)
    const docsExpiring = adminDocuments.expiringSoon(schoolId, 14).length

    // Students without recent booking (more than 14 days since last booking)
    const studentsWithoutRecentBooking = students.filter((s) => {
      const studentBookings = bookings.filter((b) => b.studentId === s.id && b.status === 'completed')
      if (studentBookings.length === 0) return false
      const lastBooking = studentBookings.sort((a, b) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
      )[0]
      if (!lastBooking?.updatedAt) return false
      const lastDate = new Date(lastBooking.updatedAt)
      return isBefore(lastDate, addDays(now, -14))
    })

    // Instructor load
    const instructorLoads = instructors.filter((i) => i.isActive).map((instructor) => {
      const instructorSlots = slots.filter((s) => s.instructorId === instructor.id && s.date === todayStr)
      return { instructor, bookedCount: instructorSlots.filter((s) => s.status === 'booked').length, total: instructorSlots.length }
    })
    const instructorsIdle = instructorLoads.filter((l) => l.bookedCount === 0 && l.total > 0).length
    const instructorsOverloaded = instructorLoads.filter((l) => l.bookedCount >= 5).length

    // Next lesson
    const upcoming = bookings
      .filter((b) => b.status === 'active' && db.slots.byId(b.slotId))
      .map((b) => ({ booking: b, slot: db.slots.byId(b.slotId)! }))
      .filter((e) => e.slot && getSlotDateTime(e.slot) > now)
      .sort((a, b) => getSlotDateTime(a.slot).getTime() - getSlotDateTime(b.slot).getTime())

    const nextLesson = upcoming[0]

    return {
      lessonsToday,
      cancelledToday,
      noShowsToday,
      freeSlotsToday,
      debtStudentsCount: debtStudents.size,
      carsInRepair,
      openProblems,
      overdueBookings: overdueBookings.length,
      upcomingExams: upcomingExams.length,
      docsExpiring,
      studentsWithoutRecentBooking: studentsWithoutRecentBooking.length,
      instructorsIdle,
      instructorsOverloaded,
      nextLesson,
      upcoming: upcoming.slice(0, 5),
      todaySlots,
      todayBookings,
      instructors,
      branches,
      students,
    }
  }, [schoolId])
}

type StatCardProps = {
  label: string
  value: number
  to: string
  tone?: 'default' | 'danger' | 'warning' | 'success'
  onClick?: () => void
}

function StatCard({ label, value, to, tone = 'default', onClick }: StatCardProps) {
  const navigate = useNavigate()
  const colors = {
    default: 'bg-white border-gray-100 text-gray-900',
    danger: 'bg-red-50 border-red-100 text-red-600',
    warning: 'bg-amber-50 border-amber-100 text-amber-600',
    success: 'bg-green-50 border-green-100 text-green-600',
  }
  const valueColors = {
    default: 'text-gray-900',
    danger: 'text-red-600',
    warning: 'text-amber-600',
    success: 'text-green-600',
  }

  const handleClick = () => {
    if (onClick) onClick()
    else navigate(to)
  }

  return (
    <button
      onClick={handleClick}
      className={`rounded-xl border p-3 text-left transition hover:scale-[1.02] active:scale-[0.99] sm:rounded-2xl sm:p-4 ${colors[tone]}`}
    >
      <p className={`text-[24px] font-black leading-none sm:text-[28px] ${valueColors[tone]}`}>{value}</p>
      <p className="mt-1.5 text-[12px] font-semibold text-gray-400">{label}</p>
    </button>
  )
}

type AttentionItem = {
  id: string
  title: string
  description: string
  to: string
  tone: 'danger' | 'warning' | 'info'
}

export function AdminToday() {
  const school = db.schools.all()[0]

  if (!school) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Школа не найдена</p>
      </div>
    )
  }

  const data = useTodayData(school.id)

  const attention: AttentionItem[] = [
    ...data.overdueBookings > 0 ? [{
      id: 'overdue',
      title: 'Прошедшие не закрыты',
      description: `${data.overdueBookings} занятий нужно отметить проведёнными или отменёнными`,
      to: `${ADMIN_BASE_PATH}/schedule`,
      tone: 'danger' as const,
    }] : [],
    ...data.debtStudentsCount > 0 ? [{
      id: 'debt',
      title: 'Ученики с долгом',
      description: `${data.debtStudentsCount} учеников с просроченной оплатой`,
      to: `${ADMIN_BASE_PATH}/payments`,
      tone: 'danger' as const,
    }] : [],
    ...data.carsInRepair > 0 ? [{
      id: 'cars',
      title: 'Машины в ремонте',
      description: `${data.carsInRepair} машин недоступны для записи`,
      to: `${ADMIN_BASE_PATH}/cars`,
      tone: 'warning' as const,
    }] : [],
    ...data.openProblems > 0 ? [{
      id: 'problems',
      title: 'Открытые проблемы',
      description: `${data.openProblems} ситуаций требуют решения`,
      to: `${ADMIN_BASE_PATH}/reports`,
      tone: 'warning' as const,
    }] : [],
    ...data.docsExpiring > 0 ? [{
      id: 'docs',
      title: 'Документы истекают',
      description: `${data.docsExpiring} документов истекают в ближайшие 14 дней`,
      to: `${ADMIN_BASE_PATH}/documents`,
      tone: 'warning' as const,
    }] : [],
    ...data.studentsWithoutRecentBooking > 0 ? [{
      id: 'inactive',
      title: 'Ученики без занятий',
      description: `${data.studentsWithoutRecentBooking} учеников не записывались более 14 дней`,
      to: `${ADMIN_BASE_PATH}/students`,
      tone: 'info' as const,
    }] : [],
  ]

  const toneStyles = {
    danger: { bg: 'bg-red-50', border: 'border-red-100', dot: 'bg-red-500', title: 'text-red-600' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-100', dot: 'bg-amber-500', title: 'text-amber-600' },
    info: { bg: 'bg-blue-50', border: 'border-blue-100', dot: 'bg-blue-500', title: 'text-blue-600' },
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-black uppercase tracking-wider text-gray-400">{school.name}</p>
            <h1 className="mt-1 text-[32px] font-black tracking-tight text-gray-900 md:text-[40px]">
              {format(new Date(), 'EEEE, d MMMM', { locale: ru })}
            </h1>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => window.location.href = `${ADMIN_BASE_PATH}/students`}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-[13px] font-bold text-white shadow-lg transition hover:bg-gray-800"
            >
              + Записать ученика
            </button>
          </div>
        </div>
      </div>

      {/* Main stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="занятий сегодня" value={data.lessonsToday} to={`${ADMIN_BASE_PATH}/schedule`} />
        <StatCard label="свободных окон" value={data.freeSlotsToday} to={`${ADMIN_BASE_PATH}/schedule`} />
        <StatCard label="неявок" value={data.noShowsToday} to={`${ADMIN_BASE_PATH}/schedule`} tone={data.noShowsToday > 0 ? 'danger' : 'default'} />
        <StatCard label="отмен сегодня" value={data.cancelledToday} to={`${ADMIN_BASE_PATH}/schedule`} tone={data.cancelledToday > 2 ? 'warning' : 'default'} />
      </div>

      {/* Second row */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="учеников с долгом" value={data.debtStudentsCount} to={`${ADMIN_BASE_PATH}/payments`} tone={data.debtStudentsCount > 0 ? 'danger' : 'default'} />
        <StatCard label="машин в ремонте" value={data.carsInRepair} to={`${ADMIN_BASE_PATH}/cars`} tone={data.carsInRepair > 0 ? 'warning' : 'default'} />
        <StatCard label="инструкторов свободно" value={data.instructorsIdle} to={`${ADMIN_BASE_PATH}/instructors`} tone={data.instructorsIdle > 2 ? 'warning' : 'default'} />
        <StatCard label="проблем открыто" value={data.openProblems} to={`${ADMIN_BASE_PATH}/reports`} tone={data.openProblems > 0 ? 'danger' : 'default'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Upcoming lessons */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[18px] font-black text-gray-900">Ближайшие занятия</h2>
            <a href={`${ADMIN_BASE_PATH}/schedule`} className="text-[13px] font-semibold text-gray-400 hover:text-gray-600">
              Все →
            </a>
          </div>

          {data.upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
              <p className="font-semibold text-gray-400">На ближайшие дни записей нет</p>
              <button
                onClick={() => window.location.href = `${ADMIN_BASE_PATH}/students`}
                className="mt-3 text-[13px] font-bold text-gray-900 underline"
              >
                Записать ученика
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {data.upcoming.map((entry) => {
                const instructor = data.instructors.find((i) => i.id === entry.booking.instructorId)
                const slot = entry.slot
                return (
                  <motion.div
                    key={entry.booking.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition hover:border-gray-200"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-[13px] font-black text-gray-500">
                      {format(getSlotDateTime(slot), 'HH:mm')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900">{entry.booking.studentName}</p>
                      <p className="text-[13px] font-semibold text-gray-400">
                        {instructor?.name ?? '—'} · {slot.duration} мин
                      </p>
                    </div>
                    <div className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${
                      entry.booking.status === 'active' ? 'bg-green-50 text-green-600' :
                      entry.booking.status === 'no_show' ? 'bg-red-50 text-red-500' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {entry.booking.status === 'active' ? 'Активна' :
                       entry.booking.status === 'no_show' ? 'Неявка' : entry.booking.status}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Attention panel */}
        <div>
          <h2 className="mb-3 text-[18px] font-black text-gray-900">Требует внимания</h2>

          {attention.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="font-bold text-gray-700">Всё в порядке</p>
              <p className="mt-1 text-[13px] font-semibold text-gray-400">Критичных задач нет</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attention.map((item) => {
                const style = toneStyles[item.tone]
                return (
                  <button
                    key={item.id}
                    onClick={() => window.location.href = item.to}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:scale-[1.01] active:scale-[0.99] ${style.bg} ${style.border}`}
                  >
                    <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${style.dot}`} />
                    <div>
                      <p className={`font-bold ${style.title}`}>{item.title}</p>
                      <p className="mt-0.5 text-[13px] font-semibold text-gray-500">{item.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Quick actions */}
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
            <h3 className="mb-3 text-[14px] font-bold text-gray-700">Быстрые действия</h3>
            <div className="space-y-2">
              {[
                { label: 'Записать ученика', to: `${ADMIN_BASE_PATH}/students` },
                { label: 'Создать окна', to: `${ADMIN_BASE_PATH}/schedule` },
                { label: 'Добавить оплату', to: `${ADMIN_BASE_PATH}/payments` },
                { label: 'Открыть журнал', to: `${ADMIN_BASE_PATH}/reports` },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.to}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  {action.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
