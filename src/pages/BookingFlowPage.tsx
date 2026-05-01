import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CalendarPlus, Car, CheckCircle2, UserRound } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { StateView } from '../components/ui/StateView'
import { useToast } from '../components/ui/Toast'
import { StickyActionBar } from '../components/ui/StickyActionBar'
import { CalendarPicker } from '../components/ui/CalendarPicker'
import { Avatar } from '../components/ui/Avatar'
import {
  BookingDetailsCard,
  InstructorCompactCard,
  SuccessHeader,
  SummaryCard,
  TimeSlotGrid,
} from '../components/product/CompactCards'
import { getInstructorPhoto } from '../services/instructorPhotos'
import { getFutureAvailableSlots, loadPublicSchoolData } from '../services/publicSchoolData'
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
import { saveStudentProfile } from '../services/studentProfile'
import type { Booking, Branch, Instructor, School, Slot } from '../types'
import { formatHumanDate, formatTimeRange, isoDate } from '../utils/date'
import { formatInstructorName, generateId } from '../lib/utils'
import { format, isSameDay, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

type Step = 'date' | 'instructor' | 'time' | 'contacts' | 'confirm' | 'success' | 'account'

interface ContactForm {
  name: string
  phone: string
  email: string
  password: string
}

const emptyContact: ContactForm = { name: '', phone: '', email: '', password: '' }

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
          style={{ width: `${pct}%`, background: '#F6B84D' }}
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
        style={{ background: 'rgba(246,184,77,0.12)', color: '#C97F10' }}
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

function AccountOfferCard({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      className="rounded-2xl p-4"
      style={{
        border: '1px solid rgba(246,184,77,0.20)',
        background: 'rgba(246,184,77,0.04)',
      }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(246,184,77,0.12)', color: '#C97F10' }}
        >
          <UserRound size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-[22px]" style={{ color: '#111418' }}>
            Хотите видеть все записи в одном месте?
          </p>
          <p className="mt-1 text-[13px] font-medium leading-5" style={{ color: '#6F747A' }}>
            Создайте кабинет — следующая запись будет быстрее.
          </p>
        </div>
      </div>
      <Button className="mt-4 w-full" variant="secondary" onClick={onCreate}>
        Создать кабинет
      </Button>
    </motion.div>
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

  useEffect(() => {
    setLoading(true)
    void loadPublicSchoolData(slug)
      .then((data) => {
        if (!data) return
        setSchool(data.school)
        setBranches(data.branches)
        setInstructors(data.instructors)

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

  // Build calendar days from slots
  const calendarDays = useMemo(() => {
    return futureSlots.map((slot) => ({
      date: parseISO(slot.date),
      slotCount: 1,
      isBooked: slot.status === 'booked',
    }))
  }, [futureSlots])

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

  function goBack() {
    if (step === 'date') navigate(`/school/${school?.slug ?? slug}`)
    else if (step === 'instructor') setStep('date')
    else if (step === 'time') setStep('instructor')
    else if (step === 'contacts') setStep('time')
    else if (step === 'confirm') setStep('contacts')
    else if (step === 'account') setStep('success')
    else navigate(`/school/${school?.slug ?? slug}`)
  }

  function selectSlot(slot: Slot) {
    if (selectedSlotId && selectedSlotId !== slot.id) {
      releaseSlotLock(selectedSlotId, sessionId.current)
    }
    const result = acquireSlotLock(slot.id, sessionId.current)
    if (!result.ok) {
      showToast(result.error ?? 'Это время уже недоступно.', 'error')
      return
    }
    setSelectedSlotId(slot.id)
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

  async function submitBooking() {
    if (!school || !selectedSlot || !selectedInstructor || !validateContacts()) return
    setSubmitting(true)
    try {
      let bookingId = ''
      let bookingGroupId = ''

      try {
        const result = await createSupabaseBooking({
          schoolId: school.id,
          studentName: form.name,
          studentPhone: form.phone,
          slotIds: [selectedSlot.id],
        })
        bookingId = result.bookingIds[0] ?? ''
        bookingGroupId = result.bookingGroupId
      } catch {
        const local = createBooking({
          schoolId: school.id,
          branchId: selectedSlot.branchId,
          instructorId: selectedSlot.instructorId,
          slotId: selectedSlot.id,
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
        slotId: selectedSlot.id,
        branchId: selectedSlot.branchId,
        instructorId: selectedSlot.instructorId,
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
      db.slots.upsert({ ...selectedSlot, status: 'booked', bookingId: booking.id })
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
            <Button onClick={() => navigate('/school/virazh')}>Открыть Вираж</Button>
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
            style={{ color: '#6F747A' }}
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
                  Выберите дату
                </h2>
                <p className="t-body mt-2" style={{ color: '#6F747A' }}>
                  Покажем доступных инструкторов и время.
                </p>

                <div className="mt-5">
                  <CalendarPicker
                    days={calendarDays}
                    selectedDate={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date)
                      setSelectedInstructorId('')
                      setSelectedSlotId('')
                    }}
                  />
                </div>

                <StickyActionBar>
                  <Button
                    className="w-full"
                    disabled={!selectedDate}
                    onClick={() => setStep('instructor')}
                  >
                    Продолжить
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
                    style={{ background: 'rgba(246,184,77,0.10)', color: '#C97F10' }}
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
                      color={selectedInstructor.avatarColor || '#FFF7ED'}
                      src={getInstructorPhoto(selectedInstructor)}
                      alt={selectedInstructor.name}
                      size="md"
                      className="rounded-full text-[#C97F10]"
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

                  <Input
                    label="E-mail (опционально)"
                    value={form.email}
                    error={errors.email}
                    placeholder="name@email.ru"
                    onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                  />
                </div>

                <StickyActionBar>
                  <Button
                    className="w-full"
                    disabled={!form.name.trim() || !form.phone.trim()}
                    onClick={() => {
                      if (validateContacts()) setStep('confirm')
                    }}
                  >
                    Проверить запись
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
                  <Button onClick={downloadCalendar}>
                    <CalendarPlus size={16} />
                    Добавить в календарь
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(`/school/${school.slug}/book`)}>
                    Записаться ещё
                  </Button>
                  <Button variant="ghost" onClick={() => navigate(`/school/${school.slug}`)}>
                    На страницу школы
                  </Button>
                </motion.div>
                <AccountOfferCard onCreate={() => setStep('account')} />
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
                          : navigate(`/school/${school.slug}`)
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
