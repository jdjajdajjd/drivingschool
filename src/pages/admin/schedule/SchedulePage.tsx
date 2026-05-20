import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { format, addDays, subDays, parseISO, isSameDay, addMinutes } from 'date-fns'
import { ru } from 'date-fns/locale'
import { BottomSheet } from '../../../components/admin/core/BottomSheet'
import { formatDuration } from '../../../lib/utils'
import { useToast } from '../../../components/ui/Toast'
import { db } from '../../../services/storage'
import { getSlotsBySchool, createSlot, createBulkSlots, getSlotsByInstructor, type CreateSlotParams } from '../../../services/slotService'
import type { SlotStatus, ResolvedSlot } from '../../../types'

// Icons
const ChevronLeft = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const ChevronRight = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
)

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

const FilterIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
  </svg>
)

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
)

const BulkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
)

// Slot colors based on status
const getSlotColor = (status: SlotStatus) => {
  switch (status) {
    case 'available':
      return { bg: 'bg-success-soft', border: 'border-success/30', text: 'text-success' }
    case 'booked':
      return { bg: 'bg-info-soft', border: 'border-info/30', text: 'text-info' }
    case 'cancelled':
      return { bg: 'bg-error-soft', border: 'border-error/30', text: 'text-error' }
    default:
      return { bg: 'bg-surface-soft', border: 'border-border', text: 'text-text-muted' }
  }
}

const LESSON_TYPES = [
  { value: 'driving', label: 'Вождение' },
  { value: 'main', label: 'Основной' },
  { value: 'extra', label: 'Доп. занятие' },
  { value: 'practice_ground', label: 'Площадка' },
  { value: 'city', label: 'Город' },
  { value: 'exam_route', label: 'Экзамен. маршрут' },
]

const DURATIONS = [45, 60, 90, 120]
const TIME_OPTIONS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']

