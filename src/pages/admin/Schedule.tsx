import { Fragment, useEffect, useMemo, useState } from 'react'
import { addDays, eachDayOfInterval, format, isBefore, isSameDay, startOfDay, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { NavArrowDown, NavArrowLeft as ChevronLeft, NavArrowRight as ChevronRight, Plus, Trash } from 'iconoir-react'
import { useLocation } from 'react-router-dom'
import { db } from '../../services/storage'
import { cancelBookingConfirmed, completeBookingConfirmed, createBookingConfirmed, getSlotDateTime, markBookingNoShowConfirmed, rescheduleBookingConfirmed } from '../../services/bookingService'
import { createBulkSlotsConfirmed, createSlotConfirmed, updateSlotStatusConfirmed } from '../../services/slotService'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { Modal } from '../../components/ui/Modal'
import { PersonMarker } from '../../components/admin/PersonMarker'
import { useToast } from '../../components/ui/Toast'
import { createCurrentStaffAuditEntry } from '../../services/adminStorage'
import { filterBookings, filterBranches, filterInstructors, filterSlots, filterStudents } from '../../services/staffScope'
import type { Booking, Branch, Instructor, Slot, Student } from '../../types'
import { assertAdminPermission } from '../../services/adminAccess'
import { formatDuration } from '../../lib/utils'
import { getPreference, setPreference } from '../../services/preferenceStorage'

type ViewMode = 'day' | 'week'
type ScheduleFilter = 'all' | 'booked' | 'available' | 'cancelled'
type ScheduleSlotEntry = {
  slot: Slot
  booking: Booking | null
  instructor: Instructor | null
  branch: Branch | null
}

const HOURS = Array.from({ length: 17 }, (_, index) => `${String(index + 7).padStart(2, '0')}:00`)
const DURATION_OPTIONS = [45, 60, 90, 120]

const LESSON_LABELS: Partial<Record<NonNullable<Slot['lessonType']>, string>> = {
  driving: 'Вождение',
  main: 'Основное',
  extra: 'Доп.',
  practice_ground: 'Площадка',
  city: 'Город',
  exam_route: 'Маршрут',
  internal_exam: 'Внутр.',
  retake: 'Пересдача',
  mistakes: 'Ошибки',
}

function statusClass(status: Slot['status']) {
  if (status === 'available') return 'border-[rgba(52,199,89,0.22)] bg-[rgba(52,199,89,0.10)] text-[#1F8F3F]'
  if (status === 'cancelled') return 'border-[rgba(15,23,42,0.08)] bg-[#F2F4F7] text-[#667085] opacity-75'
  return 'border-[rgba(10,132,255,0.20)] bg-[rgba(10,132,255,0.10)] text-[#075EBC]'
}

function statusDotClass(status: Slot['status']) {
  if (status === 'available') return 'bg-[#34C759]'
  if (status === 'cancelled') return 'bg-[#98A2B3]'
  return 'bg-[#0A84FF]'
}

function getSlotStatusLabel(status: Slot['status']): string {
  if (status === 'available') return 'Свободно'
  if (status === 'cancelled') return 'Отменено'
  return 'Занято'
}

function plural(value: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(value) % 10
  const mod100 = Math.abs(value) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function shortPersonName(name: string): string {
  const [lastName = name, firstName = ''] = name.trim().split(/\s+/)
  return [lastName, firstName].filter(Boolean).join(' ')
}

function groupEntriesByTime(entries: ScheduleSlotEntry[]) {
  const groups = new Map<string, ScheduleSlotEntry[]>()
  entries.forEach((entry) => groups.set(entry.slot.time, [...(groups.get(entry.slot.time) ?? []), entry]))
  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([time, groupedEntries]) => ({
      time,
      busy: groupedEntries.filter((entry) => entry.slot.status !== 'available'),
      free: groupedEntries.filter((entry) => entry.slot.status === 'available'),
    }))
}

function getTimeGroupTitle(group: ReturnType<typeof groupEntriesByTime>[number]): string {
  if (group.busy.length === 1 && group.free.length === 0) {
    const entry = group.busy[0]
    return entry.booking ? shortPersonName(entry.booking.studentName) : LESSON_LABELS[entry.slot.lessonType ?? 'driving'] ?? 'Занятие'
  }
  const parts: string[] = []
  if (group.busy.length) parts.push(`${group.busy.length} ${plural(group.busy.length, 'занятие', 'занятия', 'занятий')}`)
  if (group.free.length) parts.push(`${group.free.length} ${plural(group.free.length, 'свободное окно', 'свободных окна', 'свободных окон')}`)
  return parts.join(' · ')
}

function TimeGroupRow({
  group,
  expanded,
  onToggle,
  onOpenSlot,
}: {
  group: ReturnType<typeof groupEntriesByTime>[number]
  expanded: boolean
  onToggle: () => void
  onOpenSlot: (slotId: string) => void
}) {
  const hasProblem = group.busy.some((entry) => entry.slot.status === 'cancelled')
  const hasBooked = group.busy.some((entry) => entry.slot.status === 'booked')
  const freeInstructors = new Set(group.free.map((entry) => entry.slot.instructorId)).size
  const firstBusy = group.busy[0]
  const dotClass = hasProblem ? statusDotClass('cancelled') : hasBooked ? statusDotClass('booked') : 'bg-[#34C759]'
  const meta = firstBusy
    ? `${shortPersonName(firstBusy.instructor?.name ?? 'Инструктор')} · ${firstBusy.branch?.name ?? 'Филиал'}`
    : `${freeInstructors} ${plural(freeInstructors, 'инструктор', 'инструктора', 'инструкторов')} · ${formatDuration(group.free[0]?.slot.duration ?? 90)}`

  return (
    <div className="v-route-free-group">
      <button type="button" onClick={onToggle} className={hasProblem ? 'v-route-node is-cancelled' : hasBooked ? 'v-route-node is-booked' : 'v-route-node is-free'}>
        <span className="v-route-time">{group.time}</span>
        <span className={'v-route-dot ' + dotClass} aria-hidden="true" />
        <span className="v-route-main">
          <strong>{getTimeGroupTitle(group)}</strong>
          <small>{meta}</small>
        </span>
        {expanded ? <NavArrowDown width={16} height={16} aria-hidden="true" /> : <ChevronRight width={16} height={16} aria-hidden="true" />}
      </button>
      {expanded ? (
        <div className="v-route-expanded">
          {group.busy.map((entry) => {
            const lessonLabel = LESSON_LABELS[entry.slot.lessonType ?? 'driving'] ?? 'Занятие'
            return (
              <button key={entry.slot.id} type="button" onClick={() => onOpenSlot(entry.slot.id)} className="v-route-expanded-row">
                <span>{entry.booking ? shortPersonName(entry.booking.studentName) : lessonLabel}</span>
                <small>{shortPersonName(entry.instructor?.name ?? 'Инструктор')} · {entry.branch?.name ?? 'Филиал'}</small>
              </button>
            )
          })}
          {group.free.map((entry) => (
            <button key={entry.slot.id} type="button" onClick={() => onOpenSlot(entry.slot.id)} className="v-route-expanded-row is-free-row">
              <span>Свободно</span>
              <small>{shortPersonName(entry.instructor?.name ?? 'Инструктор')} · {entry.branch?.name ?? 'Филиал'}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ScheduleRouteDay({
  date,
  entries,
  expandedFreeTime,
  onToggleFree,
  onOpenSlot,
  desktop = false,
}: {
  date: Date
  entries: ScheduleSlotEntry[]
  expandedFreeTime: string | null
  onToggleFree: (time: string) => void
  onOpenSlot: (slotId: string) => void
  desktop?: boolean
}) {
  const booked = entries.filter((entry) => entry.slot.status === 'booked').length
  const free = entries.filter((entry) => entry.slot.status === 'available').length
  const groups = groupEntriesByTime(entries)
  return (
    <section className={desktop ? 'v-route-day v-route-day-desktop' : 'v-route-day'}>
      <div className="v-route-day-head">
        <span>
          <small>{format(date, 'EEEE', { locale: ru })}</small>
          <strong>{format(date, 'd MMMM', { locale: ru })}</strong>
        </span>
        <em>{booked} занято · {free} свободно</em>
      </div>
      {groups.length === 0 ? (
        <div className="v-route-empty"><strong>Окон на этот день нет</strong><span>Создайте свободное время, чтобы ученики могли записаться.</span></div>
      ) : (
        <div className="v-route-timeline">
          {groups.map((group) => (
            <TimeGroupRow
              key={group.time}
              group={group}
              expanded={expandedFreeTime === group.time}
              onToggle={() => onToggleFree(group.time)}
              onOpenSlot={onOpenSlot}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function DesktopScheduleDay({
  date,
  entries,
  selectedTime,
  onSelectTime,
  onOpenSlot,
}: {
  date: Date
  entries: ScheduleSlotEntry[]
  selectedTime: string | null
  onSelectTime: (time: string) => void
  onOpenSlot: (slotId: string) => void
}) {
  const groups = groupEntriesByTime(entries)
  const activeGroup = groups.find((group) => group.time === selectedTime) ?? groups[0]

  return (
    <section className="v-desktop-schedule-day">
      <div className="v-desktop-schedule-list">
        <div className="v-route-day-head">
          <span>
            <small>{format(date, 'EEEE', { locale: ru })}</small>
            <strong>{format(date, 'd MMMM', { locale: ru })}</strong>
          </span>
          <em>{entries.filter((entry) => entry.slot.status === 'booked').length} занято · {entries.filter((entry) => entry.slot.status === 'available').length} свободно</em>
        </div>
        {groups.length === 0 ? (
          <div className="v-route-empty"><strong>Окон на этот день нет</strong></div>
        ) : (
          <div className="v-desktop-time-list">
            {groups.map((group) => {
              const active = activeGroup?.time === group.time
              return (
                <button key={group.time} type="button" onClick={() => onSelectTime(group.time)} className={active ? 'v-desktop-time-row is-active' : 'v-desktop-time-row'}>
                  <strong>{group.time}</strong>
                  <span>{getTimeGroupTitle(group)}</span>
                  <ChevronRight width={16} height={16} aria-hidden="true" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      <aside className="v-desktop-schedule-detail">
        {activeGroup ? (
          <>
            <div className="v-desktop-detail-head">
              <strong>{activeGroup.time}</strong>
              <span>{getTimeGroupTitle(activeGroup)}</span>
            </div>
            <div className="v-desktop-detail-list">
              {activeGroup.busy.map((entry) => {
                const lessonLabel = LESSON_LABELS[entry.slot.lessonType ?? 'driving'] ?? 'Занятие'
                return (
                  <button key={entry.slot.id} type="button" onClick={() => onOpenSlot(entry.slot.id)} className="v-desktop-detail-row">
                    <span>
                      <strong>{entry.booking ? shortPersonName(entry.booking.studentName) : lessonLabel}</strong>
                      <small>{shortPersonName(entry.instructor?.name ?? 'Инструктор')} · {entry.branch?.name ?? 'Филиал'}</small>
                    </span>
                    <ChevronRight width={16} height={16} aria-hidden="true" />
                  </button>
                )
              })}
              {activeGroup.free.map((entry) => (
                <button key={entry.slot.id} type="button" onClick={() => onOpenSlot(entry.slot.id)} className="v-desktop-detail-row is-free-row">
                  <span>
                    <strong>Свободно</strong>
                    <small>{shortPersonName(entry.instructor?.name ?? 'Инструктор')} · {entry.branch?.name ?? 'Филиал'} · {formatDuration(entry.slot.duration)}</small>
                  </span>
                  <ChevronRight width={16} height={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="v-route-empty"><strong>Выберите время</strong></div>
        )}
      </aside>
    </section>
  )
}

export function AdminSchedule() {
  const { showToast } = useToast()
  const location = useLocation()
  const school = db.schools.currentAdmin()
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'day'
    return (getPreference('dd:admin_schedule_view') as ViewMode | null) ?? 'day'
  })
  const [selectedDate, setSelectedDate] = useState(new Date())
  const slotFilter: ScheduleFilter = 'all'
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showBookModal, setShowBookModal] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const [expandedFreeTime, setExpandedFreeTime] = useState<string | null>(null)
  const [selectedDesktopTime, setSelectedDesktopTime] = useState<string | null>(null)

  useEffect(() => {
    if (location.search.includes('create=slot')) setShowCreateModal(true)
  }, [location.search])

  const data = useMemo(() => {
    if (!school) return { slots: [] as Slot[], bookings: [] as Booking[], instructors: filterInstructors(db.instructors.all()), branches: filterBranches(db.branches.all()), students: [] as Student[] }
    return {
      slots: filterSlots(db.slots.bySchool(school.id)),
      bookings: filterBookings(db.bookings.bySchool(school.id)),
      instructors: filterInstructors(db.instructors.bySchool(school.id)),
      branches: filterBranches(db.branches.bySchool(school.id)),
      students: filterStudents(db.students.bySchool(school.id)),
    }
  }, [school?.id])

  const viewRange = useMemo(() => {
    if (viewMode === 'day') return [selectedDate]
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end: addDays(start, 6) })
  }, [viewMode, selectedDate])

  const selectedSlot = selectedSlotId ? data.slots.find((slot) => slot.id === selectedSlotId) ?? null : null
  const selectedBooking = selectedSlot?.bookingId ? data.bookings.find((booking) => booking.id === selectedSlot.bookingId) ?? null : null
  const selectedInstructor = selectedSlot ? data.instructors.find((item) => item.id === selectedSlot.instructorId) ?? null : null
  const selectedBranch = selectedSlot ? data.branches.find((item) => item.id === selectedSlot.branchId) ?? null : null
  const rescheduleOptions = selectedSlot && rescheduleDate
    ? data.slots
      .filter((slot) =>
        slot.status === 'available' &&
        slot.date === rescheduleDate &&
        slot.instructorId === selectedSlot.instructorId &&
        slot.id !== selectedSlot.id &&
        getSlotDateTime(slot) > new Date(),
      )
      .sort((left, right) => left.time.localeCompare(right.time))
    : []
  const filteredSlots = slotFilter === 'all' ? data.slots : data.slots.filter((slot) => slot.status === slotFilter)
  const staleFreeSlots = data.slots.filter((slot) => slot.status === 'available' && getSlotDateTime(slot) < new Date())
  const staleActiveBookings = data.bookings
    .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
    .filter((entry): entry is { booking: Booking; slot: Slot } => entry.booking.status === 'active' && entry.slot !== null && getSlotDateTime(entry.slot) < new Date())

  const mobileSourceDays = viewMode === 'day'
    ? [selectedDate]
    : viewRange.filter((date) => !isBefore(startOfDay(date), startOfDay(new Date())))
  const mobileDays = (mobileSourceDays.length ? mobileSourceDays : viewRange).map((date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const slots = filteredSlots
      .filter((slot) => slot.date === dateKey)
      .map((slot) => ({
        slot,
        booking: slot.bookingId ? data.bookings.find((booking) => booking.id === slot.bookingId) ?? null : null,
        instructor: data.instructors.find((instructor) => instructor.id === slot.instructorId) ?? null,
        branch: data.branches.find((branch) => branch.id === slot.branchId) ?? null,
      }))
      .sort((left, right) => left.slot.time.localeCompare(right.slot.time))
    return { date, slots }
  })

  const desktopDayEntries = mobileDays.find((day) => isSameDay(day.date, selectedDate))?.slots ?? []
  const desktopDayGroups = useMemo(() => groupEntriesByTime(desktopDayEntries), [desktopDayEntries])

  useEffect(() => {
    setSelectedDesktopTime((current) => {
      if (current && desktopDayGroups.some((group) => group.time === current)) return current
      return desktopDayGroups[0]?.time ?? null
    })
  }, [desktopDayGroups])

  const getSlotsForCell = (date: Date, hour: string) => {
    const key = format(date, 'yyyy-MM-dd')
    const prefix = hour.split(':')[0]
    return filteredSlots
      .filter((slot) => slot.date === key && slot.time.startsWith(prefix))
      .sort((left, right) => left.time.localeCompare(right.time))
  }

  const handleCancel = async () => {
    const access = assertAdminPermission('schedule.manage')
    if (!access.ok) return
    if (actionPending) return

    if (!school || !selectedSlot || !selectedBooking) return
    setActionPending(true)
    const bookingResult = await cancelBookingConfirmed(selectedBooking.id)
    if (!bookingResult.ok) {
      setActionPending(false)
      showToast(bookingResult.error ?? 'Не удалось отменить занятие.', 'error')
      return
    }
    const slotResult = await updateSlotStatusConfirmed(selectedSlot.id, 'cancelled')
    setActionPending(false)
    if (!slotResult.ok) {
      showToast(slotResult.error ?? 'Запись отменена, но окно не удалось закрыть.', 'error')
      return
    }
    createCurrentStaffAuditEntry(
      school.id,
      'booking_cancelled',
      'booking',
      selectedBooking.id,
      `Отменено занятие: ${selectedBooking.studentName} на ${format(getSlotDateTime(selectedSlot), 'dd.MM.yyyy HH:mm')}`,
      'status: booked',
      `status: cancelled, reason: ${cancelReason || 'Не указана'}`,
    )
    setShowCancelModal(false)
    setSelectedSlotId(null)
    setCancelReason('')
  }

  const handleReschedule = async () => {
    const access = assertAdminPermission('schedule.manage')
    if (!access.ok) return
    if (actionPending) return

    if (!school || !selectedSlot || !selectedBooking || !rescheduleDate || !rescheduleTime) return
    const newSlot = rescheduleOptions.find((slot) => slot.id === rescheduleTime)
    if (!newSlot) {
      showToast('Свободное время не найдено. Добавьте окно в расписании.', 'error')
      return
    }
    setActionPending(true)
    const result = await rescheduleBookingConfirmed({ bookingId: selectedBooking.id, newSlotId: newSlot.id, ignoreLimits: true })
    setActionPending(false)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось перенести занятие.', 'error')
      return
    }
    createCurrentStaffAuditEntry(
      school.id,
      'booking_rescheduled',
      'booking',
      selectedBooking.id,
      `Перенесено занятие: ${selectedBooking.studentName} на ${rescheduleDate} ${rescheduleTime}`,
    )
    setShowRescheduleModal(false)
    setSelectedSlotId(null)
    setRescheduleDate('')
    setRescheduleTime('')
  }

  const handleNoShow = async () => {
    const access = assertAdminPermission('schedule.manage')
    if (!access.ok) return
    if (actionPending) return

    if (!school || !selectedBooking) return
    setActionPending(true)
    const result = await markBookingNoShowConfirmed(selectedBooking.id)
    setActionPending(false)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось отметить неявку.', 'error')
      return
    }
    createCurrentStaffAuditEntry(school.id, 'booking_no_show', 'booking', selectedBooking.id, `Отмечена неявка: ${selectedBooking.studentName}`)
    setSelectedSlotId(null)
  }

  const handleComplete = async () => {
    const access = assertAdminPermission('schedule.manage')
    if (!access.ok) return
    if (actionPending) return

    if (!school || !selectedSlot || !selectedBooking) return
    setActionPending(true)
    const result = await completeBookingConfirmed(selectedBooking.id)
    setActionPending(false)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось зачесть занятие.', 'error')
      return
    }
    createCurrentStaffAuditEntry(school.id, 'booking_completed', 'booking', selectedBooking.id, `Занятие засчитано: ${selectedBooking.studentName}`)
    setSelectedSlotId(null)
  }

  const setViewModePersisted = (mode: ViewMode) => {
    setViewMode(mode)
    setPreference('dd:admin_schedule_view', mode)
  }

  const duplicateSelectedSlotTomorrow = async () => {
    const access = assertAdminPermission('schedule.manage')
    if (!access.ok || !school || !selectedSlot) return
    if (actionPending) return
    const date = format(addDays(getSlotDateTime(selectedSlot), 1), 'yyyy-MM-dd')
    const duplicate = db.slots.byInstructorAndDate(selectedSlot.instructorId, date).some((slot) => slot.time === selectedSlot.time)
    if (duplicate) {
      showToast('Такое окно уже есть.', 'error')
      return
    }
    setActionPending(true)
    const result = await createSlotConfirmed({
      schoolId: school.id,
      instructorId: selectedSlot.instructorId,
      branchId: selectedSlot.branchId,
      date,
      startTime: selectedSlot.time,
      duration: selectedSlot.duration,
      lessonType: selectedSlot.lessonType ?? 'driving',
    })
    setActionPending(false)
    if (!result.ok || !result.slot) {
      showToast(result.error ?? 'Не удалось создать окно.', 'error')
      return
    }
    createCurrentStaffAuditEntry(school.id, 'slot_created', 'slot', result.slot.id, `Дублировано окно ${date} ${result.slot.time}`)
    setSelectedSlotId(result.slot.id)
  }

  const hideStaleFreeSlots = async () => {
    const access = assertAdminPermission('schedule.manage')
    if (!access.ok || !school || staleFreeSlots.length === 0 || actionPending) return
    setActionPending(true)
    let changed = 0
    for (const slot of staleFreeSlots) {
      const result = await updateSlotStatusConfirmed(slot.id, 'cancelled')
      if (result.ok) changed += 1
    }
    setActionPending(false)
    createCurrentStaffAuditEntry(school.id, 'slot_cancelled', 'slot', 'bulk-stale', `Скрыты прошедшие свободные окна: ${changed}`)
    showToast(`Скрыто прошедших свободных окон: ${changed}`, 'success')
  }

  const completeStaleActiveBookings = async () => {
    const access = assertAdminPermission('schedule.manage')
    if (!access.ok || !school || staleActiveBookings.length === 0 || actionPending) return
    setActionPending(true)
    let changed = 0
    for (const entry of staleActiveBookings) {
      const result = await completeBookingConfirmed(entry.booking.id)
      if (result.ok) changed += 1
    }
    setActionPending(false)
    createCurrentStaffAuditEntry(school.id, 'booking_completed', 'booking', 'bulk-stale', `Закрыты прошедшие занятия: ${changed}`)
    showToast(`Зачтено прошедших занятий: ${changed}`, 'success')
  }

  const hideSelectedFreeSlot = async () => {
    const access = assertAdminPermission('schedule.manage')
    if (!access.ok || !selectedSlot || selectedSlot.status !== 'available' || actionPending) return
    setActionPending(true)
    const result = await updateSlotStatusConfirmed(selectedSlot.id, 'cancelled')
    setActionPending(false)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось скрыть окно.', 'error')
      return
    }
    createCurrentStaffAuditEntry(selectedSlot.schoolId, 'slot_cancelled', 'slot', selectedSlot.id, `Скрыто свободное окно ${selectedSlot.date} ${selectedSlot.time}`)
    showToast('Свободное окно скрыто.', 'success')
    setSelectedSlotId(null)
  }


  if (!school) return null

  return (
    <div className="vroom-schedule flex h-full flex-col">
      <div className="v-admin-toolbar vroom-schedule-toolbar">
        <div>
          <h1 className="v-admin-heading">Расписание</h1>
          <p className="v-admin-note mt-1">Занятые и свободные окна по времени</p>
        </div>
        <div className="v-schedule-toolbar-actions ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setSelectedDate((date) => addDays(date, viewMode === 'day' ? -1 : -7))} className="v-admin-button-secondary px-3" aria-label="Назад">
            <ChevronLeft width={16} height={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setSelectedDate(new Date())} className="v-admin-button-secondary">Сегодня</button>
          <button type="button" onClick={() => setSelectedDate((date) => addDays(date, viewMode === 'day' ? 1 : 7))} className="v-admin-button-secondary px-3" aria-label="Вперёд">
            <ChevronRight width={16} height={16} aria-hidden="true" />
          </button>
          <div className="v-schedule-view-toggle flex rounded-full border border-[#111827]/[0.07] bg-white/70 p-1">
            {(['day', 'week'] as ViewMode[]).map((mode) => (
              <button key={mode} type="button" onClick={() => setViewModePersisted(mode)} className={`rounded-full px-3 py-2 text-[13px] font-medium ${viewMode === mode ? 'bg-[#111827] text-white' : 'text-[#687381]'}`}>
                {mode === 'day' ? 'День' : 'Неделя'}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowCreateModal(true)} className="v-admin-button is-blue">
            <Plus width={16} height={16} aria-hidden="true" />
            Создать окно
          </button>
        </div>
      </div>

      {(staleFreeSlots.length || staleActiveBookings.length) ? (
        <div className="hidden">
          <span className="font-semibold text-[#111827]">Проверка прошедшего времени</span>
          {staleActiveBookings.length ? <button type="button" onClick={() => void completeStaleActiveBookings()} disabled={actionPending} className="v-admin-button-secondary min-h-8 px-3 text-[12px] disabled:opacity-50">Отметить занятия: {staleActiveBookings.length}</button> : null}
          {staleFreeSlots.length ? <button type="button" onClick={() => void hideStaleFreeSlots()} disabled={actionPending} className="v-admin-button-secondary min-h-8 px-3 text-[12px] disabled:opacity-50">Скрыть окна: {staleFreeSlots.length}</button> : null}
        </div>
      ) : null}



      <div className="flex-1 overflow-auto p-3 pb-24 md:p-5 lg:pt-3">
        {filteredSlots.length === 0 ? (
          <div className="v-admin-empty mb-3">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111418]">Нет свободных окон</h2>
              <button type="button" onClick={() => setShowCreateModal(true)} className="v-admin-button is-blue mt-4">Создать окно</button>
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 lg:hidden">
          {mobileDays.map(({ date, slots }) => (
            <ScheduleRouteDay
              key={date.toISOString()}
              date={date}
              entries={slots}
              expandedFreeTime={expandedFreeTime}
              onToggleFree={(time) => setExpandedFreeTime((current) => current === time ? null : time)}
              onOpenSlot={setSelectedSlotId}
            />
          ))}
        </div>
        {viewMode === 'day' ? (
          <div className="hidden lg:block">
            <DesktopScheduleDay
              date={selectedDate}
              entries={desktopDayEntries}
              selectedTime={selectedDesktopTime}
              onSelectTime={setSelectedDesktopTime}
              onOpenSlot={setSelectedSlotId}
            />
          </div>
        ) : (
        <div className="v-admin-panel vroom-calendar-grid hidden overflow-hidden lg:block">
          <div className="grid bg-[#F2F6FA]" style={{ gridTemplateColumns: '66px repeat(7,minmax(0,1fr))' }}>
            <div className="border-b border-r border-[#111827]/[0.07]" />
            {viewRange.map((date) => (
              <div key={date.toISOString()} className={`border-b border-r border-[#111827]/[0.07] p-3 text-center ${isSameDay(date, new Date()) ? 'bg-[#EAF3FF]' : ''}`}>
                <p className="text-[11px] font-medium text-[#687381]">{format(date, 'EEEEEE', { locale: ru })}</p>
                <p className="text-[22px] font-semibold leading-none text-[#111315]">{format(date, 'd')}</p>
              </div>
            ))}

            {HOURS.map((hour) => (
              <Fragment key={hour}>
                <div className="flex min-h-[104px] items-start justify-end border-r border-[#111827]/[0.07] px-3 py-3 text-[12px] font-medium text-[#8A96A3]">
                  {hour}
                </div>
                {viewRange.map((date) => {
                  const cellSlots = getSlotsForCell(date, hour)
                  return (
                    <div key={`${date.toISOString()}-${hour}`} className="vroom-calendar-cell min-h-[104px] border-r border-t border-[#111827]/[0.055] bg-white/72 p-2">
                      <div className="grid gap-2">
                        {(() => {
                          const busySlots = cellSlots.filter((slot) => slot.status !== 'available')
                          const freeSlots = cellSlots.filter((slot) => slot.status === 'available')
                          const freeInstructors = new Set(freeSlots.map((slot) => slot.instructorId)).size
                          return (
                            <>
                              {busySlots.map((slot) => {
                                const booking = slot.bookingId ? data.bookings.find((item) => item.id === slot.bookingId) ?? null : null
                                const instructor = data.instructors.find((item) => item.id === slot.instructorId)
                                const lessonLabel = LESSON_LABELS[slot.lessonType ?? 'driving'] ?? 'Занятие'
                                return (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => setSelectedSlotId(slot.id)}
                                    title={format(getSlotDateTime(slot), 'HH:mm') + ' · ' + (booking?.studentName ?? 'Занятие') + ' · ' + (instructor?.name ?? 'Инструктор')}
                                    className={'vroom-slot-card relative min-h-[78px] rounded-[14px] border px-2.5 py-2 text-left text-[12px] font-medium leading-4 transition hover:-translate-y-0.5 hover:brightness-[0.99] ' + statusClass(slot.status)}
                                  >
                                    <span className={'absolute right-2.5 top-2.5 h-2 w-2 rounded-full ' + statusDotClass(slot.status)} aria-hidden="true" />
                                    {booking ? <PersonMarker role="student" name={booking.studentName} compact className="pr-4" /> : <span className="line-clamp-2 break-words pr-4 leading-4">Занятие</span>}
                                    <span className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] font-medium opacity-75">
                                      <span>{format(getSlotDateTime(slot), 'HH:mm')}</span>
                                      <span>{lessonLabel}</span>
                                    </span>
                                    <PersonMarker role="instructor" name={instructor?.name ?? 'Инструктор'} compact className="mt-1 opacity-90" />
                                  </button>
                                )
                              })}
                              {freeSlots.length ? (
                                <button
                                  key={date.toISOString() + '-' + hour + '-free'}
                                  type="button"
                                  onClick={() => setSelectedSlotId(freeSlots[0].id)}
                                  title={freeSlots.length + ' свободных окон'}
                                  className="vroom-slot-card vroom-slot-free-summary relative min-h-[62px] rounded-[14px] border border-[rgba(52,199,89,0.20)] bg-[rgba(52,199,89,0.10)] px-2.5 py-2 text-left text-[12px] font-medium leading-4 text-[#1F8F3F] transition hover:-translate-y-0.5"
                                >
                                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#34C759]" aria-hidden="true" />
                                  <span className="block pr-4 font-semibold">{freeSlots.length} {plural(freeSlots.length, 'свободное окно', 'свободных окна', 'свободных окон')}</span>
                                  <span className="mt-1 block text-[11px] opacity-75">{freeInstructors} {plural(freeInstructors, 'инструктор', 'инструктора', 'инструкторов')} · {formatDuration(freeSlots[0].duration)}</span>
                                </button>
                              ) : null}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
        )}
      </div>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Создать окно" size="md">
        <CreateSlotForm
          schoolId={school.id}
          instructors={data.instructors}
          branches={data.branches}
          onClose={() => setShowCreateModal(false)}
        />
      </Modal>

      <Modal open={showTemplateModal} onClose={() => setShowTemplateModal(false)} title="Повторить расписание" size="md">
        <SlotTemplateForm
          schoolId={school.id}
          instructors={data.instructors}
          branches={data.branches}
          onClose={() => setShowTemplateModal(false)}
        />
      </Modal>

      <Modal open={Boolean(selectedSlot)} onClose={() => setSelectedSlotId(null)} title="Занятие" size="sm">
        {selectedSlot ? (
          <div className="space-y-4 p-5">
            <div className="rounded-[22px] bg-[#F2F6FA] p-4">
              <p className="text-[30px] font-semibold leading-none text-[#111315]">{format(getSlotDateTime(selectedSlot), 'HH:mm')}</p>
              <p className="mt-1 text-[14px] font-medium text-[#687381]">{format(getSlotDateTime(selectedSlot), 'EEEE, d MMMM', { locale: ru })}</p>
            </div>
            <div className="grid gap-3 text-[14px] font-medium">
              <div className="flex justify-between gap-4"><span className="text-[#687381]">Статус</span><span className={`v-admin-pill ${selectedSlot.status === 'available' ? 'v-tone-ok' : selectedSlot.status === 'cancelled' ? 'v-tone-muted' : 'v-tone-info'}`}>{getSlotStatusLabel(selectedSlot.status)}</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#687381]">Инструктор</span><span className="text-right text-[#111315]">{selectedInstructor?.name ?? 'Не назначен'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#687381]">Филиал</span><span className="text-right text-[#111315]">{selectedBranch?.name ?? 'Не указан'}</span></div>
              {selectedBooking ? (
                <>
                  <div className="flex justify-between gap-4"><span className="text-[#687381]">Ученик</span><span className="text-right text-[#111315]">{selectedBooking.studentName}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-[#687381]">Телефон</span><a href={`tel:${selectedBooking.studentPhone}`} className="text-right text-[#315A7C]">{selectedBooking.studentPhone}</a></div>
                </>
              ) : null}
              <div className="flex justify-between gap-4"><span className="text-[#687381]">Длительность</span><span className="text-[#111315]">{formatDuration(selectedSlot.duration)}</span></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={duplicateSelectedSlotTomorrow} disabled={actionPending} className="v-admin-button-secondary sm:col-span-2 disabled:opacity-50">{actionPending ? 'Сохраняем…' : 'Повторить завтра'}</button>
              {selectedSlot.status === 'booked' && selectedBooking ? (
                <>
                  <button type="button" onClick={() => setShowRescheduleModal(true)} disabled={actionPending} className="v-admin-button-secondary disabled:opacity-50">Перенести</button>
                  <button type="button" onClick={handleComplete} disabled={actionPending} className="v-admin-button bg-[#247A4B] hover:bg-[#1C623C] disabled:opacity-50">{actionPending ? 'Сохраняем…' : 'Засчитать'}</button>
                  <button type="button" onClick={() => void handleNoShow()} disabled={actionPending} className="v-admin-button bg-[#315A7C] hover:bg-[#244760] disabled:opacity-50">Неявка</button>
                  <button type="button" onClick={() => setShowCancelModal(true)} disabled={actionPending} className="v-admin-button bg-[#D1433C] hover:bg-[#A9342F] disabled:opacity-50">Отменить</button>
                </>
              ) : selectedSlot.status === 'available' ? (
                <>
                  <button type="button" onClick={() => setShowBookModal(true)} className="v-admin-button">Записать ученика</button>
                  <button type="button" onClick={() => void hideSelectedFreeSlot()} disabled={actionPending} className="v-admin-button-secondary disabled:opacity-50"><Trash width={15} height={15} aria-hidden="true" /> Скрыть окно</button>
                </>
              ) : (
                <a href={`${getAdminBasePathForLocation()}/students`} className="v-admin-button sm:col-span-2">Открыть учеников</a>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={showBookModal} onClose={() => setShowBookModal(false)} title="Записать ученика" size="md">
        {selectedSlot ? (
          <BookStudentForm
            schoolId={school.id}
            slot={selectedSlot}
            students={data.students}
            onBooked={() => { setShowBookModal(false); setSelectedSlotId(null) }}
          />
        ) : null}
      </Modal>

      <Modal open={showCancelModal} onClose={() => setShowCancelModal(false)} title="Отмена занятия" size="sm">
        <div className="space-y-4 p-5">
          <p className="text-[14px] font-medium text-[#687381]">Занятие ученика <strong className="font-semibold text-[#111315]">{selectedBooking?.studentName}</strong> будет отменено.</p>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Причина отмены</span><textarea name="cancel-reason" autoComplete="off" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Например: ученик попросил перенести…" className="v-admin-input min-h-[94px] w-full resize-none py-3" /></label>
          <div className="v-modal-actions"><button type="button" onClick={() => setShowCancelModal(false)} disabled={actionPending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Назад</button><button type="button" onClick={handleCancel} disabled={actionPending} className="v-admin-button flex-1 bg-[#D1433C] hover:bg-[#A9342F] disabled:opacity-50">{actionPending ? 'Сохраняем…' : 'Подтвердить'}</button></div>
        </div>
      </Modal>

      <Modal open={showRescheduleModal} onClose={() => setShowRescheduleModal(false)} title="Перенос занятия" size="sm">
        <div className="space-y-4 p-5">
          <p className="text-[14px] font-medium text-[#687381]">Перенести занятие ученика <strong className="font-semibold text-[#111315]">{selectedBooking?.studentName}</strong>.</p>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Новая дата</span><input type="date" name="reschedule-date" autoComplete="off" value={rescheduleDate} min={format(new Date(), 'yyyy-MM-dd')} onChange={(event) => setRescheduleDate(event.target.value)} className="v-admin-input w-full" /></label>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Свободное окно</span><select name="reschedule-slot" value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} className="v-admin-input w-full">
            <option value="">Выберите свободное окно</option>
            {rescheduleOptions.map((slot) => <option key={slot.id} value={slot.id}>{slot.time} · {formatDuration(slot.duration)} · {data.branches.find((branch) => branch.id === slot.branchId)?.name ?? 'филиал'}</option>)}
          </select></label>
          {rescheduleDate && rescheduleOptions.length === 0 ? <p className="rounded-[14px] bg-[#FFF8EC] px-3 py-2 text-[13px] font-medium text-[#8A5A00]">На эту дату у инструктора нет свободных окон. Создайте окно в расписании.</p> : null}
          <div className="v-modal-actions"><button type="button" onClick={() => setShowRescheduleModal(false)} disabled={actionPending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Назад</button><button type="button" onClick={handleReschedule} disabled={actionPending} className="v-admin-button flex-1 disabled:opacity-50">{actionPending ? 'Сохраняем…' : 'Перенести'}</button></div>
        </div>
      </Modal>
    </div>
  )
}

function BookStudentForm({ schoolId, slot, students, onBooked }: { schoolId: string; slot: Slot; students: Student[]; onBooked: () => void }) {
  const [studentId, setStudentId] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async () => {
    const access = assertAdminPermission('schedule.manage')
    if (!access.ok) { setError(access.error ?? 'Недостаточно прав.'); return }
    if (pending) return
    const student = students.find((item) => item.id === studentId)
    if (!student) { setError('Выберите ученика.'); return }
    const freshSlot = db.slots.byId(slot.id)
    if (!freshSlot || freshSlot.status !== 'available' || freshSlot.bookingId) {
      setError('Это окно уже занято или недоступно. Обновите расписание.')
      return
    }
    const duplicate = db.bookings.bySchool(schoolId).some((booking) => {
      const bookingSlot = db.slots.byId(booking.slotId)
      return booking.status === 'active' && booking.studentId === student.id && bookingSlot?.date === freshSlot.date && bookingSlot?.time === freshSlot.time
    })
    if (duplicate) {
      setError('У ученика уже есть активная запись на это время.')
      return
    }
    setPending(true)
    setError('')
    try {
      const result = await createBookingConfirmed({
        schoolId,
        branchId: freshSlot.branchId,
        instructorId: freshSlot.instructorId,
        slotId: freshSlot.id,
        studentName: student.name,
        studentPhone: student.phone,
        sessionId: `admin-${Date.now()}`,
      })
      if (!result.ok || !result.booking) throw new Error(result.error ?? 'Не удалось записать ученика.')
      createCurrentStaffAuditEntry(schoolId, 'booking_created', 'booking', result.booking.id, `Админ записал ${student.name} на ${freshSlot.date} ${freshSlot.time}`)
      onBooked()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось записать ученика.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4 p-5">
      <div className="rounded-[18px] bg-[#F2F6FA] p-4">
        <p className="text-[24px] font-semibold leading-none text-[#111315]">{format(getSlotDateTime(slot), 'dd.MM HH:mm')}</p>
        <p className="mt-1 text-[13px] font-medium text-[#687381]">Перед сохранением окно проверяется повторно, чтобы не посадить двух учеников на один слот.</p>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Ученик</span>
        <select name="booking-student" autoComplete="off" value={studentId} onChange={(event) => setStudentId(event.target.value)} className="v-admin-input w-full">
          <option value="">Выберите ученика</option>
          {students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.phone}</option>)}
        </select>
      </label>
      {error ? <p aria-live="polite" className="rounded-[16px] bg-[#EAF3FF] px-3 py-2 text-[13px] font-medium text-[#315A7C]">{error}</p> : null}
      <div className="v-modal-actions">
        <button type="button" onClick={onBooked} disabled={pending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Отмена</button>
        <button type="button" onClick={submit} disabled={pending} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Записываем…' : 'Записать'}</button>
      </div>
    </div>
  )
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function SlotTemplateForm({
  schoolId,
  instructors,
  branches,
  onClose,
}: {
  schoolId: string
  instructors: Instructor[]
  branches: Branch[]
  onClose: () => void
}) {
  const activeInstructors = instructors.filter((instructor) => instructor.isActive)
  const activeBranches = branches.filter((branch) => branch.isActive)
  const [instructorId, setInstructorId] = useState(activeInstructors[0]?.id ?? '')
  const [branchId, setBranchId] = useState(activeInstructors[0]?.branchId ?? activeBranches[0]?.id ?? '')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [weeks, setWeeks] = useState('4')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [duration, setDuration] = useState('90')
  const [breakMinutes, setBreakMinutes] = useState('15')
  const [days, setDays] = useState<number[]>([1, 3, 5])
  const [result, setResult] = useState('')
  const [pending, setPending] = useState(false)

  const selectedInstructor = activeInstructors.find((instructor) => instructor.id === instructorId)

  if (!activeInstructors.length || !activeBranches.length) {
    return (
      <div className="space-y-4 p-5">
        <div className="rounded-[18px] border border-[#BFDBFE] bg-[#EFF6FF] p-4">
          <strong className="block text-[16px] font-black text-[#111827]">Добавьте активный филиал и инструктора</strong>
          <span className="mt-1 block text-[13px] font-bold leading-5 text-[#667085]">Расписание не запустится, пока школе не задано место занятий и ответственный инструктор.</span>
        </div>
        <div className="v-modal-actions"><button type="button" onClick={onClose} className="v-admin-button-secondary flex-1">Закрыть</button></div>
      </div>
    )
  }

  const toggleDay = (day: number) => {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])
  }

  const submit = async () => {
    const access = assertAdminPermission('schedule.manage')
    if (!access.ok) return
    if (pending) return

    const parsedWeeks = Number(weeks)
    const parsedDuration = Number(duration)
    const parsedBreakMinutes = Number(breakMinutes)
    const start = timeToMinutes(startTime)
    const end = timeToMinutes(endTime)
    setResult('')
    if (!instructorId || !branchId || !startDate || days.length === 0 || !Number.isFinite(parsedWeeks) || !Number.isFinite(parsedDuration) || !Number.isFinite(parsedBreakMinutes) || start >= end) {
      setResult('Проверьте поля.')
      return
    }

    const firstDate = new Date(`${startDate}T00:00:00`)
    const lastDate = addDays(firstDate, parsedWeeks * 7 - 1)
    setPending(true)
    const response = await createBulkSlotsConfirmed({
      schoolId,
      instructorId,
      branchId,
      dateFrom: format(firstDate, 'yyyy-MM-dd'),
      dateTo: format(lastDate, 'yyyy-MM-dd'),
      weekdays: days.map((day) => day === 7 ? 0 : day),
      windowStart: startTime,
      windowEnd: endTime,
      duration: parsedDuration,
      lessonType: 'driving',
      breakMinutes: parsedBreakMinutes,
    })
    setPending(false)
    if (!response.ok || !response.result) {
      setResult(response.error ?? 'Не удалось создать окна.')
      return
    }
    createCurrentStaffAuditEntry(schoolId, 'slot_created', 'slot', 'template', `Создан шаблон окон: ${response.result.createdCount}`)
    setResult(`Создано: ${response.result.createdCount}. Пропущено: ${response.result.skippedDuplicates + response.result.skippedPast}.`)
  }

  return (
    <div className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Инструктор</span>
          <select name="instructor" autoComplete="off" value={instructorId} onChange={(event) => { const next = activeInstructors.find((item) => item.id === event.target.value); setInstructorId(event.target.value); if (next) setBranchId(next.branchId) }} className="v-admin-input w-full">
            {activeInstructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Филиал</span>
          <select name="branch" autoComplete="off" value={branchId} onChange={(event) => setBranchId(event.target.value)} className="v-admin-input w-full">
            {activeBranches.filter((branch) => !selectedInstructor || branch.id === selectedInstructor.branchId).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">С даты</span>
          <input type="date" name="template-start-date" autoComplete="off" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="v-admin-input w-full" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Недель</span>
          <input type="number" name="template-weeks" inputMode="numeric" autoComplete="off" min="1" max="12" value={weeks} onChange={(event) => setWeeks(event.target.value)} className="v-admin-input w-full" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Начало</span>
          <input type="time" name="start-time" autoComplete="off" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="v-admin-input w-full" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Конец</span>
          <input type="time" name="end-time" autoComplete="off" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="v-admin-input w-full" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Длительность занятия</span>
          <select name="duration" autoComplete="off" value={duration} onChange={(event) => setDuration(event.target.value)} className="v-admin-input w-full">
            {DURATION_OPTIONS.map((value) => <option key={value} value={value}>{formatDuration(value)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Перерыв между окнами</span>
          <select name="break-minutes" autoComplete="off" value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)} className="v-admin-input w-full">
            {[0, 10, 15, 30, 45, 60].map((value) => <option key={value} value={value}>{value === 0 ? 'Без перерыва' : formatDuration(value)}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {[
          [1, 'Пн'], [2, 'Вт'], [3, 'Ср'], [4, 'Чт'], [5, 'Пт'], [6, 'Сб'], [7, 'Вс'],
        ].map(([day, label]) => (
          <button key={day} type="button" onClick={() => toggleDay(Number(day))} className={`min-h-10 rounded-full border text-[13px] font-medium ${days.includes(Number(day)) ? 'border-[#111827] bg-[#111827] text-white' : 'border-[#111827]/[0.08] bg-white text-[#687381]'}`}>
            {label}
          </button>
        ))}
      </div>
      {result ? <p className="rounded-[16px] bg-[#F2F6FA] px-3 py-2 text-[13px] font-medium text-[#2A2D2F]">{result}</p> : null}
      <div className="v-modal-actions">
        <button type="button" onClick={onClose} disabled={pending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Закрыть</button>
        <button type="button" onClick={submit} disabled={pending} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Создаём…' : 'Создать'}</button>
      </div>
    </div>
  )
}

function CreateSlotForm({
  schoolId,
  instructors,
  branches,
  onClose,
}: {
  schoolId: string
  instructors: Instructor[]
  branches: Branch[]
  onClose: () => void
}) {
  const activeInstructors = instructors.filter((instructor) => instructor.isActive)
  const activeBranches = branches.filter((branch) => branch.isActive)
  const [instructorId, setInstructorId] = useState(activeInstructors[0]?.id ?? '')
  const [branchId, setBranchId] = useState(activeInstructors[0]?.branchId ?? activeBranches[0]?.id ?? '')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState('90')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const selectedInstructor = activeInstructors.find((instructor) => instructor.id === instructorId)

  if (!activeInstructors.length || !activeBranches.length) {
    return (
      <div className="space-y-4 p-5">
        <div className="rounded-[18px] border border-[#BFDBFE] bg-[#EFF6FF] p-4">
          <strong className="block text-[16px] font-black text-[#111827]">Добавьте активный филиал и инструктора</strong>
          <span className="mt-1 block text-[13px] font-bold leading-5 text-[#667085]">После этого можно создавать окна и показывать их ученикам.</span>
        </div>
        <div className="v-modal-actions"><button type="button" onClick={onClose} className="v-admin-button-secondary flex-1">Закрыть</button></div>
      </div>
    )
  }

  const handleSubmit = async () => {
    const access = assertAdminPermission('schedule.manage')
    if (!access.ok) return
    if (pending) return

    const parsedDuration = Number(duration)
    setError('')
    if (!schoolId || !instructorId || !branchId || !date || !time || !Number.isFinite(parsedDuration)) {
      setError('Заполните инструктора, филиал, дату, время и длительность.')
      return
    }
    setPending(true)
    const result = await createSlotConfirmed({
      schoolId,
      instructorId,
      branchId,
      date,
      startTime: time,
      duration: parsedDuration,
      lessonType: 'driving',
    })
    setPending(false)
    if (!result.ok || !result.slot) {
      setError(result.error ?? 'Не удалось создать окно.')
      return
    }
    createCurrentStaffAuditEntry(schoolId, 'slot_created', 'slot', result.slot.id, `Создано окно ${date} ${time}`)
    onClose()
  }

  return (
    <div className="space-y-4 p-5">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Инструктор</label>
        <select name="instructor" autoComplete="off" value={instructorId} onChange={(event) => { const next = activeInstructors.find((item) => item.id === event.target.value); setInstructorId(event.target.value); if (next) setBranchId(next.branchId) }} className="v-admin-input w-full">
          {activeInstructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Филиал</label>
        <select name="branch" autoComplete="off" value={branchId} onChange={(event) => setBranchId(event.target.value)} className="v-admin-input w-full">
          {activeBranches.filter((branch) => !selectedInstructor || branch.id === selectedInstructor.branchId).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Дата</label>
          <input type="date" name="slot-date" autoComplete="off" value={date} onChange={(event) => setDate(event.target.value)} className="v-admin-input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Время</label>
          <input type="time" name="slot-time" autoComplete="off" value={time} onChange={(event) => setTime(event.target.value)} className="v-admin-input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-[#66717D]">Длительность</label>
          <select name="duration" autoComplete="off" value={duration} onChange={(event) => setDuration(event.target.value)} className="v-admin-input w-full">
            {DURATION_OPTIONS.map((value) => <option key={value} value={value}>{formatDuration(value)}</option>)}
          </select>
        </div>
      </div>
      {error ? <p className="rounded-[16px] bg-[#EAF3FF] px-3 py-2 text-[13px] font-medium text-[#315A7C]">{error}</p> : null}
      <div className="v-modal-actions">
        <button type="button" onClick={onClose} disabled={pending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Отмена</button>
        <button type="button" onClick={handleSubmit} disabled={pending} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Создаём…' : 'Создать'}</button>
      </div>
    </div>
  )
}
