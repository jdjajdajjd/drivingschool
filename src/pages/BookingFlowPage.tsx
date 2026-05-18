import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CalendarPlus, CarProfile as Car, CheckCircle as CheckCircle2, Clock as Clock3, ArrowCounterClockwise as RefreshCw } from '@phosphor-icons/react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { StateView } from '../components/ui/StateView'
import { LoadingScreen } from '../components/ui/loader'
import { useToast } from '../components/ui/Toast'
import { StickyActionBar } from '../components/ui/StickyActionBar'
import { Avatar } from '../components/ui/Avatar'
import {
  BookingDetailsCard,
  InstructorCompactCard,
  SuccessHeader,
  SummaryCard,
  TimeSlotGrid,
} from '../components/product/CompactCards'
import { getInstructorPhoto } from '../services/instructorPhotos'
import { getFutureAvailableSlots, loadPublicSchoolData, refreshPublicSlots } from '../services/publicSchoolData'
import { db, findSchoolNamespaceBySlug, setDataNamespace } from '../services/storage'
import { createSupabaseBooking } from '../services/supabasePublicService'
import {
  acquireSlotLock,
  createBooking,
  generateIcs,
  getAvailableSlots as getInstructorSlots,
  getOrCreateStudent,
  isValidRussianPhone,
  normalizePhone,
  releaseSessionLocks,
  releaseSlotLock,
} from '../services/bookingService'
import { findAnyStudentProfile, saveStudentProfile, saveStudentProfileToSupabaseWithSchool } from '../services/studentProfile'
import { isSupabaseConfigured } from '../lib/supabase'
import { DEMO_SCHOOL_SLUG } from '../services/schoolRoutes'
import type { Booking, Branch, Instructor, School, Slot } from '../types'
import { lessonTypeLabel } from './student/studentUtils'
import { formatHumanDate, formatTimeRange, isoDate } from '../utils/date'
import { formatInstructorName, generateId } from '../lib/utils'
import { normalizePersonName } from '../lib/nameFormat'
import { addDays, format, isSameDay, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { BrandMark } from '../components/layout/BrandMark'

void React


const ui = {
  surface: 'var(--surface)',
  surfaceSoft: 'var(--surface-soft)',
  surfaceMuted: 'var(--surface-muted)',
  text: 'var(--text)',
  textMuted: 'var(--text-muted)',
  textSoft: 'var(--text-soft)',
  border: 'var(--border)',
  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  green: 'var(--green)',
  greenSoft: 'var(--green-soft)',
  blueSoft: 'var(--blue-soft)',
  shadowCard: 'var(--shadow-card)',
} as const

type Step = 'date' | 'instructor' | 'time' | 'contacts' | 'confirm' | 'success' | 'account'

interface ContactForm {
  name: string
  phone: string
  email: string
  password: string
}

const emptyContact: ContactForm = { name: '', phone: '', email: '', password: '' }

interface SlotCardItem {
  slot: Slot
  instructor: Instructor | null
  branch: Branch | null
  mine: boolean
}

const stepMotion = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
} as const

function Progress({ step }: { step: Step }) {
  const order: Step[] = ['date', 'instructor', 'time', 'contacts', 'confirm']
  const current = Math.max(1, order.indexOf(step) + 1)
  const pct = step === 'success' || step === 'account' ? 100 : Math.min(100, Math.round((current / 5) * 100))

  return (
    <div
      className="px-4 py-3"
      style={{
        background: ui.surface,
        border: `1px solid ${ui.border}`,
        borderRadius: '18px',
        boxShadow: ui.shadowCard,
      }}
    >
      <div className="flex items-center justify-between">
        <p className="t-micro">
          {step === 'success' || step === 'account' ? 'Готово' : `Шаг ${current} из 5`}
        </p>
        <p className="t-micro" style={{ color: ui.textSoft }}>{pct}%</p>
      </div>
      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full" style={{ background: ui.surfaceMuted }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: ui.accent }}
        />
      </div>
    </div>
  )
}

function BookingMiniSummary({
  slot,
  instructor,
  branch,
}: {
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
}) {
  if (!slot && !instructor && !branch) return null

  return (
    <div
      className="flex items-center gap-3.5 p-4"
      style={{
        background: ui.surface,
        border: `1px solid ${ui.border}`,
        borderRadius: '18px',
        boxShadow: ui.shadowCard,
      }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: ui.accentSoft, color: ui.accent }}
      >
        <Car size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="truncate font-semibold leading-5"
          style={{ fontSize: '14px', color: ui.text }}
        >
          {slot ? `${formatHumanDate(slot.date, false)}, ${formatTimeRange(slot)}` : 'Время не выбрано'}
        </p>
        <p className="mt-0.5 truncate text-[12px] font-medium leading-5" style={{ color: ui.textMuted }}>
          {instructor ? formatInstructorName(instructor.name) : 'Инструктор'} · {branch?.name ?? 'Филиал'}
        </p>
      </div>
    </div>
  )
}


