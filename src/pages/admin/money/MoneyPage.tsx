import { isAfter, isBefore, startOfDay, subDays } from 'date-fns'
import { useMemo } from 'react'
import { StatusPill } from '../../../components/admin/core/StatusPill'
import { formatHumanDate, formatTimeRange } from '../../../utils/date'
import { getBookingsBySchool, getSlotDateTime } from '../../../services/bookingService'
import { getStudentsBySchool, getStudentStats } from '../../../services/studentService'
import { getInstructorsBySchool } from '../../../services/instructorService'
import { db } from '../../../services/storage'

/* Mock price: 1 lesson = 1500₽ */
const LESSON_PRICE = 1500

function calcRevenue(bookings: ReturnType<typeof getBookingsBySchool>, from: Date, to: Date): number {
  return bookings
    .filter((e) => {
      if (e.booking.status !== 'completed') return false
      if (!e.slot) return false
      const t = getSlotDateTime(e.slot)
      return !isBefore(t, from) && isBefore(t, to)
    })
    .reduce((sum, e) => sum + (e.slot?.duration ?? 90) / 60 * LESSON_PRICE, 0)
}

export default function MoneyPage() {
  const school = db.schools.currentAdmin() ?? null

  const allBookings = useMemo(
    () => (school ? getBookingsBySchool(school.id) : []),
    [school],
  )
  const students = useMemo(
    () => (school ? getStudentsBySchool(school.id) : []),
    [school],
  )
  const instructors = useMemo(
    () => (school ? getInstructorsBySchool(school.id) : []),
    [school],
  )

  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = subDays(todayStart, 7)
  const monthStart = subDays(todayStart, 30)

  const revenueToday = Math.round(calcRevenue(allBookings, todayStart, now))
  const revenueWeek = Math.round(calcRevenue(allBookings, weekStart, now))
  const revenueMonth = Math.round(calcRevenue(allBookings, monthStart, now))

  /* Students with unpaid (active future) bookings */
  const debtors = useMemo(() => {
    return students
      .map((s) => {
        const stats = getStudentStats(s.id)
        return { student: s, stats }
      })
      .filter(({ stats }) => stats.activeFutureBookings > 0)
      .sort((a, b) => b.stats.activeFutureBookings - a.stats.activeFutureBookings)
  }, [students])

  /* Packages = students who have completed bookings (paid service) */
  const paidStudents = useMemo(() => {
    return students
      .map((s) => {
        const stats = getStudentStats(s.id)
        const revenue = allBookings
          .filter((e) => e.booking.studentId === s.id && e.booking.status === 'completed')
          .reduce((sum, e) => sum + (e.slot?.duration ?? 90) / 60 * LESSON_PRICE, 0)
        return { student: s, stats, revenue }
      })
      .filter(({ stats }) => stats.completedBookings > 0)
      .sort((a, b) => b.revenue - a.revenue)
  }, [students, allBookings])

  /* Instructor stats */
  const instructorStats = useMemo(() => {
    return instructors.map((i) => {
      const myBookings = allBookings.filter((e) => e.booking.instructorId === i.id)
      const completed = myBookings.filter((e) => e.booking.status === 'completed').length
      const cancelled = myBookings.filter((e) => e.booking.status === 'cancelled').length
      const revenue = myBookings
        .filter((e) => e.booking.status === 'completed')
        .reduce((sum, e) => sum + (e.slot?.duration ?? 90) / 60 * LESSON_PRICE, 0)
      return { instructor: i, completed, cancelled, revenue: Math.round(revenue) }
    }).sort((a, b) => b.revenue - a.revenue)
  }, [instructors, allBookings])

  /* Cancelled + no-shows */
  const cancellations = allBookings.filter((e) => e.booking.status === 'cancelled').length

  if (!school) return <div className="p-4"><p className="text-sm text-[#6F747A]">Загрузка…</p></div>

  return (
    <div className="min-h-dvh bg-bg pb-20">
      <div className="sticky top-0 z-20 border-b border-border bg-surface px-3 pt-3">
        <h1 className="text-[20px] font-black tracking-[-0.03em] text-ink">Деньги</h1>
        <p className="mt-0.5 text-[12px] font-semibold text-[#9EA3A8]">Выручка, задолженности, статистика инструкторов</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-px bg-border">
        <div className="bg-surface px-3 py-3 text-center">
          <p className="text-[11px] font-semibold text-[#9EA3A8]">Сегодня</p>
          <p className="mt-0.5 text-[20px] font-black text-success">{revenueToday.toLocaleString('ru-RU')} ₽</p>
        </div>
        <div className="bg-surface px-3 py-3 text-center">
          <p className="text-[11px] font-semibold text-[#9EA3A8]">Неделя</p>
          <p className="mt-0.5 text-[20px] font-black text-ink">{revenueWeek.toLocaleString('ru-RU')} ₽</p>
        </div>
        <div className="bg-surface px-3 py-3 text-center">
          <p className="text-[11px] font-semibold text-[#9EA3A8]">Месяц</p>
          <p className="mt-0.5 text-[20px] font-black text-ink">{revenueMonth.toLocaleString('ru-RU')} ₽</p>
        </div>
      </div>

      {/* Instructor Load */}
      <div className="mt-3">
        <div className="border-b border-border bg-surface px-3 py-2">
          <h2 className="text-[13px] font-black text-ink">Нагрузка инструкторов</h2>
        </div>
        <div className="divide-y divide-border">
          {instructorStats.length === 0 ? (
            <div className="bg-surface px-4 py-6 text-center">
              <p className="text-[13px] font-semibold text-[#9EA3A8]">Нет данных</p>
            </div>
          ) : (
            instructorStats.map(({ instructor, completed, cancelled, revenue }) => (
              <div key={instructor.id} className="flex items-center justify-between gap-3 bg-surface px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-black text-ink">{instructor.name}</span>
                    {!instructor.isActive && <StatusPill label="Неактивен" status="error" size="sm" />}
                  </div>
                  <p className="text-[11px] font-semibold text-[#9EA3A8]">
                    {instructor.categories?.join(', ') ?? 'B'}
                    {instructor.car ? ` · ${instructor.car}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-[13px] font-black text-success">{completed}</p>
                    <p className="text-[10px] font-semibold text-[#9EA3A8]">проведено</p>
                  </div>
                  {cancelled > 0 && (
                    <div>
                      <p className="text-[13px] font-black text-error">{cancelled}</p>
                      <p className="text-[10px] font-semibold text-[#9EA3A8]">отменено</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[13px] font-black text-ink">{revenue.toLocaleString('ru-RU')} ₽</p>
                    <p className="text-[10px] font-semibold text-[#9EA3A8]">выручка</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Outstanding Debts */}
      <div className="mt-3">
        <div className="border-b border-border bg-surface px-3 py-2">
          <h2 className="text-[13px] font-black text-ink">
            Активные записи
            <span className="ml-2 text-[11px] font-bold text-[#9EA3A8]">{debtors.length} учеников</span>
          </h2>
        </div>
        <div className="divide-y divide-border">
          {debtors.length === 0 ? (
            <div className="bg-surface px-4 py-6 text-center">
              <p className="text-[13px] font-semibold text-[#9EA3A8]">Нет активных записей</p>
            </div>
          ) : (
            debtors.map(({ student, stats }) => {
              const nextBooking = allBookings.find((e) =>
                e.booking.studentId === student.id &&
                e.booking.status === 'active' &&
                e.slot &&
                isAfter(getSlotDateTime(e.slot), now),
              )
              return (
                <div key={student.id} className="flex items-center justify-between gap-3 bg-surface px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black text-ink">{student.name}</p>
                    <p className="text-[11px] font-semibold text-[#9EA3A8]">{student.normalizedPhone}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-black text-ink">
                      {stats.activeFutureBookings} {stats.activeFutureBookings === 1 ? 'запись' : stats.activeFutureBookings < 5 ? 'записи' : 'записей'}
                    </p>
                    {nextBooking?.slot && (
                      <p className="text-[11px] font-semibold text-success">
                        {formatHumanDate(nextBooking.slot.date, false)} · {formatTimeRange(nextBooking.slot)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Paid Packages */}
      <div className="mt-3">
        <div className="border-b border-border bg-surface px-3 py-2">
          <h2 className="text-[13px] font-black text-ink">
            Оплаченные пакеты
            <span className="ml-2 text-[11px] font-bold text-[#9EA3A8]">{paidStudents.length} учеников</span>
          </h2>
        </div>
        <div className="divide-y divide-border">
          {paidStudents.length === 0 ? (
            <div className="bg-surface px-4 py-6 text-center">
              <p className="text-[13px] font-semibold text-[#9EA3A8]">Нет оплаченных занятий</p>
            </div>
          ) : (
            paidStudents.map(({ student, stats, revenue }) => (
              <div key={student.id} className="flex items-center justify-between gap-3 bg-surface px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black text-ink">{student.name}</p>
                  <p className="text-[11px] font-semibold text-[#9EA3A8]">{student.normalizedPhone}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-black text-success">{revenue.toLocaleString('ru-RU')} ₽</p>
                  <p className="text-[11px] font-semibold text-[#9EA3A8]">{stats.completedBookings} занятий</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cancellations */}
      <div className="mt-3">
        <div className="border-b border-border bg-surface px-3 py-2">
          <h2 className="text-[13px] font-black text-ink">Отменённые занятия</h2>
        </div>
        <div className="bg-surface px-3 py-4 text-center">
          <p className="text-[28px] font-black text-error">{cancellations}</p>
          <p className="text-[11px] font-semibold text-[#9EA3A8]">
            {cancellations === 0 ? 'Нет отмен' : cancellations === 1 ? 'отмена' : cancellations < 5 ? 'отмены' : 'отмен'}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-3 pb-4">
        <div className="border-t border-border bg-surface px-3 py-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#9EA3A8]">Итого за всё время</p>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <div className="text-center rounded-lg border border-border bg-surface-soft p-2">
              <p className="text-[18px] font-black text-ink">{allBookings.filter((e) => e.booking.status === 'completed').length}</p>
              <p className="text-[10px] font-semibold text-[#9EA3A8]">проведено</p>
            </div>
            <div className="text-center rounded-lg border border-border bg-surface-soft p-2">
              <p className="text-[18px] font-black text-error">{cancellations}</p>
              <p className="text-[10px] font-semibold text-[#9EA3A8]">отменено</p>
            </div>
            <div className="text-center rounded-lg border border-border bg-surface-soft p-2">
              <p className="text-[18px] font-black text-success">
                {Math.round(allBookings.filter((e) => e.booking.status === 'completed').reduce((sum, e) => sum + (e.slot?.duration ?? 90) / 60 * LESSON_PRICE, 0)).toLocaleString('ru-RU')} ₽
              </p>
              <p className="text-[10px] font-semibold text-[#9EA3A8]">выручка</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