export function SchedulePage() {
  const { showToast } = useToast()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [selectedInstructor, setSelectedInstructor] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showBulkSheet, setShowBulkSheet] = useState(false)
  const [schoolId, setSchoolId] = useState<string>('')
  const [refreshKey, setRefreshKey] = useState(0)

  // Bulk creation wizard state
  const [bulkStep, setBulkStep] = useState(1)
  const [bulkInstructor, setBulkInstructor] = useState('')
  const [bulkBranch, setBulkBranch] = useState('')
  const [bulkDateFrom, setBulkDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [bulkDateTo, setBulkDateTo] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'))
  const [bulkWeekdays, setBulkWeekdays] = useState<number[]>([1, 2, 3, 4, 5]) // Mon-Fri
  const [bulkStartTime, setBulkStartTime] = useState('09:00')
  const [bulkEndTime, setBulkEndTime] = useState('18:00')
  const [bulkDuration, setBulkDuration] = useState(60)
  const [bulkLessonType, setBulkLessonType] = useState('driving')
  const [bulkBreakMinutes, setBulkBreakMinutes] = useState(0)

  // Single slot creation state
  const [newSlotTime, setNewSlotTime] = useState('10:00')
  const [newSlotDuration, setNewSlotDuration] = useState(60)
  const [newSlotLessonType, setNewSlotLessonType] = useState('driving')
  const [newSlotInstructor, setNewSlotInstructor] = useState('')

  useEffect(() => {
    const schools = db.schools.all()
    if (schools.length > 0) {
      setSchoolId(schools[0].id)
    }
  }, [])

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  // Get branches and instructors
  const branches = useMemo(() => 
    schoolId ? db.branches.bySchool(schoolId).filter(b => b.isActive) : []
  , [schoolId])

  const instructors = useMemo(() => {
    const all = schoolId ? db.instructors.bySchool(schoolId).filter(i => i.isActive) : []
    if (selectedBranch) {
      return all.filter(i => i.branchId === selectedBranch)
    }
    return all
  }, [schoolId, selectedBranch])

  // Get slots for selected date/instructor
  const slots = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    let filteredSlots: ResolvedSlot[]

    if (selectedInstructor) {
      filteredSlots = getSlotsByInstructor(selectedInstructor)
        .filter(r => r.slot.date === dateStr)
    } else if (schoolId) {
      filteredSlots = getSlotsBySchool(schoolId)
        .filter(r => r.slot.date === dateStr)
        .filter(r => selectedBranch ? r.slot.branchId === selectedBranch : true)
    } else {
      filteredSlots = []
    }

    return filteredSlots.sort((a, b) => a.slot.time.localeCompare(b.slot.time))
  }, [selectedDate, selectedInstructor, selectedBranch, schoolId, refreshKey])

  // Preview bulk creation result
  const bulkPreview = useMemo(() => {
    if (!bulkInstructor || !bulkBranch) return null

    let created = 0
    let conflicts = 0

    const instructor = db.instructors.byId(bulkInstructor)
    if (!instructor) return null

    const dateFrom = parseISO(bulkDateFrom)
    const dateTo = parseISO(bulkDateTo)
    let cursor = dateFrom

    while (cursor <= dateTo) {
      if (bulkWeekdays.includes(cursor.getDay())) {
        const dateStr = format(cursor, 'yyyy-MM-dd')
        
        // Simulate window iteration
        let timeCursor = parseISO(`${dateStr}T${bulkStartTime}`)
        const windowEnd = parseISO(`${dateStr}T${bulkEndTime}`)

        while (true) {
          const timeStr = format(timeCursor, 'HH:mm')
          const endTime = addMinutes(timeCursor, bulkDuration)
          
          if (endTime > windowEnd) break

          // Check for conflict
          const hasConflict = slots.some(s => 
            s.slot.instructorId === bulkInstructor &&
            s.slot.date === dateStr &&
            s.slot.time === timeStr
          )

          if (hasConflict) {
            conflicts++
          } else {
            created++
          }

          timeCursor = addMinutes(timeCursor, bulkDuration + bulkBreakMinutes)
        }
      }
      cursor = addDays(cursor, 1)
    }

    return { created, conflicts }
  }, [bulkInstructor, bulkBranch, bulkDateFrom, bulkDateTo, bulkWeekdays, bulkStartTime, bulkEndTime, bulkDuration, bulkBreakMinutes, slots])

  const handleCreateSlot = () => {
    if (!schoolId || !newSlotInstructor || !bulkBranch) return

    const params: CreateSlotParams = {
      schoolId,
      branchId: bulkBranch,
      instructorId: newSlotInstructor,
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime: newSlotTime,
      duration: newSlotDuration,
      lessonType: newSlotLessonType as any,
    }

    const result = createSlot(params)
    if (result.ok) {
      setShowCreateSheet(false)
      setNewSlotTime('10:00')
      setNewSlotDuration(60)
      setNewSlotInstructor('')
      refresh()
    } else {
      showToast(result.error || 'Ошибка', 'error')
    }
  }

  const handleBulkCreate = () => {
    if (!schoolId || !bulkInstructor) return

    const result = createBulkSlots({
      schoolId,
      branchId: bulkBranch,
      instructorId: bulkInstructor,
      dateFrom: bulkDateFrom,
      dateTo: bulkDateTo,
      weekdays: bulkWeekdays,
      windowStart: bulkStartTime,
      windowEnd: bulkEndTime,
      duration: bulkDuration,
      lessonType: bulkLessonType as any,
      breakMinutes: bulkBreakMinutes,
    })

    if (result.ok && result.result) {
      setShowBulkSheet(false)
      setBulkStep(1)
      refresh()
    } else {
      showToast(result.error || 'Ошибка', 'error')
    }
  }

  const selectedInstructorData = selectedInstructor ? db.instructors.byId(selectedInstructor) : null
  const selectedBranchData = selectedBranch ? db.branches.byId(selectedBranch) : null

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-black tracking-tight text-ink">Расписание</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkSheet(true)}
                className="flex h-9 items-center gap-1.5 rounded-[10px] border border-border bg-surface px-3 text-[12px] font-bold text-ink transition hover:border-border-strong active:scale-95"
              >
                <BulkIcon />
                Массовое
              </button>
              <button
                onClick={() => setShowCreateSheet(true)}
                className="flex h-9 items-center gap-1.5 rounded-[10px] bg-ink px-3 text-[12px] font-bold text-surface transition hover:bg-ink/90 active:scale-95"
              >
                <PlusIcon />
                Время
              </button>
            </div>
          </div>
        </div>

        {/* Date selector */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <button
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-surface text-ink transition hover:border-border-strong active:scale-95"
          >
            <ChevronLeft />
          </button>
          
          <button
            onClick={() => setSelectedDate(new Date())}
            className={`flex-1 rounded-[10px] border py-2 text-center text-[14px] font-bold transition ${
              isSameDay(selectedDate, new Date())
                ? 'border-accent bg-accent-soft text-accent-dark'
                : 'border-border bg-surface text-ink hover:border-border-strong'
            }`}
          >
            {isSameDay(selectedDate, new Date()) ? 'Сегодня' : format(selectedDate, 'd MMM', { locale: ru })}
          </button>

          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-surface text-ink transition hover:border-border-strong active:scale-95"
          >
            <ChevronRight />
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex h-9 w-9 items-center justify-center rounded-[10px] border bg-surface px-0 text-ink transition hover:border-border-strong active:scale-95 ${
              (selectedBranch || selectedInstructor) ? 'border-info text-info' : 'border-border'
            }`}
          >
            <FilterIcon />
          </button>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3">
            <select
              value={selectedBranch}
              onChange={e => {
                setSelectedBranch(e.target.value)
                setSelectedInstructor('')
              }}
              className="flex-1 min-w-[140px] rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] font-medium text-ink focus:border-border-strong focus:outline-none"
            >
              <option value="">Все филиалы</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              value={selectedInstructor}
              onChange={e => setSelectedInstructor(e.target.value)}
              className="flex-1 min-w-[140px] rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] font-medium text-ink focus:border-border-strong focus:outline-none"
            >
              <option value="">Все инструкторы</option>
              {instructors.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Active filters chips */}
        {(selectedBranch || selectedInstructor) && (
          <div className="flex gap-2 px-4 pb-3">
            {selectedBranchData && (
              <button
                onClick={() => setSelectedBranch('')}
                className="flex items-center gap-1 rounded-full border border-info/30 bg-info-soft px-2.5 py-1 text-[11px] font-bold text-info"
              >
                {selectedBranchData.name}
                <XIcon />
              </button>
            )}
            {selectedInstructorData && (
              <button
                onClick={() => setSelectedInstructor('')}
                className="flex items-center gap-1 rounded-full border border-info/30 bg-info-soft px-2.5 py-1 text-[11px] font-bold text-info"
              >
                {selectedInstructorData.name}
                <XIcon />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
        <span className="text-[12px] font-bold text-text-muted">
          {format(selectedDate, 'EEEE, d MMMM', { locale: ru })}
        </span>
        <div className="flex items-center gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1 text-success">
            <span className="h-2 w-2 rounded-full bg-success" />
            {slots.filter(s => s.slot.status === 'available').length} св.
          </span>
          <span className="flex items-center gap-1 text-info">
            <span className="h-2 w-2 rounded-full bg-info" />
            {slots.filter(s => s.slot.status === 'booked').length} зан.
          </span>
        </div>
      </div>

      {/* Time grid */}
      <div className="px-4 py-3">
        {slots.length === 0 ? (
          <div className="rounded-[14px] border border-border bg-surface p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[12px] bg-surface-soft">
              <CalendarIcon />
            </div>
            <p className="text-[14px] font-bold text-ink">Нет свободного времени</p>
            <p className="mt-1 text-[12px] text-text-muted">Добавьте окна, чтобы они появились в расписании</p>
            <button
              onClick={() => setShowCreateSheet(true)}
              className="mt-4 rounded-[10px] bg-ink px-4 py-2 text-[13px] font-bold text-surface transition hover:bg-ink/90"
            >
              Добавить время
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {slots.map((entry, idx) => {
              const { slot, instructor, branch, booking, student } = entry
              const colors = getSlotColor(slot.status)

              return (
                <div
                  key={slot.id}
                  className={`flex items-center gap-3 rounded-[12px] border p-3 transition hover:border-border-strong ${colors.bg} ${colors.border}`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  {/* Time */}
                  <div className="w-12 shrink-0 text-center">
                    <span className={`text-[16px] font-black ${colors.text}`}>
                      {slot.time.slice(0, 5)}
                    </span>
                    <p className="text-[10px] font-medium text-text-muted">
                      {formatDuration(slot.duration)}
                    </p>
                  </div>

                  {/* Instructor/Student info */}
                  <div className="min-w-0 flex-1">
                    {slot.status === 'booked' ? (
                      <>
                        <p className="truncate text-[13px] font-bold text-ink">
                          {student?.name || booking?.studentName || 'Ученик'}
                        </p>
                        <p className="truncate text-[11px] text-text-muted">
                          {instructor?.name || '—'} · {branch?.name || '—'}
                        </p>
                      </>
                    ) : slot.status === 'available' ? (
                      <>
                        <p className="text-[13px] font-bold text-success">
                          Свободно
                        </p>
                        <p className="text-[11px] text-text-muted">
                          {instructor?.name || '—'} · {branch?.name || '—'}
                        </p>
                      </>
                    ) : (
                      <p className="text-[13px] font-bold text-error">
                        Отменён
                      </p>
                    )}
                  </div>

                  {/* Lesson type badge */}
                  <div className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${colors.border} ${colors.text}`}>
                    {slot.lessonType === 'driving' ? 'Вождение' :
                     slot.lessonType === 'practice_ground' ? 'Площадка' :
                     slot.lessonType === 'city' ? 'Город' :
                     slot.lessonType || 'Вождение'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Single Slot Sheet */}
      <BottomSheet
        open={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        title="Новое время"
      >
        <div className="space-y-4">
          {/* Instructor */}
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
              Инструктор
            </label>
            <select
              value={newSlotInstructor}
              onChange={e => setNewSlotInstructor(e.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-[14px] font-medium text-ink focus:border-border-strong focus:outline-none"
            >
              <option value="">Выберите инструктора</option>
              {instructors.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
              Время
            </label>
            <select
              value={newSlotTime}
              onChange={e => setNewSlotTime(e.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-[14px] font-medium text-ink focus:border-border-strong focus:outline-none"
            >
              {TIME_OPTIONS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
              Длительность
            </label>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setNewSlotDuration(d)}
                  className={`flex-1 rounded-[10px] border py-2 text-[13px] font-bold transition ${
                    newSlotDuration === d
                      ? 'border-ink bg-ink text-surface'
                      : 'border-border bg-surface text-ink hover:border-border-strong'
                  }`}
                >
                  {formatDuration(d)}
                </button>
              ))}
            </div>
          </div>

          {/* Lesson Type */}
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
              Тип занятия
            </label>
            <select
              value={newSlotLessonType}
              onChange={e => setNewSlotLessonType(e.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-[14px] font-medium text-ink focus:border-border-strong focus:outline-none"
            >
              {LESSON_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Create button */}
          <button
            onClick={handleCreateSlot}
            disabled={!newSlotInstructor}
            className="w-full rounded-[12px] bg-ink py-3 text-[14px] font-bold text-surface transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Добавить время
          </button>
        </div>
      </BottomSheet>

      {/* Bulk Create Sheet with Wizard */}
      <BottomSheet
        open={showBulkSheet}
        onClose={() => {
          setShowBulkSheet(false)
          setBulkStep(1)
        }}
        title={bulkStep === 3 ? 'Предпросмотр' : 'Массовое создание'}
      >
        <div className="space-y-4">
          {/* Step indicators */}
          <div className="flex items-center justify-between">
            {[
              { n: 1, label: 'Кто' },
              { n: 2, label: 'Когда' },
              { n: 3, label: 'Создать' },
            ].map((step, idx) => (
              <Fragment key={step.n}>
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-black ${
                    bulkStep >= step.n ? 'bg-ink text-surface' : 'border border-border bg-surface text-text-muted'
                  }`}>
                    {step.n}
                  </div>
                  <span className={`text-[12px] font-bold ${bulkStep >= step.n ? 'text-ink' : 'text-text-muted'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < 2 && <div className={`flex-1 h-0.5 mx-2 ${bulkStep > step.n ? 'bg-ink' : 'bg-border'}`} />}
              </Fragment>
            ))}
          </div>

          {/* Step 1: Who (Instructor/Branch) */}
          {bulkStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
                  Филиал
                </label>
                <select
                  value={bulkBranch}
                  onChange={e => {
                    setBulkBranch(e.target.value)
                    setBulkInstructor('')
                  }}
                  className="w-full rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-[14px] font-medium text-ink focus:border-border-strong focus:outline-none"
                >
                  <option value="">Выберите филиал</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
                  Инструктор
                </label>
                <select
                  value={bulkInstructor}
                  onChange={e => setBulkInstructor(e.target.value)}
                  className="w-full rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-[14px] font-medium text-ink focus:border-border-strong focus:outline-none"
                >
                  <option value="">Выберите инструктора</option>
                  {instructors.filter(i => !bulkBranch || i.branchId === bulkBranch).map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setBulkStep(2)}
                disabled={!bulkInstructor}
                className="w-full rounded-[12px] bg-ink py-3 text-[14px] font-bold text-surface transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Далее
              </button>
            </div>
          )}

          {/* Step 2: When (Dates/Times) */}
          {bulkStep === 2 && (
            <div className="space-y-4">
              {/* Weekdays */}
              <div>
                <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
                  Дни недели
                </label>
                <div className="flex gap-1">
                  {[
                    { n: 0, label: 'Вс' },
                    { n: 1, label: 'Пн' },
                    { n: 2, label: 'Вт' },
                    { n: 3, label: 'Ср' },
                    { n: 4, label: 'Чт' },
                    { n: 5, label: 'Пт' },
                    { n: 6, label: 'Сб' },
                  ].map(day => (
                    <button
                      key={day.n}
                      onClick={() => {
                        if (bulkWeekdays.includes(day.n)) {
                          setBulkWeekdays(bulkWeekdays.filter(d => d !== day.n))
                        } else {
                          setBulkWeekdays([...bulkWeekdays, day.n].sort())
                        }
                      }}
                      className={`flex-1 rounded-[8px] border py-2 text-[11px] font-bold transition ${
                        bulkWeekdays.includes(day.n)
                          ? 'border-ink bg-ink text-surface'
                          : 'border-border bg-surface text-text-muted hover:border-border-strong'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
                    С
                  </label>
                  <input
                    type="date"
                    value={bulkDateFrom}
                    onChange={e => setBulkDateFrom(e.target.value)}
                    className="w-full rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-[14px] font-medium text-ink focus:border-border-strong focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
                    По
                  </label>
                  <input
                    type="date"
                    value={bulkDateTo}
                    onChange={e => setBulkDateTo(e.target.value)}
                    className="w-full rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-[14px] font-medium text-ink focus:border-border-strong focus:outline-none"
                  />
                </div>
              </div>

              {/* Time window */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
                    Начало
                  </label>
                  <select
                    value={bulkStartTime}
                    onChange={e => setBulkStartTime(e.target.value)}
                    className="w-full rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-[14px] font-medium text-ink focus:border-border-strong focus:outline-none"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
                    Конец
                  </label>
                  <select
                    value={bulkEndTime}
                    onChange={e => setBulkEndTime(e.target.value)}
                    className="w-full rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-[14px] font-medium text-ink focus:border-border-strong focus:outline-none"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Duration & Break */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
                    Длительность
                  </label>
                  <select
                    value={bulkDuration}
                    onChange={e => setBulkDuration(Number(e.target.value))}
                    className="w-full rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-[14px] font-medium text-ink focus:border-border-strong focus:outline-none"
                  >
                    {DURATIONS.map(d => (
                    <option key={d} value={d}>{formatDuration(d)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
                    Перерыв
                  </label>
                  <select
                    value={bulkBreakMinutes}
                    onChange={e => setBulkBreakMinutes(Number(e.target.value))}
                    className="w-full rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-[14px] font-medium text-ink focus:border-border-strong focus:outline-none"
                  >
                    <option value={0}>Без перерыва</option>
                    <option value={5}>{formatDuration(5)}</option>
                    <option value={10}>{formatDuration(10)}</option>
                    <option value={15}>{formatDuration(15)}</option>
                    <option value={30}>{formatDuration(30)}</option>
                  </select>
                </div>
              </div>

              {/* Lesson type */}
              <div>
                <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-text-muted">
                  Тип занятия
                </label>
                <select
                  value={bulkLessonType}
                  onChange={e => setBulkLessonType(e.target.value)}
                  className="w-full rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-[14px] font-medium text-ink focus:border-border-strong focus:outline-none"
                >
                  {LESSON_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setBulkStep(1)}
                  className="flex-1 rounded-[12px] border border-border bg-surface py-3 text-[14px] font-bold text-ink transition hover:border-border-strong"
                >
                  Назад
                </button>
                <button
                  onClick={() => setBulkStep(3)}
                  className="flex-1 rounded-[12px] bg-ink py-3 text-[14px] font-bold text-surface transition hover:bg-ink/90"
                >
                  Далее
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {bulkStep === 3 && bulkPreview && (
            <div className="space-y-4">
              <div className="rounded-[12px] border border-success/30 bg-success-soft p-4 text-center">
                <p className="text-[24px] font-black text-success">{bulkPreview.created}</p>
                <p className="text-[12px] font-bold text-success">окон будет создано</p>
              </div>

              {bulkPreview.conflicts > 0 && (
                <div className="rounded-[12px] border border-warning/30 bg-warning-soft p-4 text-center">
                  <p className="text-[16px] font-black text-warning">{bulkPreview.conflicts}</p>
                  <p className="text-[12px] font-bold text-warning">конфликтов будет пропущено</p>
                </div>
              )}

              <div className="rounded-[12px] border border-border bg-surface-soft p-3 text-[12px] text-text-muted">
                <p><strong>Инструктор:</strong> {db.instructors.byId(bulkInstructor)?.name || '—'}</p>
                <p><strong>Период:</strong> {format(parseISO(bulkDateFrom), 'd MMM')} — {format(parseISO(bulkDateTo), 'd MMM yyyy', { locale: ru })}</p>
                <p><strong>Время:</strong> {bulkStartTime} — {bulkEndTime}</p>
                <p><strong>Длительность:</strong> {formatDuration(bulkDuration)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setBulkStep(2)}
                  className="flex-1 rounded-[12px] border border-border bg-surface py-3 text-[14px] font-bold text-ink transition hover:border-border-strong"
                >
                  Назад
                </button>
                <button
                  onClick={handleBulkCreate}
                  className="flex-1 rounded-[12px] bg-success py-3 text-[14px] font-bold text-surface transition hover:bg-success/90"
                >
                  Создать {bulkPreview.created} окон
                </button>
              </div>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}

export default SchedulePage