function VroomSchedulerPicker({
  days,
  selectedDate,
  selectedSlotId,
  slotsByDate,
  refreshing,
  lastRefreshAt,
  onSelectDate,
  onSelectSlot,
  onRefresh,
}: {
  days: string[]
  selectedDate: Date | null
  selectedSlotId: string
  slotsByDate: Record<string, SlotCardItem[]>
  refreshing: boolean
  lastRefreshAt: Date | null
  onSelectDate: (date: Date) => void
  onSelectSlot: (slot: Slot) => void
  onRefresh: () => void
}) {
  const baseDate = selectedDate ?? (days[0] ? parseISO(days[0]) : new Date())
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(baseDate, index))
  const selectedDateKey = selectedDate ? isoDate(selectedDate) : ''
  const selectedItems = selectedDateKey ? slotsByDate[selectedDateKey] ?? [] : []
  const freeCount = selectedItems.filter((item) => item.slot.status === 'available' || item.mine).length

  return (
    <div
      className="overflow-hidden rounded-[28px] p-4"
      style={{
        background: ui.surface,
        border: `1px solid ${ui.border}`,
        boxShadow: ui.shadowCard,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: ui.textSoft }}>Выберите дату и время</p>
          <h3 className="mt-1 text-[24px] font-bold capitalize tracking-[-0.03em]" style={{ color: ui.text }}>
            {format(baseDate, 'LLLL yyyy', { locale: ru })}
          </h3>
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-[12px] font-semibold active:scale-[0.97]"
          style={{ background: ui.surfaceSoft, color: ui.textMuted, border: `1px solid ${ui.border}` }}
          onClick={onRefresh}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Обновить
        </button>
      </div>

      <div className="no-scrollbar -mx-4 mt-4 overflow-x-auto px-4">
        <div className="flex min-w-max gap-2">
          {weekDays.map((day) => {
            const key = isoDate(day)
            const active = selectedDateKey === key
            const count = slotsByDate[key]?.filter((item) => item.slot.status === 'available' || item.mine).length ?? 0
            const weekday = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'][day.getDay()] ?? ''
            const disabled = count === 0 && !active
            return (
              <motion.button
                key={key}
                type="button"
                disabled={disabled}
                whileTap={disabled ? undefined : { scale: 0.97 }}
                onClick={() => onSelectDate(day)}
                className="grid shrink-0 place-items-center text-center transition disabled:opacity-35"
                style={{
                  width: 54,
                  minHeight: 78,
                  borderRadius: 20,
                  background: active ? ui.text : ui.surface,
                  color: active ? ui.surface : ui.text,
                  border: `1px solid ${active ? ui.text : ui.border}`,
                  boxShadow: active ? '0 14px 30px rgba(0,0,0,0.18)' : 'none',
                }}
                aria-label={format(day, 'EEEE, d MMMM', { locale: ru })}
              >
                <span className="text-[11px] font-semibold uppercase" style={{ color: active ? ui.surface : ui.textSoft, opacity: active ? 0.74 : 1 }}>
                  {weekday}
                </span>
                <span className="text-[21px] font-bold leading-6 tracking-[-0.02em]">{format(day, 'd')}</span>
                <span
                  className="mt-1 h-1.5 w-1.5 rounded-full"
                  style={{ background: count > 0 ? (active ? '#FFFFFF' : ui.green) : 'transparent' }}
                />
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-[18px] px-3 py-2" style={{ background: ui.surfaceSoft }}>
        <div>
          <p className="text-[15px] font-bold" style={{ color: ui.text }}>
            {selectedDate ? format(selectedDate, 'd MMMM', { locale: ru }) : 'День не выбран'}
          </p>
          <p className="mt-0.5 text-[12px] font-medium" style={{ color: ui.textMuted }}>
            {selectedDate ? `${freeCount} свободных окон` : 'Выберите день выше'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: ui.greenSoft, color: ui.green }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: ui.green }} />
          Онлайн
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {selectedItems.length === 0 ? (
          <div className="col-span-2 rounded-[20px] p-5 text-center" style={{ background: ui.surfaceSoft }}>
            <p className="text-[15px] font-semibold" style={{ color: ui.text }}>На этот день окон нет</p>
            <p className="mt-1 text-[13px] font-semibold" style={{ color: ui.textMuted }}>Сдвиньте дни выше или обновите расписание.</p>
          </div>
        ) : selectedItems.map((item) => {
          const busy = item.slot.status !== 'available' && !item.mine
          const active = selectedSlotId === item.slot.id
          return (
            <motion.button
              key={item.slot.id}
              type="button"
              disabled={busy}
              whileTap={busy ? undefined : { scale: 0.97 }}
              onClick={() => onSelectSlot(item.slot)}
              className="min-h-[112px] rounded-[20px] p-3 text-left transition disabled:opacity-45"
              style={{
                background: active ? ui.text : ui.surface,
                border: `1px solid ${active ? ui.text : ui.border}`,
                boxShadow: active ? '0 14px 30px rgba(0,0,0,0.16)' : 'none',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[18px] font-bold tracking-[-0.02em]" style={{ color: active ? ui.surface : ui.text }}>
                  {formatTimeRange(item.slot)}
                </span>
                {active ? <CheckCircle2 size={16} style={{ color: ui.surface }} /> : null}
              </div>
              <p className="mt-1 truncate text-[12px] font-semibold" style={{ color: active ? ui.surface : ui.textMuted, opacity: active ? 0.7 : 1 }}>
                {lessonTypeLabel(item.slot)} · {item.slot.duration} мин
              </p>
              <p className="mt-3 truncate text-[13px] font-bold" style={{ color: active ? ui.surface : ui.text }}>
                {item.instructor ? formatInstructorName(item.instructor.name) : 'Инструктор'}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium" style={{ color: active ? ui.surface : ui.textSoft, opacity: active ? 0.62 : 1 }}>
                {item.branch?.name ?? 'Филиал'}
              </p>
            </motion.button>
          )
        })}
      </div>

      {lastRefreshAt ? (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold" style={{ color: ui.textSoft }}>
          <Clock3 size={12} /> Обновлено {format(lastRefreshAt, 'HH:mm:ss')}
        </p>
      ) : null}
    </div>
  )
}


export function BookingFlowPage() {
  const { slug = DEMO_SCHOOL_SLUG } = useParams<{ slug: string }>()
  const schoolNamespace = findSchoolNamespaceBySlug(slug)
  const isWorkspace = slug === 'workspace'
  const isLocalSchool = Boolean(schoolNamespace) || isWorkspace
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const sessionId = useRef(generateId('session'))

  const [school, setSchool] = useState<School | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [slotsVersion, setSlotsVersion] = useState(0)
  const [step, setStep] = useState<Step>('date')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedInstructorId, setSelectedInstructorId] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState(params.get('slot') ?? '')
  const [form, setForm] = useState<ContactForm>(emptyContact)
  const [errors, setErrors] = useState<Partial<ContactForm>>({})
  const [createdBookingId, setCreatedBookingId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshingSlots, setRefreshingSlots] = useState(false)
  const [lastSlotsRefreshAt, setLastSlotsRefreshAt] = useState<Date | null>(null)

  useEffect(() => {
    const namespace = findSchoolNamespaceBySlug(slug)
    if (namespace) setDataNamespace(namespace)
    setLoading(true)
    void loadPublicSchoolData(slug, { preferLocal: isLocalSchool })
      .then((data) => {
        if (!data) return
        setSchool(data.school)
        setBranches(data.branches)
        setInstructors(data.instructors)

        const firstSlot = getFutureAvailableSlots(data.school.id)[0]
        if (firstSlot) {
          setSelectedDate((current) => current ?? parseISO(firstSlot.date))
        }

        const foundProfile = findAnyStudentProfile()
        if (foundProfile?.profile) {
          setForm((current) => ({
            ...current,
            name: foundProfile.profile.name,
            phone: foundProfile.profile.phone.replace(/^7/, '').slice(0, 10),
            email: foundProfile.profile.email ?? '',
          }))
        }

        // Check if a slot was pre-selected from URL
        const querySlot = params.get('slot')
        if (querySlot) {
          const slot = db.slots.byId(querySlot)
          if (slot) {
            setSelectedSlotId(slot.id)
            setSelectedInstructorId(slot.instructorId)
            setSelectedDate(parseISO(slot.date))
            setStep('contacts')
          }
        }
      })
      .finally(() => setLoading(false))

    return () => releaseSessionLocks(sessionId.current)
  }, [slug, params])

  useEffect(() => {
    if (!school) return undefined

    let disposed = false
    async function refresh() {
      if (!school || disposed) return
      setRefreshingSlots(true)
      await refreshPublicSlots(school.id, { preferLocal: isLocalSchool })
      if (!disposed) {
        setSlotsVersion((current) => current + 1)
        setLastSlotsRefreshAt(new Date())
        setRefreshingSlots(false)
      }
    }

    void refresh()
    const intervalId = window.setInterval(refresh, 12000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      disposed = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [school])

  const futureSlots = useMemo(
    () => (school ? getFutureAvailableSlots(school.id) : []),
    [school, slotsVersion],
  )

  const selectedInstructor = instructors.find((i) => i.id === selectedInstructorId) ?? null
  const selectedSlot = selectedSlotId ? db.slots.byId(selectedSlotId) : null
  const selectedBranch = selectedSlot
    ? db.branches.byId(selectedSlot.branchId)
    : selectedInstructor
      ? db.branches.byId(selectedInstructor.branchId)
      : null

  const availableDays = useMemo(() => {
    return Array.from(new Set(futureSlots.map((slot) => slot.date))).slice(0, 7)
  }, [futureSlots])

  const normalizedStudentPhone = normalizePhone(form.phone)

  // Instructors filtered by selected date
  const instructorsOnDate = useMemo(() => {
    if (!selectedDate) return instructors
    return instructors.filter((instructor) =>
      futureSlots.some(
        (slot) =>
          slot.instructorId === instructor.id &&
          isSameDay(parseISO(slot.date), selectedDate),
      ),
    )
  }, [selectedDate, instructors, futureSlots])

  // Slots for selected date + instructor
  const slotsForSelection = useMemo(() => {
    if (!selectedDate || !selectedInstructorId) return []
    return getInstructorSlots(selectedInstructorId, isoDate(selectedDate), sessionId.current)
      .filter((slot) => db.branches.byId(slot.branchId)?.isActive === true)
      .filter((slot) => db.instructors.byId(slot.instructorId)?.isActive === true)
  }, [selectedDate, selectedInstructorId])



  const slotsByDate = useMemo<Record<string, SlotCardItem[]>>(() => {
    if (!school) return {}
    const allBookings = db.bookings.bySchool(school.id)
    return db.slots.bySchool(school.id)
      .filter((slot) => new Date(`${slot.date}T${slot.time}:00`).getTime() > Date.now())
      .filter((slot) => db.branches.byId(slot.branchId)?.isActive === true)
      .filter((slot) => db.instructors.byId(slot.instructorId)?.isActive === true)
      .reduce<Record<string, SlotCardItem[]>>((acc, slot) => {
        const booking = slot.bookingId ? allBookings.find((item) => item.id === slot.bookingId) ?? null : null
        const item: SlotCardItem = {
          slot,
          instructor: db.instructors.byId(slot.instructorId),
          branch: db.branches.byId(slot.branchId),
          mine: Boolean(booking && normalizedStudentPhone && booking.studentPhone === normalizedStudentPhone),
        }
        acc[slot.date] = [...(acc[slot.date] ?? []), item].sort((left, right) => left.slot.time.localeCompare(right.slot.time))
        return acc
      }, {})
  }, [school, normalizedStudentPhone, slotsVersion])

  function handleRefreshSlots() {
    if (!school) return
    setRefreshingSlots(true)
    void refreshPublicSlots(school.id, { preferLocal: isLocalSchool }).then(() => {
      setSlotsVersion((current) => current + 1)
      setLastSlotsRefreshAt(new Date())
      setRefreshingSlots(false)
    })
  }

  function goBack() {
    if (step === 'date') navigate(`/school/${slug}`)
    else if (step === 'instructor') setStep('date')
    else if (step === 'time') setStep('instructor')
    else if (step === 'contacts') setStep('time')
    else if (step === 'confirm') setStep('contacts')
    else if (step === 'account') setStep('success')
    else navigate('/student')
  }

  function selectSlot(slot: Slot): boolean {
    if (selectedSlotId && selectedSlotId !== slot.id) {
      releaseSlotLock(selectedSlotId, sessionId.current)
    }
    const result = acquireSlotLock(slot.id, sessionId.current)
    if (!result.ok) {
      showToast(result.error ?? 'Это время уже недоступно.', 'error')
      setSlotsVersion((current) => current + 1)
      return false
    }
    setSelectedSlotId(slot.id)
    return true
  }

  function validateContacts(): boolean {
    const next: Partial<ContactForm> = {}
    if (!form.name.trim()) next.name = 'Введите имя.'
    if (!isValidRussianPhone(form.phone)) next.phone = 'Введите корректный телефон.'
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Введите корректный e-mail.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function quickBook(slot: Slot) {
    if (submitting) return
    const locked = selectSlot(slot)
    if (!locked) return
    setSelectedInstructorId(slot.instructorId)
    setSelectedDate(parseISO(slot.date))

    if (!form.name.trim() || !isValidRussianPhone(form.phone)) {
      setStep('contacts')
      return
    }

    setStep('confirm')
  }

  async function submitBooking(slotOverride?: Slot) {
    const bookingSlot = slotOverride ?? selectedSlot
    const bookingInstructor = bookingSlot ? db.instructors.byId(bookingSlot.instructorId) : selectedInstructor
    if (!school || !bookingSlot || !bookingInstructor || !validateContacts()) return
    setSelectedSlotId(bookingSlot.id)
    setSelectedInstructorId(bookingSlot.instructorId)
    setSelectedDate(parseISO(bookingSlot.date))
    setSubmitting(true)
    try {
      await refreshPublicSlots(school.id, { preferLocal: isLocalSchool })
      const freshSlot = db.slots.byId(bookingSlot.id)
      if (
        !freshSlot ||
        freshSlot.status !== 'available' ||
        db.branches.byId(freshSlot.branchId)?.isActive !== true ||
        db.instructors.byId(freshSlot.instructorId)?.isActive !== true
      ) {
        setSlotsVersion((current) => current + 1)
        throw new Error('Это время только что заняли. Выберите другое время.')
      }

      let bookingId = ''
      let bookingGroupId = ''

      try {
        if (isLocalSchool) throw new Error('Local school uses local booking')
        const result = await createSupabaseBooking({
          schoolId: school.id,
          studentName: normalizePersonName(form.name),
          studentPhone: form.phone,
          slotIds: [bookingSlot.id],
        })
        bookingId = result.bookingIds[0] ?? ''
        bookingGroupId = result.bookingGroupId
      } catch {
        const freshData = await loadPublicSchoolData(slug, { preferLocal: isLocalSchool })
        const freshLocalSlot = db.slots.byId(bookingSlot.id)
        const freshBranchActive = freshLocalSlot
          ? freshData?.branches.some((branch) => branch.id === freshLocalSlot.branchId && branch.isActive)
          : false
        const freshInstructorActive = freshLocalSlot
          ? freshData?.instructors.some((instructor) => instructor.id === freshLocalSlot.instructorId && instructor.isActive)
          : false
        if (
          !freshData?.school.isActive ||
          !freshLocalSlot ||
          freshLocalSlot.status !== 'available' ||
          !freshBranchActive ||
          !freshInstructorActive
        ) {
          setSlotsVersion((current) => current + 1)
          throw new Error('Это время больше недоступно. Выберите другое время.')
        }

        const local = createBooking({
          schoolId: school.id,
          branchId: freshLocalSlot.branchId,
          instructorId: freshLocalSlot.instructorId,
          slotId: freshLocalSlot.id,
          studentName: normalizePersonName(form.name),
          studentPhone: form.phone,
          sessionId: sessionId.current,
        })
        if (!local.ok || !local.booking) {
          throw new Error(local.error ?? 'Не удалось создать запись.')
        }
        bookingId = local.booking.id
      }

      const student = getOrCreateStudent(school.id, form.name, form.phone)
      const normalizedPhone = normalizePhone(form.phone)
      const booking: Booking = {
        id: bookingId || generateId('booking'),
        bookingGroupId: bookingGroupId || undefined,
        schoolId: school.id,
        slotId: bookingSlot.id,
        branchId: bookingSlot.branchId,
        instructorId: bookingSlot.instructorId,
        studentId: student.id,
        studentName: normalizePersonName(form.name),
        studentPhone: normalizedPhone,
        studentEmail: form.email.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      db.students.upsert({ ...student, name: normalizePersonName(form.name), phone: normalizedPhone, normalizedPhone, email: form.email.trim() })
      db.bookings.upsert(booking)
      db.slots.upsert({ ...bookingSlot, status: 'booked', bookingId: booking.id })
      releaseSessionLocks(sessionId.current)
      setCreatedBookingId(booking.id)
      setSlotsVersion((current) => current + 1)
      setStep('success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось создать запись.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function createAccount() {
    if (!school || !validateContacts()) return
    if (form.password.trim().length < 6) {
      setErrors((current) => ({ ...current, password: 'Минимум 6 символов.' }))
      return
    }
    setSubmitting(true)
    try {
      const profilePayload = { passwordSet: true, assignedBranchId: selectedBranch?.id, assignedInstructorId: selectedInstructor?.id, categoryCodes: ['B'], trainingStage: 'theory' as const, groupName: '' }
      if (isSupabaseConfigured()) {
        await saveStudentProfileToSupabaseWithSchool(school.id, school, form, profilePayload)
      } else {
        saveStudentProfile(school.id, form, profilePayload)
      }
      navigate('/student')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось создать кабинет.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function downloadCalendar() {
    if (!createdBookingId) return
    const content = generateIcs(createdBookingId)
    if (!content) {
      showToast('Не удалось подготовить файл календаря.', 'error')
      return
    }
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${createdBookingId}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Файл календаря готов.', 'success')
  }

  if (loading) return <LoadingScreen tone="student" />
  if (!school) {
    return (
      <div className="shell flex items-center justify-center px-4">
        <StateView
          kind="error"
          title="Автошкола не найдена"
          action={
            <Button onClick={() => navigate('/login')}>Вернуться ко входу</Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-dvh overflow-x-hidden" style={{ background: 'var(--page-bg)', color: ui.text }}>
      <main className="mx-auto w-full max-w-[1040px] overflow-x-hidden px-4 pb-8 pt-5 lg:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              onClick={goBack}
              className="flex min-h-10 items-center gap-2 rounded-md px-1 text-[13px] font-semibold transition active:scale-[0.97]"
              style={{ color: ui.textMuted, minHeight: 40 }}
            >
              <ArrowLeft size={16} />
              Назад
            </button>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark variant="dark" size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-black text-[var(--text)]">{school.name}</p>
              <p className="text-[12px] font-bold text-[var(--text-muted)]">Выбор занятия онлайн</p>
            </div>
          </div>
          {step !== 'date' ? <div className="w-full lg:w-[360px]"><Progress step={step} /></div> : null}
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={step} {...stepMotion}>

            {/* ── Step 1: Date ── */}
            {step === 'date' && (
              <section className="grid min-w-0 gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
                <div className="min-w-0 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
                  <h2 className="text-[34px] font-bold leading-tight" style={{ color: ui.text }}>Расписание</h2>
                  <p className="mt-3 text-[15px] font-semibold leading-6" style={{ color: ui.textSoft }}>Выберите свободное окно. Запись уйдёт автошколе сразу, без звонков и переписок.</p>
                  <div className="mt-5 grid gap-2">
                    <div className="rounded-[16px] bg-[var(--surface-muted)] p-4">
                      <p className="text-[12px] font-extrabold uppercase" style={{ color: ui.textSoft }}>Доступно дней</p>
                      <p className="mt-1 text-[26px] font-black leading-none" style={{ color: ui.text }}>{availableDays.length || 0}</p>
                    </div>
                    <button className="w-full rounded-[16px] px-4 py-3 text-[14px] font-extrabold active:scale-[0.98]" style={{ background: ui.accent, color: ui.surface }} onClick={() => setStep('instructor')}>
                      Выбрать по инструктору
                    </button>
                  </div>
                </div>

                <div className="min-w-0 space-y-4 lg:mt-5">
                  <VroomSchedulerPicker
                    days={availableDays}
                    selectedDate={selectedDate}
                    selectedSlotId={selectedSlotId}
                    slotsByDate={slotsByDate}
                    refreshing={refreshingSlots}
                    lastRefreshAt={lastSlotsRefreshAt}
                    onSelectDate={(date) => {
                      setSelectedDate(date)
                      setSelectedInstructorId('')
                      setSelectedSlotId('')
                    }}
                    onSelectSlot={(slot) => void quickBook(slot)}
                    onRefresh={handleRefreshSlots}
                  />
                </div>

              </section>
            )}

            {/* ── Step 2: Instructor ── */}
            {step === 'instructor' && (
              <section>
                <h2
                  className="font-bold tracking-tight"
                  style={{ fontSize: 'clamp(26px, 6vw, 32px)', lineHeight: 1.15, color: ui.text }}
                >
                  Инструкторы
                </h2>
                <p className="t-body mt-2" style={{ color: ui.textMuted }}>
                  {selectedDate
                    ? `На ${format(selectedDate, 'd MMMM', { locale: ru })} доступны:`
                    : 'Выберите инструктора'}
                </p>

                {/* Date badge */}
                {selectedDate && (
                  <div
                    className="mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
                    style={{ background: ui.accentSoft, color: ui.accent }}
                  >
                    <CalendarPlus size={13} />
                    <span className="text-[12px] font-semibold">
                      {format(selectedDate, 'd MMMM', { locale: ru })}
                    </span>
                  </div>
                )}

                <div className="mt-4 space-y-2.5">
                  {instructorsOnDate.length === 0 ? (
                    <div
                      className="rounded-2xl p-6 text-center"
                      style={{ background: ui.surface, borderRadius: '24px', boxShadow: ui.shadowCard }}
                    >
                      <p className="t-body" style={{ color: ui.textMuted }}>Нет инструкторов на этот день</p>
                      <button
                        onClick={() => setStep('date')}
                        className="btn btn-secondary btn-sm mt-3"
                      >
                        Выбрать другую дату
                      </button>
                    </div>
                  ) : (
                    instructorsOnDate.map((instructor) => {
                      const branch = branches.find((b) => b.id === instructor.branchId) ?? null
                      const slotForThisInstructor = futureSlots.find(
                        (s) =>
                          s.instructorId === instructor.id &&
                          selectedDate &&
                          isSameDay(parseISO(s.date), selectedDate),
                      )
                      return (
                        <InstructorCompactCard
                          key={instructor.id}
                          instructor={instructor}
                          branch={branch}
                          nextSlot={slotForThisInstructor ?? null}
                          selected={selectedInstructorId === instructor.id}
                          onSelect={() => {
                            setSelectedInstructorId(instructor.id)
                            setSelectedSlotId('')
                          }}
                        />
                      )
                    })
                  )}
                </div>

                <StickyActionBar>
                  <Button
                    className="w-full"
                    disabled={!selectedInstructorId}
                    onClick={() => setStep('time')}
                  >
                    Продолжить
                  </Button>
                </StickyActionBar>
              </section>
            )}

            {/* ── Step 3: Time ── */}
            {step === 'time' && (
              <section>
                <h2
                  className="font-bold tracking-tight"
                  style={{ fontSize: 'clamp(26px, 6vw, 32px)', lineHeight: 1.15, color: ui.text }}
                >
                  Время занятия
                </h2>

                {selectedInstructor && (
                  <div className="mt-4 flex items-center gap-3.5">
                    <Avatar
                      initials={selectedInstructor.avatarInitials || formatInstructorName(selectedInstructor.name)[0]}
                      color={selectedInstructor.avatarColor || '#EEF3F5'}
                      src={getInstructorPhoto(selectedInstructor)}
                      alt={selectedInstructor.name}
                      size="md"
                      className="rounded-full text-[var(--accent)]"
                    />
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold tracking-tight" style={{ color: ui.text }}>
                        {formatInstructorName(selectedInstructor.name)}
                      </p>
                      <p className="t-small mt-0.5">
                        {selectedInstructor.car ?? 'Учебный автомобиль'}
                      </p>
                    </div>
                  </div>
                )}

                {selectedDate && (
                  <p className="t-micro mt-3" style={{ color: ui.textMuted }}>
                    {format(selectedDate, 'EEEE, d MMMM', { locale: ru })}
                  </p>
                )}

                <div className="mt-4">
                  {slotsForSelection.length === 0 ? (
                    <div
                      className="rounded-2xl p-6 text-center"
                      style={{ background: ui.surface, borderRadius: '24px', boxShadow: ui.shadowCard }}
                    >
                      <p className="t-body" style={{ color: ui.textMuted }}>Нет свободных окон</p>
                      <button onClick={() => setStep('instructor')} className="btn btn-secondary btn-sm mt-3">
                        Выбрать другого инструктора
                      </button>
                    </div>
                  ) : (
                    <TimeSlotGrid
                      slots={slotsForSelection}
                      selectedSlotId={selectedSlotId}
                      onSelect={selectSlot}
                    />
                  )}
                </div>

                <StickyActionBar>
                  <Button
                    className="w-full"
                    disabled={!selectedSlotId}
                    onClick={() => setStep('contacts')}
                  >
                    Продолжить
                  </Button>
                </StickyActionBar>
              </section>
            )}

            {/* ── Step 4: Contacts ── */}
            {step === 'contacts' && (
              <section>
                <h2
                  className="font-bold tracking-tight"
                  style={{ fontSize: 'clamp(26px, 6vw, 32px)', lineHeight: 1.15, color: ui.text }}
                >
                  Ваши контакты
                </h2>
                <p className="t-body mt-2" style={{ color: ui.textMuted }}>
                  Имя и телефон нужны для записи.
                </p>

                <div className="mt-5 space-y-4">
                  <BookingMiniSummary
                    slot={selectedSlot}
                    instructor={selectedInstructor}
                    branch={selectedBranch}
                  />

                  <Input
                    label="Имя"
                    value={form.name}
                    error={errors.name}
                    placeholder="Анна Иванова"
                    onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                    onBlur={() => setForm((c) => ({ ...c, name: normalizePersonName(c.name) }))}
                  />

                  <PhoneInput
                    label="Телефон"
                    value={form.phone}
                    error={errors.phone}
                    placeholder="+7"
                    onChange={(val) => setForm((c) => ({ ...c, phone: val }))}
                  />

                  <Input
                    label="Email, если понадобится"
                    type="email"
                    value={form.email}
                    error={errors.email}
                    placeholder="Необязательно"
                    onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                  />

                  <div className="rounded-2xl p-4" style={{ background: ui.blueSoft }}>
                    <p className="text-[13px] font-semibold leading-5" style={{ color: ui.accent }}>
                      На следующем шаге покажем итог записи. После подтверждения ещё раз проверим, что время свободно.
                    </p>
                  </div>
                </div>

                <StickyActionBar>
                  <Button
                    className="w-full"
                    disabled={!form.name.trim() || !form.phone.trim()}
                    onClick={() => {
                      if (!validateContacts()) return
                      setStep('confirm')
                    }}
                  >
                    Продолжить
                  </Button>
                </StickyActionBar>
              </section>
            )}

            {/* ── Step 5: Confirm ── */}
            {step === 'confirm' && (
              <section>
                <h2
                  className="font-bold tracking-tight"
                  style={{ fontSize: 'clamp(26px, 6vw, 32px)', lineHeight: 1.15, color: ui.text }}
                >
                  Проверьте запись
                </h2>
                <p className="t-body mt-2" style={{ color: ui.textMuted }}>
                  Если всё верно — подтвердите.
                </p>

                <div className="mt-5">
                  <SummaryCard
                    slot={selectedSlot}
                    instructor={selectedInstructor}
                    branch={selectedBranch}
                    student={{
                      name: form.name,
                      phone: normalizePhone(form.phone),
                      email: form.email,
                    }}
                  />
                </div>

                <StickyActionBar>
                  <Button
                    className="w-full"
                    disabled={submitting}
                    onClick={() => void submitBooking()}
                  >
                    {submitting ? 'Записываем...' : 'Подтвердить запись'}
                  </Button>
                </StickyActionBar>
              </section>
            )}

            {/* ── Step 6: Success ── */}
            {step === 'success' && (
              <section className="space-y-3">
                <SuccessHeader subtitle="Вы записаны. Занятие уже сохранено в расписании автошколы." />
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                >
                  <BookingDetailsCard
                    slot={selectedSlot}
                    instructor={selectedInstructor}
                    branch={selectedBranch}
                    student={{ name: form.name, phone: normalizePhone(form.phone), email: form.email }}
                  />
                </motion.div>
                <motion.div
                  className="grid gap-2"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.08 }}
                >
                  <Button onClick={() => setStep('account')}>
                    Создать кабинет и видеть свои записи
                  </Button>
                  <Button variant="secondary" onClick={downloadCalendar}>
                    <CalendarPlus size={16} />
                    Добавить в календарь
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/student')}>
                    Вернуться в кабинет
                  </Button>
                </motion.div>
              </section>
            )}

            {/* ── Step 7: Account ── */}
            {step === 'account' && (
              <section>
                <h2
                  className="font-bold tracking-tight"
                  style={{ fontSize: 'clamp(26px, 6vw, 32px)', lineHeight: 1.15, color: ui.text }}
                >
                  Создать кабинет
                </h2>
                <p className="t-body mt-2" style={{ color: ui.textMuted }}>
                  Проверьте данные и задайте пароль.
                </p>

                <div className="mt-5 space-y-3">
                  <div
                    className="flex items-center gap-3 rounded-2xl p-3.5"
                    style={{
                      background: ui.greenSoft,
                      border: '1px solid rgba(21,128,61,0.15)',
                      borderRadius: '18px',
                    }}
                  >
                    <CheckCircle2 size={18} style={{ color: ui.green, flexShrink: 0 }} />
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: ui.text }}>
                        Запись уже сохранена
                      </p>
                      <p className="t-micro mt-0.5" style={{ color: ui.textMuted }}>
                        {selectedSlot
                          ? `${formatHumanDate(selectedSlot.date, false)}, ${formatTimeRange(selectedSlot)}`
                          : 'Выбранное занятие'}
                      </p>
                    </div>
                  </div>
                  <Input
                    label="Имя"
                    value={form.name}
                    error={errors.name}
                    onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                    onBlur={() => setForm((c) => ({ ...c, name: normalizePersonName(c.name) }))}
                  />
                  <PhoneInput
                    label="Телефон"
                    value={form.phone}
                    error={errors.phone}
                    onChange={(val) => setForm((c) => ({ ...c, phone: val }))}
                  />
                  <Input
                    label="E-mail"
                    value={form.email}
                    error={errors.email}
                    onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                  />
                  <Input
                    label="Пароль"
                    type="password"
                    value={form.password}
                    error={errors.password}
                    placeholder="Минимум 6 символов"
                    onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                  />
                </div>

                <StickyActionBar>
                  <div className="grid gap-2">
                    <Button
                      disabled={
                        submitting || !form.name.trim() || !form.phone.trim() || !form.password.trim()
                      }
                      onClick={() => void createAccount()}
                    >
                      {submitting ? 'Создаём...' : 'Создать кабинет'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        createdBookingId
                          ? navigate(`/booking/${createdBookingId}`)
                          : navigate('/student')
                      }
                    >
                      Позже
                    </Button>
                  </div>
                </StickyActionBar>
              </section>
            )}

          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
