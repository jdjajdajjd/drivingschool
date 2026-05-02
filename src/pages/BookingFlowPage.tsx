import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CalendarPlus, Car, CheckCircle2, Clock3, MapPin, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { StateView } from '../components/ui/StateView'
import { useToast } from '../components/ui/Toast'
import { StickyActionBar } from '../components/ui/StickyActionBar'
import { Avatar } from '../components/ui/Avatar'
import {
  BookingDetailsCard,
  DayChipsScroller,
  InstructorCompactCard,
  SuccessHeader,
  SummaryCard,
  TimeSlotGrid,
} from '../components/product/CompactCards'
import { getInstructorPhoto } from '../services/instructorPhotos'
import { getFutureAvailableSlots, loadPublicSchoolData, refreshPublicSlots } from '../services/publicSchoolData'
import { db } from '../services/storage'
import { createSupabaseBooking, updateStudentProfileInSupabase } from '../services/supabasePublicService'
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
import { findAnyStudentProfile, saveStudentProfile } from '../services/studentProfile'
import type { Booking, Branch, Instructor, School, Slot } from '../types'
import { formatHumanDate, formatTimeRange, isoDate } from '../utils/date'
import { formatInstructorName, generateId } from '../lib/utils'
import { format, isSameDay, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

void React

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
        background: 'white',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '18px',
        boxShadow: '0 12px 28px rgba(15,20,25,0.08)',
      }}
    >
      <div className="flex items-center justify-between">
        <p className="t-micro">
          {step === 'success' || step === 'account' ? 'Готово' : `Шаг ${current} из 5`}
        </p>
        <p className="t-micro" style={{ color: '#9EA3A8' }}>{pct}%</p>
      </div>
      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full" style={{ background: '#F4F5F6' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: '#2436D9' }}
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
        background: 'white',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '18px',
        boxShadow: '0 12px 28px rgba(15,20,25,0.08)',
      }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: 'rgba(36,54,217,0.10)', color: '#2436D9' }}
      >
        <Car size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="truncate font-semibold leading-5"
          style={{ fontSize: '14px', color: '#111418' }}
        >
          {slot ? `${formatHumanDate(slot.date, false)}, ${formatTimeRange(slot)}` : 'Время не выбрано'}
        </p>
        <p className="mt-0.5 truncate text-[12px] font-medium leading-5" style={{ color: '#6F747A' }}>
          {instructor ? formatInstructorName(instructor.name) : 'Инструктор'} · {branch?.name ?? 'Филиал'}
        </p>
      </div>
    </div>
  )
}

function SlotStatusBadge({ mine, busy }: { mine: boolean; busy: boolean }) {
  const baseStyle = { borderRadius: 999, padding: '4px 10px', fontSize: 11, lineHeight: '14px', fontWeight: 900 } as const
  if (mine) return <span style={{ ...baseStyle, background: '#EFF2FF', color: '#2436D9' }}>Вы записаны</span>
  if (busy) return <span style={{ ...baseStyle, background: '#F1F2F5', color: '#8B929C' }}>Занято</span>
  return <span style={{ ...baseStyle, background: '#EAF8F0', color: '#14995B' }}>Свободно</span>
}

function slotInitials(name?: string): string {
  return (name ?? 'Инструктор').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'И'
}

