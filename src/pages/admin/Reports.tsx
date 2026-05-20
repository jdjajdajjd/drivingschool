import { useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminPayments, adminCars, adminDocuments, adminGIBDDExams, adminInternalExams, adminSettings, auditLog, getDebtForStudent, problemCases, studentProgress } from '../../services/adminStorage'
import { getSlotDateTime } from '../../services/bookingService'
import type { AuditAction } from '../../types'

type AuditFilter = 'all' | AuditAction

type ReportTab = 'overview' | 'finance' | 'instructors' | 'cars' | 'audit'

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours > 0 && rest > 0) return `${hours}ч ${rest}м`
  if (hours > 0) return `${hours}ч`
  return `${rest}м`
}

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
    const documents = adminDocuments.all(school.id)
    const problems = problemCases.all(school.id)
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
    const studentsWithDebt = students.filter((student) => getDebtForStudent(student.id) > 0)
    const studentsWithoutFutureBooking = students.filter((student) => !bookings.some((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return booking.studentId === student.id && booking.status === 'active' && slot !== null && getSlotDateTime(slot) > now
    }))
    const documentsNeedAttention = documents.filter((doc) => doc.status === 'missing' || doc.status === 'rejected' || doc.status === 'expired')
    const activeProblems = problems.filter((problem) => problem.status === 'open' || problem.status === 'in_progress')

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
      const carInstructorIds = instructors.filter((instructor) => instructor.car === car.id).map((instructor) => instructor.id)
      const usingBookings = bookings.filter((b) => {
        const slot = db.slots.byId(b.slotId)
        return slot && carInstructorIds.includes(b.instructorId)
      }).length
      const completedMinutes = bookings.filter((b) => b.status === 'completed' && carInstructorIds.includes(b.instructorId)).reduce((sum, booking) => {
        const slot = db.slots.byId(booking.slotId)
        return sum + (slot?.duration ?? 0)
      }, 0)
      const hasExpiredInsurance = car.insuranceExpiry ? new Date(car.insuranceExpiry) < now : false
      const serviceSoon = car.nextServiceDate ? new Date(car.nextServiceDate) <= new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) : false
      return { car, usingBookings, instructorsCount: carInstructorIds.length, completedMinutes, hasExpiredInsurance, serviceSoon }
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
      studentsWithDebt: studentsWithDebt.length,
      studentsWithoutFutureBooking: studentsWithoutFutureBooking.length,
      documentsNeedAttention: documentsNeedAttention.length,
      activeProblems: activeProblems.length,
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
    payment_refund: 'Возврат',
    student_created: 'Новый ученик',
    student_note: 'Заметка по ученику',
    student_updated: 'Изменение ученика',
    instructor_created: 'Новый инструктор',
    instructor_updated: 'Изменение инструктора',
    car_created: 'Новая машина',
    car_status_changed: 'Статус машины',
    car_updated: 'Изменение машины',
    document_uploaded: 'Документ загружен',
    document_verified: 'Документ проверен',
    document_rejected: 'Документ отклонён',
    exam_result_set: 'Результат экзамена',
    settings_changed: 'Настройки',
    user_created: 'Новый сотрудник',
    user_updated: 'Изменение сотрудника',
    slot_created: 'Окно создано',
    slot_cancelled: 'Окно отменено',
  }

  const auditOptions = Object.entries(actionLabels)

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
  const controlQueue = [
    { label: 'Ученики без будущей записи', value: data.studentsWithoutFutureBooking, tone: data.studentsWithoutFutureBooking ? 'text-[#075EBC]' : 'text-[#188447]', hint: 'Их надо вернуть в расписание или закрыть обучение.' },
    { label: 'Документы требуют внимания', value: data.documentsNeedAttention, tone: data.documentsNeedAttention ? 'text-[#C92820]' : 'text-[#188447]', hint: 'Отказы, просрочки и отсутствующие документы.' },
    { label: 'Открытые проблемы', value: data.activeProblems, tone: data.activeProblems ? 'text-[#C92820]' : 'text-[#188447]', hint: 'Жалобы, переносы, просрочки и ручные задачи.' },
    { label: 'Ученики с долгом', value: data.studentsWithDebt, tone: data.studentsWithDebt ? 'text-[#C92820]' : 'text-[#188447]', hint: 'Кому нельзя давать новые занятия без решения.' },
  ]


  function exportBackupJson() {
    if (!school) return
    const students = db.students.bySchool(school.id)
    const backup = {
      exportedAt: new Date().toISOString(),
      product: 'vroom.today',
      school,
      branches: db.branches.bySchool(school.id),
      instructors: db.instructors.bySchool(school.id),
      slots: db.slots.bySchool(school.id),
      bookings: db.bookings.bySchool(school.id),
      students,
      payments: adminPayments.all(school.id),
      documents: adminDocuments.all(school.id),
      cars: adminCars.all(school.id),
      internalExams: adminInternalExams.all(school.id),
      gibddExams: adminGIBDDExams.all(school.id),
      problemCases: problemCases.all(school.id),
      settings: adminSettings.get(school.id),
      progress: students.map((student) => studentProgress.get(student.id)).filter(Boolean),
      audit: auditLog.all(school.id, 2000),
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `vroom-backup-${school.slug}-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

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
    <div className="flex h-full flex-col bg-[#F5F7FA]">
      <div className="v-reports-header flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-[#E5EAF1] bg-white/92 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#667085]">контроль бизнеса</p>
          <h1 className="text-[24px] font-black tracking-[-0.03em] text-[#111827]">Отчёты</h1>
        </div>
        <p className="rounded-full border border-[#D7DEE8] bg-[#F8FAFC] px-3 py-1 text-[12px] font-bold text-[#667085]">{format(new Date(), 'MMMM yyyy', { locale: ru })}</p>
        <div className="v-toolbar-actions ml-auto flex flex-wrap gap-2">
          <button onClick={exportBackupJson} className="min-h-10 rounded-xl border border-[#D7DEE8] bg-[#111827] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#1F2937]">
            Скачать бэкап
          </button>
          <button onClick={exportCsv} className="min-h-10 rounded-xl border border-[#D7DEE8] bg-white px-4 py-2 text-[13px] font-bold text-[#334155] transition hover:bg-[#F8FAFC]">
            Скачать CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="v-reports-tabs flex flex-shrink-0 gap-1 overflow-x-auto border-b border-[#E5EAF1] bg-white px-3 md:px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-11 shrink-0 border-b-2 px-3 text-[13px] font-bold transition md:px-4 ${
              activeTab === tab.id ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#667085] hover:text-[#111827]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3 md:p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Выручка за месяц', value: `${data.monthRevenue.toLocaleString('ru-RU')} ₽`, color: 'text-green-600' },
                { label: 'Общий долг', value: `${data.totalDebt.toLocaleString('ru-RU')} ₽`, color: data.totalDebt > 0 ? 'text-red-500' : 'text-green-600' },
                { label: 'Активных записей', value: data.activeBookings.toString(), color: 'text-gray-900' },
                { label: 'Загрузка окон', value: `${data.slotUtilization}%`, color: data.slotUtilization < 60 ? 'text-red-500' : 'text-green-600' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[18px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
                  <p className="text-[13px] font-semibold text-[#667085]">{stat.label}</p>
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

            <div className="rounded-[18px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-bold text-[#111827]">Что директор должен держать под контролем</h3>
                  <p className="mt-1 text-[13px] font-semibold text-[#667085]">Не общий шум, а четыре зоны, где школа реально теряет деньги и порядок.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {controlQueue.map((item) => (
                  <div key={item.label} className="rounded-[16px] border border-[#E5EAF1] bg-[#F8FBFE] p-4">
                    <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#667085]">{item.label}</p>
                    <strong className={`mt-2 block text-[30px] font-black ${item.tone}`}>{item.value}</strong>
                    <span className="mt-1 block text-[12px] font-semibold leading-4 text-[#667085]">{item.hint}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue chart */}
            <div className="rounded-[18px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
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
                    { label: 'Время', value: formatHours(totalHours) },
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
            {data.carStats.length === 0 ? (
              <div className="rounded-[18px] border border-[#D7DEE8] bg-white p-6 text-center shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <p className="text-[15px] font-black text-[#111827]">Машины пока не добавлены</p>
                <p className="mt-2 text-[13px] font-semibold text-[#667085]">После добавления автопарка здесь будет видно, какие машины работают, где ремонт и у кого скоро сервис.</p>
              </div>
            ) : data.carStats.map(({ car, usingBookings, instructorsCount, completedMinutes, hasExpiredInsurance, serviceSoon }) => (
              <div key={car.id} className="flex flex-col gap-3 rounded-2xl border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F1F5F9] text-[14px] font-black text-[#475569]">ТС</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{car.brand} {car.model}</p>
                  <p className="text-[12px] font-semibold text-gray-400">{car.licensePlate} · {car.transmission === 'auto' ? 'АКПП' : 'МКПП'}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-left sm:text-right">
                  <div>
                    <p className="text-[18px] font-black text-gray-900">{instructorsCount}</p>
                    <p className="text-[11px] font-semibold text-gray-400">инструкторов</p>
                  </div>
                  <div>
                  <p className="text-[18px] font-black text-gray-900">{usingBookings}</p>
                  <p className="text-[11px] font-semibold text-gray-400">записей</p>
                  </div>
                  <div>
                    <p className="text-[18px] font-black text-gray-900">{formatHours(completedMinutes)}</p>
                    <p className="text-[11px] font-semibold text-gray-400">проведено</p>
                  </div>
                </div>
                <span className={`w-fit rounded-lg px-2.5 py-1 text-[12px] font-bold ${
                  car.status === 'working' ? 'bg-green-50 text-green-600' :
                  car.status === 'repair' ? 'bg-red-50 text-red-500' :
                  car.status === 'maintenance' ? 'bg-[#EAF3FF] text-[#315A7C]' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {car.status === 'working' ? 'Работает' : car.status === 'repair' ? 'Ремонт' : car.status === 'maintenance' ? 'Обслуживание' : car.status}
                </span>
                {(hasExpiredInsurance || serviceSoon) ? (
                  <span className="w-fit rounded-lg bg-[#FFF7D6] px-2.5 py-1 text-[12px] font-bold text-[#8A6100]">
                    {hasExpiredInsurance ? 'ОСАГО просрочено' : 'Скоро сервис'}
                  </span>
                ) : null}
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
                {auditOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
