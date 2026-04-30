import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CalendarPlus, Car, CheckCircle2, SlidersHorizontal, UserRound } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { StateView } from '../components/ui/StateView'
import { useToast } from '../components/ui/Toast'
import { FilterChipsBar } from '../components/ui/FilterChipsBar'
import { StickyActionBar } from '../components/ui/StickyActionBar'
import { BookingDetailsCard, DayChipsScroller, InstructorCompactCard, SuccessHeader, SummaryCard, TimeSlotGrid } from '../components/product/CompactCards'
import { DRIVING_CATEGORIES } from '../services/drivingCategories'
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
import { formatHumanDate, formatTimeRange, getNext7Days } from '../utils/date'
import { formatInstructorName, generateId } from '../lib/utils'

type Step = 'instructor' | 'time' | 'contacts' | 'confirm' | 'success' | 'account'

interface ContactForm {
  name: string
  phone: string
  email: string
  password: string
}

const emptyContact: ContactForm = { name: '', phone: '', email: '', password: '' }

const stepMotion = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
} as const

function Progress({ step }: { step: Step }) {
  const order: Step[] = ['instructor', 'time', 'contacts', 'confirm']
  const current = Math.max(1, order.indexOf(step) + 1)
  const pct = step === 'success' || step === 'account' ? 100 : Math.min(100, Math.round((current / 4) * 100))

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
        <p className="caption">{step === 'success' || step === 'account' ? 'Готово' : `Шаг ${current} из 4`}</p>
        <p className="caption" style={{ color: '#9EA3A8' }}>{pct}%</p>
      </div>
      <div className="mt-2.5 progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
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
      className="rounded-2xl border rgba(0,0,0,0.06) rgba(246,184,77,0.12) p-4 "
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl white #C97F10 ">
          <UserRound size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-[22px] #111418">Хотите видеть все записи в одном месте?</p>
          <p className="mt-1 text-[13px] font-medium leading-5 #6F747A">Создайте кабинет — следующая запись будет быстрее.</p>
        </div>
      </div>
      <Button className="mt-4 w-full" variant="secondary" onClick={onCreate}>Создать кабинет</Button>
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
  const [step, setStep] = useState<Step>('instructor')
  const [category, setCategory] = useState(params.get('category') ?? '')
  const [branchId, setBranchId] = useState(params.get('branch') ?? '')
  const [transmission, setTransmission] = useState('')
  const [autoPick, setAutoPick] = useState(false)
  const [selectedInstructorId, setSelectedInstructorId] = useState(params.get('instructor') ?? '')
  const [selectedDate, setSelectedDate] = useState('')
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
        const querySlot = params.get('slot')
        if (querySlot) {
          const slot = db.slots.byId(querySlot)
          if (slot) {
            setSelectedSlotId(slot.id)
            setSelectedInstructorId(slot.instructorId)
            setBranchId(slot.branchId)
            setSelectedDate(slot.date)
            setStep('time')
          }
        }
      })
      .finally(() => setLoading(false))

    return () => releaseSessionLocks(sessionId.current)
  }, [slug, params])

  const days = useMemo(() => getNext7Days(), [])
  const futureSlots = useMemo(() => school ? getFutureAvailableSlots(school.id) : [], [school, slotsVersion])
  const categoryOptions = useMemo(() => {
    const supported = new Set(instructors.flatMap((instructor) => instructor.categories ?? []))
    return DRIVING_CATEGORIES.filter((item) => supported.has(item.code)).map((item) => ({ value: item.code, label: item.code }))
  }, [instructors])

  const filteredInstructors = useMemo(() => {
    return instructors
      .filter((instructor) => branchId ? instructor.branchId === branchId : true)
      .filter((instructor) => category ? instructor.categories?.includes(category) : true)
      .filter((instructor) => transmission ? instructor.transmission === transmission : true)
  }, [branchId, category, instructors, transmission])

  const selectedInstructor = instructors.find((item) => item.id === selectedInstructorId) ?? null
  const selectedSlot = selectedSlotId ? db.slots.byId(selectedSlotId) : null
  const selectedBranch = selectedSlot ? db.branches.byId(selectedSlot.branchId) : selectedInstructor ? db.branches.byId(selectedInstructor.branchId) : null

  useEffect(() => {
    if (!selectedDate) setSelectedDate(days[0] ?? '')
  }, [days, selectedDate])

  function goBack() {
    if (step === 'instructor') navigate(`/school/${school?.slug ?? slug}`)
    else if (step === 'time') setStep('instructor')
    else if (step === 'contacts') setStep('time')
    else if (step === 'confirm') setStep('contacts')
    else if (step === 'account') setStep('success')
    else navigate(`/school/${school?.slug ?? slug}`)
  }

  function nextSlotFor(instructor: Instructor): Slot | null {
    return futureSlots.find((slot) => slot.instructorId === instructor.id) ?? null
  }

  function slotsForDate(date: string): Slot[] {
    if (!selectedInstructor) return []
    return getInstructorSlots(selectedInstructor.id, date, sessionId.current)
  }

  function countForDate(date: string): number {
    if (!selectedInstructor) return 0
    return getInstructorSlots(selectedInstructor.id, date, sessionId.current).length
  }

  function continueFromInstructor() {
    let nextInstructorId = selectedInstructorId
    if (autoPick && !selectedInstructor) {
      const candidate = filteredInstructors.find((instructor) => nextSlotFor(instructor))
      if (candidate) {
        const slot = nextSlotFor(candidate)
        nextInstructorId = candidate.id
        setSelectedInstructorId(candidate.id)
        if (slot) {
          setSelectedDate(slot.date)
          setSelectedSlotId(slot.id)
        }
      }
    }
    if (!nextInstructorId) {
      showToast('Выберите инструктора или включите автоподбор.', 'error')
      return
    }
    setStep('time')
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
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Введите корректный e-mail.'
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
        const result = await createSupabaseBooking({ schoolId: school.id, studentName: form.name, studentPhone: form.phone, slotIds: [selectedSlot.id] })
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
      void updateStudentProfileInSupabase({ schoolId: school.id, name: form.name, phone: form.phone, email: form.email, password: form.password, avatarUrl: '' }).catch(() => undefined)
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
        <StateView kind="error" title="Автошкола не найдена" action={<Button onClick={() => navigate('/school/virazh')}>Открыть Вираж</Button>} />
      </div>
    )
  }

  const canContinueInstructor = autoPick || Boolean(selectedInstructorId)
  const canContinueTime = Boolean(selectedSlotId)

  return (
    <div className="shell">
      <main className="mx-auto w-full max-w-2xl overflow-x-hidden px-4 pb-4 pt-4">
        <header className="mb-3">
          <button onClick={goBack} className="mb-3 flex min-h-10 items-center gap-2 rounded-md px-1 text-[13px] font-semibold #6F747A transition active:scale-[0.97]">
            <ArrowLeft size={16} />
            Назад
          </button>
          <Progress step={step} />
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={step} {...stepMotion}>
            {step === 'instructor' ? (
              <section>
                <h1 className="display-sm">Выберите инструктора</h1>
                <p className="mt-1 text-[14px] #6F747A">Можно выбрать вручную или доверить подбор системе.</p>

                <div className="mt-4 space-y-3">
                  <FilterChipsBar items={categoryOptions} value={category} onChange={setCategory} allLabel="Категория" />
                  <FilterChipsBar items={[{ value: 'manual', label: 'Механика' }, { value: 'auto', label: 'Автомат' }]} value={transmission} onChange={setTransmission} allLabel="Коробка" />
                  <FilterChipsBar items={branches.map((branch) => ({ value: branch.id, label: branch.name }))} value={branchId} onChange={setBranchId} allLabel="Филиал" />
                  <label className="flex min-h-11 items-center justify-between rounded-2xl border rgba(0,0,0,0.06) bg-white px-4  transition-all duration-150 active:scale-[0.97] active:#F4F5F6">
                    <span className="flex items-center gap-2 text-[14px] font-semibold #111418"><SlidersHorizontal size={15} /> Подобрать автоматически</span>
                    <input type="checkbox" checked={autoPick} onChange={(event) => setAutoPick(event.target.checked)} className="h-4 w-4 rounded accent-accent" />
                  </label>
                </div>

                <div className="mt-4 space-y-2">
                  {filteredInstructors.length === 0 ? (
                    <StateView kind="no-results" title="Инструкторы не найдены" description="Измените фильтры или включите автоподбор." />
                  ) : filteredInstructors.map((instructor) => (
                    <InstructorCompactCard
                      key={instructor.id}
                      instructor={instructor}
                      branch={db.branches.byId(instructor.branchId)}
                      nextSlot={nextSlotFor(instructor)}
                      selected={selectedInstructorId === instructor.id}
                      onSelect={() => {
                        setAutoPick(false)
                        setSelectedInstructorId(instructor.id)
                        const slot = nextSlotFor(instructor)
                        if (slot) setSelectedDate(slot.date)
                      }}
                    />
                  ))}
                </div>

                <StickyActionBar>
                  <Button className="w-full" disabled={!canContinueInstructor} onClick={continueFromInstructor}>Продолжить</Button>
                </StickyActionBar>
              </section>
            ) : null}

            {step === 'time' ? (
              <section>
                <h1 className="display-sm">День и время</h1>
                {selectedInstructor ? (
                  <div className="mt-3 flex items-center gap-3 rounded-2xl border rgba(0,0,0,0.06) bg-white p-3 ">
                    <img src={getInstructorPhoto(selectedInstructor)} alt={selectedInstructor.name} className="h-11 w-11 rounded-full border rgba(0,0,0,0.06) object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold #111418">{formatInstructorName(selectedInstructor.name)}</p>
                      <p className="truncate text-[12px] font-medium #6F747A">{selectedInstructor.car ?? 'Учебный автомобиль'} · {selectedBranch?.name ?? 'Филиал'} · {category || selectedInstructor.categories?.[0] || 'B'}</p>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4">
                  <DayChipsScroller days={days} selectedDate={selectedDate} onSelect={setSelectedDate} getCount={countForDate} />
                </div>
                <div className="mt-4">
                  {slotsForDate(selectedDate).length === 0 ? (
                    <StateView kind="no-results" title="На этот день нет времени" description="Выберите другой день." />
                  ) : (
                    <TimeSlotGrid slots={slotsForDate(selectedDate)} selectedSlotId={selectedSlotId} onSelect={selectSlot} />
                  )}
                </div>
                <StickyActionBar>
                  <Button className="w-full" disabled={!canContinueTime} onClick={() => setStep('contacts')}>Продолжить</Button>
                </StickyActionBar>
              </section>
            ) : null}

            {step === 'contacts' ? (
              <section>
                <h1 className="display-sm">Ваши контакты</h1>
                <p className="mt-1 text-[14px] #6F747A">Имя и телефон нужны для записи.</p>
                <div className="mt-4 space-y-3">
                  <BookingMiniSummary slot={selectedSlot} instructor={selectedInstructor} branch={selectedBranch} />
                  <Input label="Имя" value={form.name} error={errors.name} placeholder="Анна Иванова" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                  <Input label="Телефон" value={form.phone} error={errors.phone} placeholder="+7 (999) 123-45-67" onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                  <Input label="E-mail (опционально)" value={form.email} error={errors.email} placeholder="name@email.ru" onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                </div>
                <StickyActionBar>
                  <Button className="w-full" disabled={!form.name.trim() || !form.phone.trim()} onClick={() => validateContacts() && setStep('confirm')}>Проверить запись</Button>
                </StickyActionBar>
              </section>
            ) : null}

            {step === 'confirm' ? (
              <section>
                <h1 className="display-sm">Проверьте запись</h1>
                <p className="mt-1 text-[14px] #6F747A">Если всё верно, подтвердите занятие.</p>
                <div className="mt-4">
                  <SummaryCard slot={selectedSlot} instructor={selectedInstructor} branch={selectedBranch} student={{ name: form.name, phone: normalizePhone(form.phone), email: form.email }} />
                </div>
                <StickyActionBar>
                  <Button className="w-full" disabled={submitting} onClick={() => void submitBooking()}>
                    {submitting ? 'Записываем...' : 'Подтвердить запись'}
                  </Button>
                </StickyActionBar>
              </section>
            ) : null}

            {step === 'success' ? (
              <section className="space-y-3">
                <SuccessHeader subtitle="Мы сохранили вашу запись. Если нужно, автошкола свяжется с вами." />
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }}>
                  <BookingDetailsCard slot={selectedSlot} instructor={selectedInstructor} branch={selectedBranch} student={{ name: form.name, phone: normalizePhone(form.phone), email: form.email }} />
                </motion.div>
                <motion.div className="grid gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.08 }}>
                  <Button onClick={downloadCalendar}>
                    <CalendarPlus size={16} />
                    Добавить в календарь
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(`/school/${school.slug}/book`)}>Записаться ещё</Button>
                  <Button variant="ghost" onClick={() => navigate(`/school/${school.slug}`)}>На страницу школы</Button>
                </motion.div>
                <AccountOfferCard onCreate={() => setStep('account')} />
              </section>
            ) : null}

            {step === 'account' ? (
              <section>
                <h1 className="display-sm">Создать кабинет</h1>
                <p className="mt-1 text-[14px] #6F747A">Проверьте данные и задайте пароль. Эта запись появится в кабинете.</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border rgba(21,128,61,0.15) #F0FDF4 p-3.5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={18} className="#15803D" />
                      <div>
                        <p className="text-[14px] font-semibold #111418">Запись уже сохранена</p>
                        <p className="text-[12px] #6F747A">{selectedSlot ? `${formatHumanDate(selectedSlot.date, false)}, ${formatTimeRange(selectedSlot)}` : 'Выбранное занятие'}</p>
                      </div>
                    </div>
                  </div>
                  <Input label="Имя" value={form.name} error={errors.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                  <Input label="Телефон" value={form.phone} error={errors.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                  <Input label="E-mail" value={form.email} error={errors.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                  <Input label="Пароль" type="password" value={form.password} error={errors.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
                </div>
                <StickyActionBar>
                  <div className="grid gap-2">
                    <Button disabled={submitting || !form.name.trim() || !form.phone.trim() || !form.password.trim()} onClick={() => void createAccount()}>{submitting ? 'Создаём...' : 'Создать кабинет'}</Button>
                    <Button variant="secondary" onClick={() => createdBookingId ? navigate(`/booking/${createdBookingId}`) : navigate(`/school/${school.slug}`)}>Позже</Button>
                  </div>
                </StickyActionBar>
              </section>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}