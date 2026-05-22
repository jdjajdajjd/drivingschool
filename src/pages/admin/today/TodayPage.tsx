import { useState, useEffect, useCallback } from 'react'
import { format, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { KpiStrip } from '../../../components/admin/core/KpiStrip'
import { StatusPill } from '../../../components/admin/core/StatusPill'
import { BottomSheet } from '../../../components/admin/core/BottomSheet'
import { db } from '../../../services/storage'
import { getTodayBookings, getSlotDateTime, getUpcomingBookings } from '../../../services/bookingService'
import { getAvailableSlots } from '../../../services/slotService'
import type { ResolvedBooking } from '../../../types'
import { formatDuration } from '../../../lib/utils'
import { CalendarPlus, CheckCircle, Lightning, NavArrowRight, Phone, Refresh, Student, WarningTriangle } from '@/components/icons/lucide'
import { InstructorAvatarName } from '../../../components/admin/InstructorAvatarName'

const PhoneIcon = () => <Phone className="h-4 w-4" strokeWidth={2.5} />
const CalendarIcon = () => <CalendarPlus className="h-4 w-4" strokeWidth={2.5} />
const CheckIcon = () => <CheckCircle className="h-4 w-4" strokeWidth={2.5} />
const AlertIcon = () => <WarningTriangle className="h-4 w-4" strokeWidth={2.5} />
const BoltIcon = () => <Lightning className="h-4 w-4" strokeWidth={2.5} />
const UserIcon = () => <Student className="h-5 w-5" strokeWidth={2} />

export function TodayPage() {
  const [, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState<'bookings' | 'alerts' | 'quick'>('bookings')
  const [selectedBooking, setSelectedBooking] = useState<ResolvedBooking | null>(null)
  const [showRescheduleSheet, setShowRescheduleSheet] = useState(false)
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string>('')

  // Load school ID from current user context
  useEffect(() => {
    const schools = db.schools.all()
    if (schools.length > 0) {
      setSchoolId(schools[0].id)
    }
  }, [])

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  // Get today's date string
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Compute KPIs
  const bookings = schoolId ? getTodayBookings(schoolId) : []
  const availableSlots = schoolId ? getAvailableSlots(undefined, todayStr) : []
  const cancelledToday = bookings.filter(b => b.booking.status === 'cancelled').length
  const activeBookings = bookings.filter(b => b.booking.status === 'active')

  // Sort bookings by time
  const sortedBookings = [...activeBookings].sort((a, b) => {
    if (!a.slot || !b.slot) return 0
    return getSlotDateTime(a.slot).getTime() - getSlotDateTime(b.slot).getTime()
  })

  // Alerts section - problems needing attention
  const alerts = [
    ...availableSlots.slice(0, 3).map(slot => ({ slot, type: 'orphan_slot' as const })),
  ]

  // Upcoming bookings for quick actions
  const upcomingBookings = schoolId 
    ? getUpcomingBookings(schoolId).slice(0, 10)
    : []

  const kpiItems = [
    { label: 'Занятий', value: activeBookings.length, trend: 'neutral' as const },
    { label: 'Свободных', value: availableSlots.length, trend: 'neutral' as const },
    { label: 'Отмен', value: cancelledToday, trend: 'neutral' as const },
    { label: 'Проведено', value: bookings.filter(b => b.booking.status === 'completed').length, trend: 'neutral' as const },
  ]

  // Handle phone call
  const handleCall = (booking: ResolvedBooking) => {
    if (booking.student?.phone || booking.booking.studentPhone) {
      const phone = booking.student?.phone || booking.booking.studentPhone
      window.location.href = `tel:+${phone}`
    }
  }

  // Handle reschedule
  const handleReschedule = (booking: ResolvedBooking) => {
    setSelectedBooking(booking)
    setShowRescheduleSheet(true)
  }

  // Handle complete
  const handleComplete = (bookingId: string) => {
    if (confirmCompleteId === bookingId) {
      // Actually complete
      const { completeBooking } = require('../../../services/bookingService')
      completeBooking(bookingId)
      setConfirmCompleteId(null)
      refresh()
    } else {
      setConfirmCompleteId(bookingId)
      setTimeout(() => setConfirmCompleteId(null), 3000)
    }
  }

  // Lesson type label
  const getLessonTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      driving: 'Вождение',
      main: 'Основной',
      extra: 'Доп. занятие',
      practice_ground: 'Площадка',
      city: 'Город',
      exam_route: 'Экзаменационный',
      internal_exam: 'Внутренний экз.',
      retake: 'Пересдача',
      mistakes: 'Разбор ошибок',
    }
    return type ? labels[type] || type : 'Вождение'
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                {format(new Date(), 'EEEE', { locale: ru })}
              </p>
              <h1 className="text-[24px] font-black tracking-tight text-ink">
                {format(new Date(), 'd MMMM', { locale: ru })}
              </h1>
            </div>
            <button
              onClick={refresh}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-surface text-text-muted transition hover:border-border-strong active:scale-95"
            >
              <Refresh className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pb-2">
          {[
            { key: 'bookings', label: 'Расписание' },
            { key: 'alerts', label: 'Внимание', badge: alerts.length || undefined },
            { key: 'quick', label: 'Действия' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`relative flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12px] font-bold transition ${
                activeTab === tab.key
                  ? 'bg-ink text-surface'
                  : 'text-text-muted hover:bg-surface-soft'
              }`}
            >
              {tab.label}
              {tab.badge ? (
                <span className={`flex h-4 min-w-[16px] items-center justify-center rounded-full text-[10px] font-black ${
                  activeTab === tab.key ? 'bg-accent text-ink' : 'bg-error text-surface'
                }`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* KPI Strip */}
        <KpiStrip items={kpiItems} />

        {/* Main content based on tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-widest text-text-muted">
                Ближайшие занятия
              </h2>
              <span className="text-[11px] font-bold text-text-soft">
                {sortedBookings.length} всего
              </span>
            </div>

            {sortedBookings.length === 0 ? (
              <div className="rounded-[14px] border border-border bg-surface p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[12px] bg-surface-soft">
                  <CalendarIcon />
                </div>
                <p className="text-[14px] font-bold text-ink">Нет занятий на сегодня</p>
                <p className="mt-1 text-[12px] text-text-muted">Добавьте свободное время в разделе Расписание</p>
              </div>
            ) : (
              sortedBookings.map((entry, idx) => {
                const { booking, slot, instructor, branch, student } = entry
                if (!slot) return null

                const slotTime = getSlotDateTime(slot)
                const isPast = slotTime.getTime() < Date.now()
                const isNow = isSameDay(slotTime, new Date()) && 
                  Math.abs(slotTime.getTime() - Date.now()) < 45 * 60 * 1000

                return (
                  <div
                    key={booking.id}
                    className={`rounded-[14px] border bg-surface p-3 transition ${
                      isPast
                        ? 'border-border opacity-60'
                        : isNow
                        ? 'border-accent/40 bg-accent-soft/30'
                        : 'border-border'
                    }`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Time header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[18px] font-black tracking-tight ${
                          isNow ? 'text-accent-dark' : 'text-ink'
                        }`}>
                          {format(slotTime, 'HH:mm')}
                        </span>
                        {isNow && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-black text-ink">
                            СЕЙЧАС
                          </span>
                        )}
                        {isPast && (
                          <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-bold text-text-muted">
                            ПРОШЛО
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill
                          label={getLessonTypeLabel(slot.lessonType)}
                          status="neutral"
                          size="sm"
                        />
                        <span className="text-[11px] font-bold text-text-muted">
                          {formatDuration(slot.duration)}
                        </span>
                      </div>
                    </div>

                    {/* Student info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-soft">
                        <UserIcon />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-ink">
                          {student?.name || booking.studentName}
                        </p>
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-[12px] text-text-muted">
                          <InstructorAvatarName instructor={instructor} name="—" compact className="min-w-0" />
                          <span className="truncate">{branch?.name || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCall(entry)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-surface-soft py-2 text-[12px] font-bold text-ink transition hover:border-border-strong active:scale-95"
                      >
                        <PhoneIcon />
                        Позвонить
                      </button>
                      <button
                        onClick={() => handleReschedule(entry)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-surface-soft py-2 text-[12px] font-bold text-ink transition hover:border-border-strong active:scale-95"
                      >
                        <CalendarIcon />
                        Перенести
                      </button>
                      <button
                        onClick={() => handleComplete(booking.id)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2 text-[12px] font-bold transition active:scale-95 ${
                          confirmCompleteId === booking.id
                            ? 'bg-success text-surface'
                            : 'border border-success/30 bg-success-soft text-success hover:bg-success hover:text-surface'
                        }`}
                      >
                        <CheckIcon />
                        {confirmCompleteId === booking.id ? 'Подтвердить' : 'Отметить'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-2">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-text-muted">
              Требует внимания
            </h2>

            {/* No alerts state */}
            <div className="rounded-[14px] border border-success/20 bg-success-soft p-6 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-[10px] bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" strokeWidth={2.5} />
              </div>
              <p className="text-[14px] font-bold text-success">Всё в порядке!</p>
              <p className="mt-1 text-[12px] text-text-muted">Нет проблем, требующих внимания</p>
            </div>

            {/* Example alert items (would be populated from real data) */}
            {[
              { icon: <AlertIcon />, title: 'Оплата не поступила', desc: 'Иванов И.И. — 5000 ₽', level: 'error' as const },
              { icon: <CalendarIcon />, title: 'Нет свободного времени', desc: 'Петров П.П. записан, но нет окон', level: 'warning' as const },
              { icon: <AlertIcon />, title: 'Не подтверждено', desc: '3 записи без подтверждения', level: 'warning' as const },
            ].map((alert, i) => (
              <button
                key={i}
                className={`flex w-full items-center gap-3 rounded-[14px] border bg-surface p-3 text-left transition hover:border-border-strong active:scale-[0.99] ${
                  alert.level === 'error' ? 'border-error/30' : 'border-warning/30'
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${
                  alert.level === 'error' ? 'bg-error-soft text-error' : 'bg-warning-soft text-warning'
                }`}>
                  {alert.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ink">{alert.title}</p>
                  <p className="truncate text-[11px] text-text-muted">{alert.desc}</p>
                </div>
                <NavArrowRight className="h-4 w-4 text-text-soft" strokeWidth={2} />
              </button>
            ))}
          </div>
        )}

        {activeTab === 'quick' && (
          <div className="space-y-3">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-text-muted">
              Быстрые действия
            </h2>

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <CalendarIcon />, label: 'Добавить время', desc: 'Новое окно', color: 'info' },
                { icon: <UserIcon />, label: 'Добавить ученика', desc: 'Новая запись', color: 'success' },
                { icon: <BoltIcon />, label: 'Массовое\nсоздание', desc: 'Несколько окон', color: 'accent' },
                { icon: <PhoneIcon />, label: 'Позвонить\nклиенту', desc: 'Из записи', color: 'warning' },
              ].map((action, i) => (
                <button
                  key={i}
                  className={`flex flex-col items-start gap-2 rounded-[14px] border border-border bg-surface p-3 text-left transition hover:border-border-strong active:scale-[0.98] ${
                    action.color === 'info' ? 'hover:border-info/40' :
                    action.color === 'success' ? 'hover:border-success/40' :
                    action.color === 'accent' ? 'hover:border-accent/40' :
                    'hover:border-warning/40'
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${
                    action.color === 'info' ? 'bg-info-soft text-info' :
                    action.color === 'success' ? 'bg-success-soft text-success' :
                    action.color === 'accent' ? 'bg-accent-soft text-accent-dark' :
                    'bg-warning-soft text-warning'
                  }`}>
                    {action.icon}
                  </div>
                  <p className="text-[13px] font-black leading-tight text-ink whitespace-pre-line">
                    {action.label}
                  </p>
                  <p className="text-[11px] text-text-muted">{action.desc}</p>
                </button>
              ))}
            </div>

            {/* Upcoming list */}
            <div className="mt-4">
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest text-text-muted">
                Скоро ({upcomingBookings.length})
              </h3>
              {upcomingBookings.slice(0, 5).map(entry => {
                if (!entry.slot) return null
                return (
                  <div
                    key={entry.booking.id}
                    className="mb-1.5 flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2"
                  >
                    <span className="text-[13px] font-bold text-ink">
                      {format(getSlotDateTime(entry.slot), 'HH:mm')}
                    </span>
                    <span className="truncate text-[12px] text-text-muted">
                      {entry.student?.name || entry.booking.studentName}
                    </span>
                    <span className="ml-auto text-[11px] font-medium text-text-soft">
                      {format(getSlotDateTime(entry.slot), 'd MMM', { locale: ru })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reschedule Bottom Sheet */}
      <BottomSheet
        open={showRescheduleSheet}
        onClose={() => {
          setShowRescheduleSheet(false)
          setSelectedBooking(null)
        }}
        title="Перенос записи"
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="rounded-[12px] border border-border bg-surface-soft p-3">
              <p className="font-bold text-ink">
                {selectedBooking.student?.name || selectedBooking.booking.studentName}
              </p>
              <p className="text-[12px] text-text-muted">
                {selectedBooking.slot && format(getSlotDateTime(selectedBooking.slot), 'HH:mm, d MMMM', { locale: ru })}
              </p>
            </div>
            
            <p className="text-[13px] text-text-muted">
              Выберите новое время для переноса. Текущая запись будет отменена.
            </p>

            <button
              onClick={() => {
                // Navigate to schedule with reschedule context
                setShowRescheduleSheet(false)
                setSelectedBooking(null)
              }}
              className="w-full rounded-[12px] bg-ink py-3 text-[14px] font-bold text-surface transition hover:bg-ink/90 active:scale-[0.99]"
            >
              Открыть расписание
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

export default TodayPage
