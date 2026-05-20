import { useEffect, useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminPayments, adminCars, adminDocuments, adminGIBDDExams, adminInternalExams, adminSettings, auditLog, getDebtForStudent, problemCases, studentProgress } from '../../services/adminStorage'
import { getSlotDateTime } from '../../services/bookingService'
import { getSchoolLifecycleStates } from '../../services/studentLifecycle'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { getPreference, setPreference } from '../../services/preferenceStorage'
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
  const salaryPreferenceKey = school ? `vroom:reports:instructor-hour-rate:${school.id}` : 'vroom:reports:instructor-hour-rate'
  const [activeTab, setActiveTab] = useState<ReportTab>('overview')
  const [instructorHourRate, setInstructorHourRate] = useState(() => Number(getPreference(salaryPreferenceKey) ?? '800') || 800)
  
  // Фильтры для журнала
  const [auditFilter, setAuditFilter] = useState<AuditFilter>('all')
  const [auditSearch, setAuditSearch] = useState('')

  useEffect(() => {
    if (!school) return
    setInstructorHourRate(Number(getPreference(`vroom:reports:instructor-hour-rate:${school.id}`) ?? '800') || 800)
  }, [school?.id])

  const data = useMemo(() => {
    if (!school) return null
    const bookings = db.bookings.bySchool(school.id)
    const students = db.students.bySchool(school.id)
    const instructors = db.instructors.bySchool(school.id)
    const payments = adminPayments.all(school.id)
    const cars = adminCars.all(school.id)
    const documents = adminDocuments.all(school.id)
    const problems = problemCases.all(school.id)
    const lifecycleStates = getSchoolLifecycleStates(school.id)
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
    const debtPayments = payments.filter((p) => ['overdue', 'partial', 'unpaid', 'disputed'].includes(p.status) && p.remainingAmount > 0)
    const totalDebt = debtPayments.reduce((s, p) => s + p.remainingAmount, 0)
    const debtLedger = debtPayments.map((payment) => ({ payment, student: students.find((student) => student.id === payment.studentId) ?? null })).sort((left, right) => right.payment.remainingAmount - left.payment.remainingAmount)
    const debtBuckets = debtPayments.reduce((bucket, payment) => {
      if (!payment.dueDate) { bucket.noDate += payment.remainingAmount; return bucket }
      const days = Math.floor((now.getTime() - new Date(payment.dueDate).getTime()) / (24 * 60 * 60 * 1000))
      if (days <= 0) bucket.current += payment.remainingAmount
      else if (days <= 7) bucket.week += payment.remainingAmount
      else if (days <= 30) bucket.month += payment.remainingAmount
      else bucket.old += payment.remainingAmount
      return bucket
    }, { current: 0, week: 0, month: 0, old: 0, noDate: 0 })
    const studentsWithDebt = students.filter((student) => getDebtForStudent(student.id) > 0)
    const studentsWithoutFutureBooking = students.filter((student) => !bookings.some((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return booking.studentId === student.id && booking.status === 'active' && slot !== null && getSlotDateTime(slot) > now
    }))
    const documentsNeedAttention = documents.filter((doc) => doc.status === 'missing' || doc.status === 'rejected' || doc.status === 'expired')
    const activeProblems = problems.filter((problem) => problem.status === 'open' || problem.status === 'in_progress')
    const lifecycleBlocked = lifecycleStates.filter((state) => state.blockers.length > 0)
    const lowestReadiness = lifecycleStates.slice(0, 8)
    const debtQueue = lifecycleStates.filter((state) => state.debt > 0).sort((left, right) => right.debt - left.debt).slice(0, 8)
    const noFutureQueue = lifecycleStates.filter((state) => state.futureLessons === 0 && !['Выпуск'].includes(state.currentStep)).slice(0, 8)
    const practiceQueue = lifecycleStates.filter((state) => {
      const progress = studentProgress.get(state.student.id)
      const total = progress?.drivingHoursTotal ?? 0
      const done = progress?.confirmedHours ?? progress?.drivingHoursCompleted ?? 0
      return total > 0 && done < total && state.futureLessons === 0
    }).slice(0, 8)
    const examQueue = lifecycleStates.filter((state) => {
      const progress = studentProgress.get(state.student.id)
      const total = progress?.drivingHoursTotal ?? 56
      const done = progress?.confirmedHours ?? 0
      return done >= total && !progress?.internalExamPassed
    }).slice(0, 8)

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
      debtLedger,
      debtBuckets,
      monthPayments: monthPayments.length,
      studentCount: students.length,
      instructorCount: instructors.filter((i) => i.isActive).length,
      carCount: cars.filter((c) => c.status === 'working').length,
      revenueByDay,
      instructorStats,
      carStats,
      recentAudit,
      days,
      lifecycleBlocked,
      lowestReadiness,
      debtQueue,
      noFutureQueue,
      practiceQueue,
      examQueue,
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
  const adminBasePath = getAdminBasePathForLocation()
  const instructorPayroll = data.instructorStats.map((stat) => {
    const completedHours = stat.totalHours / 60
    const payout = Math.round(completedHours * instructorHourRate)
    const risk = !stat.instructor.isActive ? 'Неактивен' : stat.completed === 0 ? 'Нет проведённых занятий' : stat.noShow + stat.cancelled >= 3 ? 'Много срывов' : 'Норма'
    return { ...stat, completedHours, payout, risk }
  })
  const payrollTotal = instructorPayroll.reduce((sum, stat) => sum + stat.payout, 0)
  const completedInstructorMinutes = instructorPayroll.reduce((sum, stat) => sum + stat.totalHours, 0)
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
  const directorActionQueue = [
    ...data.debtQueue.map((state) => ({
      id: `debt-${state.student.id}`,
      studentId: state.student.id,
      title: state.student.name,
      meta: `Долг ${state.debt.toLocaleString('ru-RU')} ₽`,
      action: 'Связаться по оплате',
      tone: 'danger',
    })),
    ...data.noFutureQueue.map((state) => ({
      id: `future-${state.student.id}`,
      studentId: state.student.id,
      title: state.student.name,
      meta: state.blockers.slice(0, 2).join(' · ') || state.currentStep,
      action: 'Поставить занятие',
      tone: 'info',
    })),
    ...data.practiceQueue.map((state) => ({
      id: `practice-${state.student.id}`,
      studentId: state.student.id,
      title: state.student.name,
      meta: 'Практика не закрыта, будущей записи нет',
      action: 'Дать окно',
      tone: 'warning',
    })),
    ...data.examQueue.map((state) => ({
      id: `exam-${state.student.id}`,
      studentId: state.student.id,
      title: state.student.name,
      meta: 'Часы закрыты, внутренний экзамен не сдан',
      action: 'Назначить экзамен',
      tone: 'danger',
    })),
    ...data.lowestReadiness.filter((state) => state.blockers.length).map((state) => ({
      id: `path-${state.student.id}`,
      studentId: state.student.id,
      title: state.student.name,
      meta: `${state.readiness}% готовности · ${state.blockers.slice(0, 2).join(' · ')}`,
      action: state.nextAction,
      tone: 'warning',
    })),
  ].filter((item, index, items) => items.findIndex((current) => current.studentId === item.studentId && current.action === item.action) === index).slice(0, 10)


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

  function downloadCsv(rows: Array<Array<string | number>>, fileName: string) {
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = fileName
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
    downloadCsv(rows, `vroom-report-${format(new Date(), 'yyyy-MM-dd')}.csv`)
  }

  function exportDebtLedgerCsv() {
    const rows = [
      ['Ученик', 'Телефон', 'Назначение', 'Статус', 'Остаток', 'Срок оплаты'],
      ...reportData.debtLedger.map(({ payment, student }) => [
        student?.name ?? 'Ученик не найден',
        student?.phone ?? '',
        payment.description,
        payment.status,
        payment.remainingAmount,
        payment.dueDate ?? '',
      ]),
      ['Итого', '', '', '', reportData.totalDebt, ''],
    ]
    downloadCsv(rows, `vroom-debt-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`)
  }

  function exportInstructorPayrollCsv() {
    const rows = [
      ['Инструктор', 'Проведено занятий', 'Проведено часов', 'Неявки', 'Отмены', 'Ставка за час', 'К выплате', 'Статус'],
      ...instructorPayroll.map((stat) => [
        stat.instructor.name,
        stat.completed,
        formatHours(stat.totalHours),
        stat.noShow,
        stat.cancelled,
        instructorHourRate,
        stat.payout,
        stat.risk,
      ]),
      ['Итого', '', formatHours(completedInstructorMinutes), '', '', instructorHourRate, payrollTotal, ''],
    ]
    downloadCsv(rows, `vroom-instructor-payroll-${format(new Date(), 'yyyy-MM-dd')}.csv`)
  }

  function updateInstructorHourRate(value: string) {
    const next = Math.max(0, Number(value) || 0)
    setInstructorHourRate(next)
    setPreference(salaryPreferenceKey, String(next))
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

            <div className="rounded-[18px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-bold text-[#111827]">Очередь действий директора</h3>
                  <p className="mt-1 text-[13px] font-semibold text-[#667085]">Кого дожать по деньгам, кого вернуть в расписание и кто застрял на пути обучения.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[12px] font-black ${directorActionQueue.length ? 'bg-[#FFF3F2] text-[#B42318]' : 'bg-[#EAF7EF] text-[#157347]'}`}>{directorActionQueue.length ? `${directorActionQueue.length} задач` : 'всё чисто'}</span>
              </div>
              {directorActionQueue.length === 0 ? (
                <div className="mt-4 rounded-[16px] border border-[#E5EAF1] bg-[#F8FBFE] p-4 text-[13px] font-bold text-[#667085]">Критичных хвостов не видно. Следующий фокус — загрузка свободных окон и качество выпусков.</div>
              ) : (
                <div className="mt-4 divide-y divide-[#111827]/[0.06] overflow-hidden rounded-[16px] border border-[#E5EAF1]">
                  {directorActionQueue.map((item) => (
                    <a key={item.id} href={`${adminBasePath}/students/${item.studentId}`} className="grid gap-2 bg-white p-3 transition hover:bg-[#F8FAFC] sm:grid-cols-[minmax(0,1fr)_170px]">
                      <span className="min-w-0">
                        <strong className="block truncate text-[14px] font-black text-[#111827]">{item.title}</strong>
                        <span className="mt-1 block text-[12px] font-semibold leading-4 text-[#667085]">{item.meta}</span>
                      </span>
                      <span className={`self-center rounded-[12px] px-3 py-2 text-center text-[12px] font-black ${item.tone === 'danger' ? 'bg-[#FFF3F2] text-[#B42318]' : item.tone === 'warning' ? 'bg-[#FFF7D6] text-[#8A6100]' : 'bg-[#EAF3FF] text-[#315A7C]'}`}>{item.action}</span>
                    </a>
                  ))}
                </div>
              )}
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
                <p className="text-[13px] font-semibold text-red-400">Долги под контролем</p>
                <p className="mt-1 text-[28px] font-black text-red-500">{data.totalDebt.toLocaleString('ru-RU')} ₽</p>
                <p className="mt-1 text-[12px] font-semibold text-red-400">{data.debtLedger.length} платежей требуют реакции</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <p className="text-[13px] font-semibold text-gray-400">Платёжек за месяц</p>
                <p className="mt-1 text-[28px] font-black text-gray-900">{data.monthPayments}</p>
              </div>
            </div>

            <div className="rounded-[18px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-black text-[#111827]">Возраст долгов</h3>
                  <p className="mt-1 text-[13px] font-semibold text-[#667085]">Директору видно не просто сумму, а насколько давно деньги зависли.</p>
                </div>
                <button type="button" onClick={exportDebtLedgerCsv} className="min-h-10 rounded-xl border border-[#D7DEE8] bg-white px-4 py-2 text-[13px] font-bold text-[#334155] transition hover:bg-[#F8FAFC]">Выгрузить долги</button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ['Срок ещё не вышел', data.debtBuckets.current, 'text-[#315A7C]'],
                  ['1-7 дней', data.debtBuckets.week, 'text-[#8A6100]'],
                  ['8-30 дней', data.debtBuckets.month, 'text-[#C92820]'],
                  ['30+ дней', data.debtBuckets.old, 'text-[#C92820]'],
                  ['Без срока', data.debtBuckets.noDate, 'text-[#667085]'],
                ].map(([label, value, tone]) => (
                  <div key={label} className="rounded-[16px] border border-[#E5EAF1] bg-[#F8FAFC] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.07em] text-[#667085]">{label}</p>
                    <p className={`mt-2 text-[20px] font-black ${tone}`}>{Number(value).toLocaleString('ru-RU')} ₽</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'instructors' && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-[18px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:grid-cols-[1fr_auto_auto] md:items-end md:p-5">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#667085]">зарплата инструкторов</p>
                <h3 className="mt-1 text-[18px] font-black text-[#111827]">{payrollTotal.toLocaleString('ru-RU')} ₽ к ручной выплате</h3>
                <p className="mt-1 text-[13px] font-semibold leading-5 text-[#667085]">Расчёт по проведённым занятиям. Ставку можно поменять перед выгрузкой в бухгалтерию.</p>
              </div>
              <label className="block min-w-[180px]">
                <span className="text-[12px] font-bold text-[#667085]">Ставка за час</span>
                <div className="mt-1 flex min-h-11 items-center rounded-xl border border-[#D7DEE8] bg-[#F8FAFC] px-3">
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={instructorHourRate}
                    onChange={(event) => updateInstructorHourRate(event.target.value)}
                    className="w-full bg-transparent text-[15px] font-black text-[#111827] outline-none"
                  />
                  <span className="text-[13px] font-bold text-[#667085]">₽</span>
                </div>
              </label>
              <button onClick={exportInstructorPayrollCsv} className="min-h-11 rounded-xl border border-[#D7DEE8] bg-[#111827] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#1F2937]">
                Выгрузить зарплату
              </button>
            </div>

            {instructorPayroll.length === 0 ? (
              <div className="rounded-[18px] border border-[#D7DEE8] bg-white p-6 text-center shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <p className="text-[15px] font-black text-[#111827]">Инструкторы пока не добавлены</p>
                <p className="mt-2 text-[13px] font-semibold text-[#667085]">После добавления сотрудников здесь появятся часы, неявки и сумма к выплате.</p>
              </div>
            ) : instructorPayroll.map(({ instructor, completed, noShow, cancelled, totalHours, payout, risk }) => (
              <div key={instructor.id} className="grid gap-3 rounded-2xl border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[14px] font-black text-white" style={{ background: instructor.avatarColor }}>
                    {instructor.avatarInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900">{instructor.name}</p>
                    <p className="mt-0.5 truncate text-[12px] font-semibold text-gray-400">{instructor.categories.join(', ') || 'категории не указаны'}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${risk === 'Норма' ? 'bg-[#EAF7EF] text-[#157347]' : risk === 'Много срывов' ? 'bg-[#FFF7D6] text-[#8A6100]' : 'bg-[#FFF3F2] text-[#B42318]'}`}>{risk}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 md:min-w-[560px]">
                  {[
                    { label: 'Проведено', value: completed },
                    { label: 'Время', value: formatHours(totalHours) },
                    { label: 'Неявки', value: noShow },
                    { label: 'Отмены', value: cancelled },
                    { label: 'К выплате', value: `${payout.toLocaleString('ru-RU')} ₽`, strong: true },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-xl border p-3 ${item.strong ? 'border-[#CFE8D8] bg-[#F1FAF4]' : 'border-[#E5EAF1] bg-[#F8FAFC]'}`}>
                      <p className={`text-[16px] font-black ${item.strong ? 'text-[#157347]' : 'text-gray-900'}`}>{item.value}</p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-400">{item.label}</p>
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
