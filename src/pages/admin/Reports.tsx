import { useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminPayments, adminCars, auditLog } from '../../services/adminStorage'
import type { AuditAction } from '../../types'

type AuditFilter = 'all' | AuditAction

type ReportTab = 'overview' | 'finance' | 'instructors' | 'cars' | 'audit'

export function AdminReports() {
  const school = db.schools.currentAdmin()
  const [activeTab, setActiveTab] = useState<ReportTab>('overview')
  
  // Фильтры для журнала
  const [auditFilter, setAuditFilter] = useState<AuditFilter>('all')
  const [auditSearch, setAuditSearch] = useState('')

  const data = useMemo(() => {
    if (!school) return null
    const bookings = db.bookings.bySchool(school.id)
    const students = db.students.bySchool(school.id)
    const instructors = db.instructors.bySchool(school.id)
    const payments = adminPayments.all(school.id)
    const cars = adminCars.all(school.id)
    const now = new Date()
    const activeBookings = bookings.filter((booking) => booking.status === 'active').length
    const completedBookings = bookings.filter((booking) => booking.status === 'completed').length
    const cancelledBookings = bookings.filter((booking) => booking.status === 'cancelled').length
    const noShowBookings = bookings.filter((booking) => booking.status === 'no_show').length
    const availableSlots = db.slots.bySchool(school.id).filter((slot) => slot.status === 'available').length
    const bookedSlots = db.slots.bySchool(school.id).filter((slot) => slot.status === 'booked').length
    const slotUtilization = bookedSlots + availableSlots > 0 ? Math.round((bookedSlots / (bookedSlots + availableSlots)) * 100) : 0

    // This month
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const monthPayments = payments.filter((p) => {
      if (!p.paidAt) return false
      const d = new Date(p.paidAt)
      return d >= monthStart && d <= monthEnd
    })
    const monthRevenue = monthPayments.reduce((s, p) => s + p.paidAmount, 0)

    // By day of month
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const revenueByDay = days.map((day) => {
      const dayPayments = payments.filter((p) => {
        if (!p.paidAt) return false
        return isSameDay(new Date(p.paidAt), day)
      })
      return { day, revenue: dayPayments.reduce((s, p) => s + p.paidAmount, 0) }
    })

    // Overdue
    const overduePayments = payments.filter((p) => p.status === 'overdue')
    const totalDebt = overduePayments.reduce((s, p) => s + p.remainingAmount, 0)

    // Instructor stats
    const instructorStats = instructors.map((instructor) => {
      const iBookings = bookings.filter((b) => b.instructorId === instructor.id)
      const completed = iBookings.filter((b) => b.status === 'completed').length
      const noShow = iBookings.filter((b) => b.status === 'no_show').length
      const cancelled = iBookings.filter((b) => b.status === 'cancelled').length
      const totalHours = iBookings.filter((b) => b.status === 'completed').reduce((s, b) => {
        const slot = db.slots.byId(b.slotId)
        return s + (slot?.duration ?? 0)
      }, 0)
      return { instructor, completed, noShow, cancelled, totalHours }
    })

    // Car stats
    const carStats = cars.map((car) => {
      const usingBookings = bookings.filter((b) => {
        const slot = db.slots.byId(b.slotId)
        return slot && car.id
      }).length
      return { car, usingBookings }
    })

    // Recent audit
    const recentAudit = auditLog.all(school.id, 50)

    return {
      monthRevenue,
      activeBookings,
      completedBookings,
      cancelledBookings,
      noShowBookings,
      slotUtilization,
      totalDebt,
      overdueCount: overduePayments.length,
      monthPayments: monthPayments.length,
      studentCount: students.length,
      instructorCount: instructors.filter((i) => i.isActive).length,
      carCount: cars.filter((c) => c.status === 'working').length,
      revenueByDay,
      instructorStats,
      carStats,
      recentAudit,
      days,
    }
  }, [school?.id])

  if (!data) return null
  const reportData = data

  // Фильтрация журнала
  const filteredAudit = useMemo(() => {
    return data.recentAudit.filter((entry) => {
      if (auditFilter !== 'all' && entry.action !== auditFilter) return false
      if (auditSearch && !entry.description.toLowerCase().includes(auditSearch.toLowerCase())) return false
      return true
    })
  }, [data.recentAudit, auditFilter, auditSearch])

  const actionLabels: Record<string, string> = {
    booking_created: 'Создание записи',
    booking_cancelled: 'Отмена записи',
    booking_rescheduled: 'Перенос записи',
    booking_no_show: 'Неявка',
    booking_completed: 'Занятие засчитано',
    payment_added: 'Оплата',
    student_created: 'Новый ученик',
    student_updated: 'Изменение ученика',
    instructor_created: 'Новый инструктор',
    instructor_updated: 'Изменение инструктора',
    car_created: 'Новая машина',
    car_updated: 'Изменение машины',
    settings_changed: 'Настройки',
    user_created: 'Новый сотрудник',
    user_updated: 'Изменение сотрудника',
  }

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'overview', label: 'Обзор' },
    { id: 'finance', label: 'Финансы' },
    { id: 'instructors', label: 'Инструкторы' },
    { id: 'cars', label: 'Машины' },
    { id: 'audit', label: 'Журнал' },
  ]

  const maxRevenue = Math.max(...data.revenueByDay.map((d) => d.revenue), 1)
  const directorRisks = [
    data.totalDebt > 0 ? `${data.totalDebt.toLocaleString('ru-RU')} ₽ зависло в долгах` : 'Долги не обнаружены',
    data.noShowBookings > 0 ? `${data.noShowBookings} неявок требуют реакции` : 'Неявок не видно',
    data.slotUtilization < 60 ? `Загрузка окон ${data.slotUtilization}%: есть резерв продаж` : `Загрузка окон ${data.slotUtilization}%`,
  ]

  function exportCsv() {
    const rows = [
      ['Показатель', 'Значение'],
      ['Выручка за месяц', String(reportData.monthRevenue)],
      ['Долг', String(reportData.totalDebt)],
      ['Активные записи', String(reportData.activeBookings)],
      ['Проведено занятий', String(reportData.completedBookings)],
      ['Отмены', String(reportData.cancelledBookings)],
      ['Неявки', String(reportData.noShowBookings)],
      ['Загрузка окон', `${reportData.slotUtilization}%`],
    ]
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `vroom-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <h1 className="text-[24px] font-black text-gray-900">Отчёты</h1>
        <p className="text-[13px] font-semibold text-gray-400">{format(new Date(), 'MMMM yyyy', { locale: ru })}</p>
        <div className="ml-auto">
          <button onClick={exportCsv} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">
            Скачать CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-shrink-0 gap-1 border-b border-gray-100 bg-white px-4 md:px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-3 text-[13px] font-semibold transition ${
              activeTab === tab.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Выручка за месяц', value: `${data.monthRevenue.toLocaleString('ru-RU')} ₽`, color: 'text-green-600' },
                { label: 'Общий долг', value: `${data.totalDebt.toLocaleString('ru-RU')} ₽`, color: data.totalDebt > 0 ? 'text-red-500' : 'text-green-600' },
                { label: 'Активных записей', value: data.activeBookings.toString(), color: 'text-gray-900' },
                { label: 'Загрузка окон', value: `${data.slotUtilization}%`, color: data.slotUtilization < 60 ? 'text-red-500' : 'text-green-600' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5">
                  <p className="text-[13px] font-semibold text-gray-400">{stat.label}</p>
                  <p className={`mt-1 text-[28px] font-black ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {directorRisks.map((risk) => (
                <div key={risk} className="rounded-2xl border border-[#D7E2EC] bg-[#F8FBFE] p-4">
                  <p className="text-[12px] font-black uppercase text-[#667085]">Вывод для директора</p>
                  <p className="mt-2 text-[15px] font-bold leading-5 text-[#111827]">{risk}</p>
                </div>
              ))}
            </div>

            {/* Revenue chart */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-4 text-[16px] font-bold text-gray-900">Выручка по дням</h3>
              <div className="flex items-end gap-1" style={{ height: 120 }}>
                {data.revenueByDay.map((d, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm bg-blue-400 transition-all hover:bg-blue-500"
                      style={{ height: `${Math.max((d.revenue / maxRevenue) * 100, 2)}%` }}
                      title={`${format(d.day, 'd MMM')}: ${d.revenue.toLocaleString('ru-RU')} ₽`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <p className="text-[13px] font-semibold text-gray-400">Выручка за месяц</p>
                <p className="mt-1 text-[28px] font-black text-green-600">{data.monthRevenue.toLocaleString('ru-RU')} ₽</p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <p className="text-[13px] font-semibold text-red-400">Просроченные долги</p>
                <p className="mt-1 text-[28px] font-black text-red-500">{data.totalDebt.toLocaleString('ru-RU')} ₽</p>
                <p className="mt-1 text-[12px] font-semibold text-red-400">{data.overdueCount} учеников</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <p className="text-[13px] font-semibold text-gray-400">Платёжек за месяц</p>
                <p className="mt-1 text-[28px] font-black text-gray-900">{data.monthPayments}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'instructors' && (
          <div className="space-y-3">
            {data.instructorStats.map(({ instructor, completed, noShow, cancelled, totalHours }) => (
              <div key={instructor.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-[14px] font-black text-white" style={{ background: instructor.avatarColor }}>
                  {instructor.avatarInitials}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{instructor.name}</p>
                  <p className="text-[12px] font-semibold text-gray-400">{instructor.categories.join(', ')}</p>
                </div>
                <div className="flex gap-4">
                  {[
                    { label: 'Проведено', value: completed },
                    { label: 'Часы', value: Math.round(totalHours / 60) },
                    { label: 'Неявки', value: noShow },
                    { label: 'Отмены', value: cancelled },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className="text-[18px] font-black text-gray-900">{s.value}</p>
                      <p className="text-[10px] font-semibold text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'cars' && (
          <div className="space-y-3">
            {data.carStats.map(({ car, usingBookings }) => (
              <div key={car.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-100 text-[14px] font-black text-gray-600">ТС</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{car.brand} {car.model}</p>
                  <p className="text-[12px] font-semibold text-gray-400">{car.licensePlate}</p>
                </div>
                <div className="text-right">
                  <p className="text-[18px] font-black text-gray-900">{usingBookings}</p>
                  <p className="text-[11px] font-semibold text-gray-400">записей</p>
                </div>
                <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${
                  car.status === 'working' ? 'bg-green-50 text-green-600' :
                  car.status === 'repair' ? 'bg-red-50 text-red-500' :
                  car.status === 'maintenance' ? 'bg-[#EAF3FF] text-[#315A7C]' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {car.status === 'working' ? 'Работает' : car.status === 'repair' ? 'Ремонт' : car.status === 'maintenance' ? 'Обслуживание' : car.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4">
            {/* Фильтры */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Поиск..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] w-64"
              />
              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value as AuditFilter)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-[13px]"
              >
                <option value="all">Все действия</option>
                <option value="booking_created">Создание записи</option>
                <option value="booking_cancelled">Отмена записи</option>
                <option value="booking_rescheduled">Перенос записи</option>
                <option value="booking_no_show">Неявка</option>
                <option value="booking_completed">Занятие засчитано</option>
                <option value="payment_added">Оплата</option>
                <option value="student_created">Новый ученик</option>
                <option value="instructor_created">Новый инструктор</option>
                <option value="car_created">Новая машина</option>
                <option value="settings_changed">Настройки</option>
                <option value="user_created">Новый сотрудник</option>
              </select>
              <span className="text-[12px] text-gray-400">{filteredAudit.length} записей</span>
            </div>

            {/* Список */}
            <div className="space-y-2">
              {filteredAudit.length === 0 ? (
                <p className="py-8 text-center text-gray-400">Записей не найдено</p>
              ) : (
                filteredAudit.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 rounded-xl border border-gray-50 bg-gray-50/30 p-3">
                    <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-gray-300" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-semibold text-gray-500">
                          {actionLabels[entry.action] || entry.action}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-gray-900">{entry.description}</p>
                      {entry.oldValue && entry.newValue && (
                        <div className="mt-1.5 flex gap-2 text-[11px]">
                          <span className="text-red-500 line-through">{entry.oldValue}</span>
                          <span className="text-gray-300">→</span>
                          <span className="text-green-600">{entry.newValue}</span>
                        </div>
                      )}
                      <p className="mt-1 text-[12px] font-semibold text-gray-400">
                        {entry.userName} · {format(new Date(entry.createdAt), 'd MMM, HH:mm', { locale: ru })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