function FastSlotCard({
  item,
  selected,
  submitting,
  onSelect,
}: {
  item: SlotCardItem
  selected: boolean
  submitting: boolean
  onSelect: (slot: Slot) => void
}) {
  const busy = item.slot.status !== 'available' && !item.mine
  const disabled = busy || submitting

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(item.slot)}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className="w-full overflow-hidden rounded-[24px] bg-white p-4 text-left shadow-[0_14px_38px_rgba(18,24,38,0.08)] transition disabled:opacity-70"
      style={{
        width: '100%',
        maxWidth: '100%',
        minHeight: 144,
        boxSizing: 'border-box',
        padding: 16,
        borderRadius: 24,
        background: 'white',
        border: `2px solid ${selected || item.mine ? '#2436D9' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#101216' }}>{formatTimeRange(item.slot)}</p>
          <p style={{ margin: 0, marginTop: 4, fontSize: 12, lineHeight: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#8B929C' }}>{item.slot.duration} минут</p>
        </div>
        <SlotStatusBadge mine={item.mine} busy={busy} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <div className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#EFF2FF] text-[12px] font-black text-[#2436D9]" style={{ width: 36, height: 36 }}>
          {item.instructor ? <img src={getInstructorPhoto(item.instructor)} alt={item.instructor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : slotInitials()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="truncate" style={{ margin: 0, fontSize: 14, lineHeight: '18px', fontWeight: 900, color: '#101216' }}>{item.instructor ? formatInstructorName(item.instructor.name) : 'Инструктор'}</p>
          <p className="truncate" style={{ margin: 0, marginTop: 2, fontSize: 12, lineHeight: '16px', fontWeight: 700, color: '#727985' }}>{item.instructor?.car ?? 'Учебный автомобиль'}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, lineHeight: '16px', fontWeight: 700, color: '#8B929C' }}>
        <MapPin size={14} className="shrink-0 text-[#2436D9]" />
        <span className="truncate">{item.branch?.name ?? 'Филиал'}</span>
      </div>
      {!busy ? (
        <div className="grid place-items-center rounded-[15px] bg-[#2436D9] text-white" style={{ marginTop: 12, minHeight: 44, fontSize: 13, lineHeight: '16px', fontWeight: 900 }}>
          {submitting && selected ? 'Записываем...' : selected ? 'Подтвердить запись' : 'Записаться'}
        </div>
      ) : null}
    </motion.button>
  )
}

export function BookingFlowPage() {
  const { slug = 'virazh' } = useParams<{ slug: string }>()
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
    setLoading(true)
    void loadPublicSchoolData(slug)
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
            setStep('time')
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
      await refreshPublicSlots(school.id)
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

  const selectedDateKey = selectedDate ? isoDate(selectedDate) : ''
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
  }, [selectedDate, selectedInstructorId])

  const slotsForSelectedDate = useMemo<SlotCardItem[]>(() => {
    if (!school || !selectedDateKey) return []
    const allBookings = db.bookings.bySchool(school.id)
    return db.slots.bySchool(school.id)
      .filter((slot) => slot.date === selectedDateKey)
      .filter((slot) => new Date(`${slot.date}T${slot.time}:00`).getTime() > Date.now())
      .map((slot) => {
        const booking = slot.bookingId ? allBookings.find((item) => item.id === slot.bookingId) ?? null : null
        return {
          slot,
          instructor: db.instructors.byId(slot.instructorId),
          branch: db.branches.byId(slot.branchId),
          mine: Boolean(booking && normalizedStudentPhone && booking.studentPhone === normalizedStudentPhone),
        }
      })
      .sort((left, right) => left.slot.time.localeCompare(right.slot.time))
  }, [school, selectedDateKey, normalizedStudentPhone, slotsVersion])

  function goBack() {
    if (step === 'date') navigate('/student')
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

    await submitBooking(slot)
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
      await refreshPublicSlots(school.id)
      const freshSlot = db.slots.byId(bookingSlot.id)
      if (!freshSlot || freshSlot.status !== 'available') {
        setSlotsVersion((current) => current + 1)
        throw new Error('Этот слот только что заняли. Выберите другое время.')
      }

      let bookingId = ''
      let bookingGroupId = ''

      try {
        const result = await createSupabaseBooking({
          schoolId: school.id,
          studentName: form.name,
          studentPhone: form.phone,
          slotIds: [bookingSlot.id],
        })
        bookingId = result.bookingIds[0] ?? ''
        bookingGroupId = result.bookingGroupId
      } catch {
        const local = createBooking({
          schoolId: school.id,
          branchId: bookingSlot.branchId,
          instructorId: bookingSlot.instructorId,
          slotId: bookingSlot.id,
          studentName: form.name,
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
        studentName: form.name.trim(),
        studentPhone: normalizedPhone,
        studentEmail: form.email.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      db.students.upsert({ ...student, name: form.name.trim(), phone: normalizedPhone, normalizedPhone, email: form.email.trim() })
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
      saveStudentProfile(school.id, form, { passwordSet: true, assignedBranchId: selectedBranch?.id })
      void updateStudentProfileInSupabase({
        schoolId: school.id,
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password,
        avatarUrl: '',
      }).catch(() => undefined)
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

  if (loading) return <div className="shell" />
  if (!school) {
    return (
      <div className="shell flex items-center justify-center px-4">
        <StateView
          kind="error"
          title="Автошкола не найдена"
          action={
            <Button onClick={() => navigate('/student/register')}>Вернуться в кабинет</Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="shell">
      <main className="mx-auto w-full max-w-2xl overflow-x-hidden px-5 pb-4 pt-4">
        <header className="mb-4">
          <button
            onClick={goBack}
            className="mb-3 flex min-h-10 items-center gap-2 rounded-md px-1 text-[13px] font-semibold transition active:scale-[0.97]"
            style={{ color: '#6F747A', minHeight: 40 }}
          >
            <ArrowLeft size={16} />
            Назад
          </button>
          <Progress step={step} />
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={step} {...stepMotion}>

            {/* ── Step 1: Date ── */}
            {step === 'date' && (
              <section>
                <h2
                  className="font-extrabold tracking-tight"
                  style={{ fontSize: 'clamp(28px, 6vw, 40px)', lineHeight: 1.1, color: '#111418' }}
                >
                  Ближайшие окна
                </h2>
                <p className="t-body mt-2" style={{ color: '#6F747A' }}>
                  Выберите день и нажмите свободный слот. Если профиль уже заполнен, запись займёт один тап.
                </p>

                <div className="mt-5 space-y-4">
                  <DayChipsScroller
                    days={availableDays}
                    selectedDate={selectedDateKey}
                    getCount={(date) => futureSlots.filter((slot) => slot.date === date).length}
                    onSelect={(date) => {
                      setSelectedDate(parseISO(date))
                      setSelectedInstructorId('')
                      setSelectedSlotId('')
                    }}
                  />

                  <div className="rounded-[24px] bg-white p-4 shadow-[0_18px_45px_rgba(15,20,25,0.08)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-extrabold tracking-tight text-[#111418]">
                          {selectedDate ? format(selectedDate, 'd MMMM', { locale: ru }) : 'Выберите день'}
                        </p>
                        <p className="mt-1 text-[13px] font-medium text-[#6F747A]">
                          {selectedDateKey
                            ? `${slotsForSelectedDate.filter((item) => item.slot.status === 'available').length} свободных из ${slotsForSelectedDate.length}`
                            : 'Покажем только актуальные окна'}
                        </p>
                      </div>
                      <button
                        className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#EFF2FF] px-3 text-[12px] font-black text-[#2436D9] active:scale-[0.97]"
                        style={{ minHeight: 40 }}
                        onClick={() => {
                          if (!school) return
                          setRefreshingSlots(true)
                          void refreshPublicSlots(school.id).then(() => {
                            setSlotsVersion((current) => current + 1)
                            setLastSlotsRefreshAt(new Date())
                            setRefreshingSlots(false)
                          })
                        }}
                      >
                        <RefreshCw size={13} className={refreshingSlots ? 'animate-spin' : ''} />
                        Обновить
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-[16px] bg-[#F7F8FA] px-3 py-2 text-[12px] font-bold text-[#727985]">
                      <ShieldCheck size={14} className="text-[#2436D9]" />
                      Перед записью ещё раз проверяем, что слот не заняли.
                    </div>
                    <div className="mt-4 space-y-3">
                      {slotsForSelectedDate.length === 0 ? (
                        <div className="rounded-[20px] bg-[#F7F8FA] p-5 text-center">
                          <p className="text-[15px] font-black text-[#101216]">На этот день окон нет</p>
                          <p className="mt-1 text-[13px] font-semibold text-[#727985]">Выберите другой день выше.</p>
                        </div>
                      ) : slotsForSelectedDate.map((item) => (
                        <FastSlotCard
                          key={item.slot.id}
                          item={item}
                          selected={selectedSlotId === item.slot.id}
                          submitting={submitting}
                          onSelect={(slot) => void quickBook(slot)}
                        />
                      ))}
                    </div>
                    {lastSlotsRefreshAt ? (
                      <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-[#9EA3A8]">
                        <Clock3 size={12} /> Обновлено {format(lastSlotsRefreshAt, 'HH:mm:ss')}
                      </p>
                    ) : null}
                  </div>
                </div>

                <StickyActionBar>
                  <Button
                    className="w-full"
                    disabled={!selectedDate}
                    onClick={() => setStep('instructor')}
                  >
                    Выбрать по инструктору
                    <ArrowLeft size={16} className="rotate-180" />
                  </Button>
                </StickyActionBar>
              </section>
            )}

            {/* ── Step 2: Instructor ── */}
            {step === 'instructor' && (
              <section>
                <h2
                  className="font-extrabold tracking-tight"
                  style={{ fontSize: 'clamp(28px, 6vw, 40px)', lineHeight: 1.1, color: '#111418' }}
                >
                  Инструкторы
                </h2>
                <p className="t-body mt-2" style={{ color: '#6F747A' }}>
                  {selectedDate
                    ? `На ${format(selectedDate, 'd MMMM', { locale: ru })} доступны:`
                    : 'Выберите инструктора'}
                </p>

                {/* Date badge */}
                {selectedDate && (
                  <div
                    className="mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
                    style={{ background: 'rgba(36,54,217,0.10)', color: '#2436D9' }}
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
                      style={{ background: 'white', borderRadius: '24px', boxShadow: '0 18px 45px rgba(15,20,25,0.10)' }}
                    >
                      <p className="t-body" style={{ color: '#6F747A' }}>Нет инструкторов на этот день</p>
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
                  className="font-extrabold tracking-tight"
                  style={{ fontSize: 'clamp(28px, 6vw, 40px)', lineHeight: 1.1, color: '#111418' }}
                >
                  Время занятия
                </h2>

                {selectedInstructor && (
                  <div className="mt-4 flex items-center gap-3.5">
                    <Avatar
                      initials={selectedInstructor.avatarInitials || formatInstructorName(selectedInstructor.name)[0]}
                      color={selectedInstructor.avatarColor || '#EFF2FF'}
                      src={getInstructorPhoto(selectedInstructor)}
                      alt={selectedInstructor.name}
                      size="md"
                      className="rounded-full text-[#2436D9]"
                    />
                    <div className="min-w-0">
                      <p className="text-[15px] font-extrabold tracking-tight" style={{ color: '#111418' }}>
                        {formatInstructorName(selectedInstructor.name)}
                      </p>
                      <p className="t-small mt-0.5">
                        {selectedInstructor.car ?? 'Учебный автомобиль'}
                      </p>
                    </div>
                  </div>
                )}

                {selectedDate && (
                  <p className="t-micro mt-3" style={{ color: '#6F747A' }}>
                    {format(selectedDate, 'EEEE, d MMMM', { locale: ru })}
                  </p>
                )}

                <div className="mt-4">
                  {slotsForSelection.length === 0 ? (
                    <div
                      className="rounded-2xl p-6 text-center"
                      style={{ background: 'white', borderRadius: '24px', boxShadow: '0 18px 45px rgba(15,20,25,0.10)' }}
                    >
                      <p className="t-body" style={{ color: '#6F747A' }}>Нет свободных окон</p>
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
                  className="font-extrabold tracking-tight"
                  style={{ fontSize: 'clamp(28px, 6vw, 40px)', lineHeight: 1.1, color: '#111418' }}
                >
                  Ваши контакты
                </h2>
                <p className="t-body mt-2" style={{ color: '#6F747A' }}>
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
                  />

                  <PhoneInput
                    label="Телефон"
                    value={form.phone}
                    error={errors.phone}
                    placeholder="+7"
                    onChange={(val) => setForm((c) => ({ ...c, phone: val }))}
                  />

                  <div className="rounded-2xl bg-[#EFF2FF] p-4">
                    <p className="text-[13px] font-semibold leading-5 text-[#2436D9]">
                      После нажатия сразу проверим доступность слота и запишем вас без лишнего экрана подтверждения.
                    </p>
                  </div>
                </div>

                <StickyActionBar>
                  <Button
                    className="w-full"
                    disabled={!form.name.trim() || !form.phone.trim()}
                    onClick={() => void submitBooking()}
                  >
                    {submitting ? 'Записываем...' : 'Записаться'}
                  </Button>
                </StickyActionBar>
              </section>
            )}

            {/* ── Step 5: Confirm ── */}
            {step === 'confirm' && (
              <section>
                <h2
                  className="font-extrabold tracking-tight"
                  style={{ fontSize: 'clamp(28px, 6vw, 40px)', lineHeight: 1.1, color: '#111418' }}
                >
                  Проверьте запись
                </h2>
                <p className="t-body mt-2" style={{ color: '#6F747A' }}>
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
                <SuccessHeader subtitle="Мы сохранили запись. Если нужно, автошкола свяжется с вами." />
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
                  <Button onClick={() => navigate('/student')}>
                    В кабинет
                  </Button>
                  <Button variant="secondary" onClick={downloadCalendar}>
                    <CalendarPlus size={16} />
                    Добавить в календарь
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/student/book')}>
                    Записаться ещё
                  </Button>
                </motion.div>
              </section>
            )}

            {/* ── Step 7: Account ── */}
            {step === 'account' && (
              <section>
                <h2
                  className="font-extrabold tracking-tight"
                  style={{ fontSize: 'clamp(28px, 6vw, 40px)', lineHeight: 1.1, color: '#111418' }}
                >
                  Создать кабинет
                </h2>
                <p className="t-body mt-2" style={{ color: '#6F747A' }}>
                  Проверьте данные и задайте пароль.
                </p>

                <div className="mt-5 space-y-3">
                  <div
                    className="flex items-center gap-3 rounded-2xl p-3.5"
                    style={{
                      background: 'rgba(21,128,61,0.07)',
                      border: '1px solid rgba(21,128,61,0.15)',
                      borderRadius: '18px',
                    }}
                  >
                    <CheckCircle2 size={18} style={{ color: '#15803D', flexShrink: 0 }} />
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: '#111418' }}>
                        Запись уже сохранена
                      </p>
                      <p className="t-micro mt-0.5" style={{ color: '#6F747A' }}>
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
