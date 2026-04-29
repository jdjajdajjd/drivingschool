import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, SlidersHorizontal } from 'lucide-react'
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
import { acquireSlotLock, generateIcs, getAvailableSlots as getInstructorSlots, getOrCreateStudent, isValidRussianPhone, normalizePhone, releaseSessionLocks } from '../services/bookingService'
import { saveStudentProfile } from '../services/studentProfile'
import type { Booking, Branch, Instructor, School, Slot } from '../types'
import { formatTimeRange, getNext7Days } from '../utils/date'
import { formatInstructorName, generateId } from '../lib/utils'

type Step = 'instructor' | 'time' | 'contacts' | 'confirm' | 'success' | 'account'

interface ContactForm {
  name: string
  phone: string
  email: string
  password: string
}

const emptyContact: ContactForm = { name: '', phone: '', email: '', password: '' }

function Progress({ step }: { step: Step }) {
  const order: Step[] = ['instructor', 'time', 'contacts', 'confirm', 'success']
  const current = Math.max(1, order.indexOf(step) + 1)
  const pct = step === 'account' ? 100 : Math.min(100, Math.round((current / 5) * 100))
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="ui-kicker">{step === 'success' || step === 'account' ? 'Готово' : `Шаг ${current} из 4`}</p>
        <p className="text-[13px] font-semibold text-product-secondary">{pct}%</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-product-alt">
        <div className="h-full rounded-full bg-product-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
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
    if (!school) return
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
      showToast('Не нашли инструктора со свободным временем. Измените фильтры.', 'error')
      return
    }
    setStep('time')
  }

  function selectSlot(slot: Slot) {
    const result = acquireSlotLock(slot.id, sessionId.current)
    if (!result.ok) return
    setSelectedSlotId(slot.id)
  }

  function validateContacts(): boolean {
    const next: Partial<ContactForm> = {}
    if (!form.name.trim()) next.name = 'Введите имя.'
    if (!isValidRussianPhone(form.phone)) next.phone = 'Введите корректный телефон.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submitBooking() {
    if (!school || !selectedSlot || !selectedInstructor || !validateContacts()) return
    setSubmitting(true)
    try {
      const result = await createSupabaseBooking({ schoolId: school.id, studentName: form.name, studentPhone: form.phone, slotIds: [selectedSlot.id] })
      const student = getOrCreateStudent(school.id, form.name, form.phone)
      if (form.email.trim()) db.students.upsert({ ...student, email: form.email.trim() })
      const bookingId = result.bookingIds[0] ?? generateId('booking')
      const booking: Booking = {
        id: bookingId,
        bookingGroupId: result.bookingGroupId || undefined,
        schoolId: school.id,
        slotId: selectedSlot.id,
        branchId: selectedSlot.branchId,
        instructorId: selectedSlot.instructorId,
        studentId: student.id,
        studentName: student.name,
        studentPhone: student.normalizedPhone,
        studentEmail: form.email.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      db.bookings.upsert(booking)
      db.slots.upsert({ ...selectedSlot, status: 'booked', bookingId })
      saveStudentProfile(school.id, form, { passwordSet: false, assignedBranchId: selectedSlot.branchId })
      releaseSessionLocks(sessionId.current)
      setCreatedBookingId(bookingId)
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
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setErrors((current) => ({ ...current, email: 'Введите корректный e-mail.' }))
      return
    }
    if (form.password.trim().length < 6) {
      setErrors((current) => ({ ...current, password: 'Минимум 6 символов.' }))
      return
    }
    setSubmitting(true)
    try {
      saveStudentProfile(school.id, form, { passwordSet: true, assignedBranchId: selectedBranch?.id })
      await updateStudentProfileInSupabase({ schoolId: school.id, name: form.name, phone: form.phone, email: form.email, password: form.password, avatarUrl: '' })
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
    showToast('Файл календаря скачан.', 'success')
  }

  if (loading) return <div className="ui-shell" />
  if (!school) {
    return <div className="ui-shell flex items-center justify-center px-4"><StateView kind="error" title="Автошкола не найдена" action={<Button onClick={() => navigate('/school/virazh')}>Открыть Вираж</Button>} /></div>
  }

  const canContinueInstructor = autoPick || Boolean(selectedInstructorId)
  const canContinueTime = Boolean(selectedSlotId)

  return (
    <div className="ui-shell">
      <main className="mx-auto max-w-2xl px-4 pb-4 pt-4">
        <header className="mb-4">
          <button onClick={() => step === 'instructor' ? navigate(`/school/${school.slug}`) : setStep(step === 'time' ? 'instructor' : step === 'contacts' ? 'time' : step === 'confirm' ? 'contacts' : 'success')} className="mb-3 flex min-h-11 items-center gap-2 rounded-2xl text-sm font-semibold text-product-secondary">
            <ArrowLeft size={18} />
            Назад
          </button>
          <Progress step={step} />
        </header>

        {step === 'instructor' ? (
          <section>
            <h1 className="ui-h1">Выберите инструктора</h1>
            <p className="mt-1 text-base text-product-secondary">Категория, коробка и филиал теперь фильтры, а не отдельные шаги.</p>
            <div className="mt-4 space-y-3">
              <FilterChipsBar items={categoryOptions} value={category} onChange={setCategory} allLabel="Категория" />
              <FilterChipsBar items={[{ value: 'manual', label: 'Механика' }, { value: 'auto', label: 'Автомат' }]} value={transmission} onChange={setTransmission} allLabel="Коробка" />
              <FilterChipsBar items={branches.map((branch) => ({ value: branch.id, label: branch.name }))} value={branchId} onChange={setBranchId} allLabel="Филиал" />
              <label className="flex min-h-[52px] items-center justify-between rounded-[20px] border border-product-border bg-white px-4 shadow-soft">
                <span className="flex items-center gap-2 text-sm font-semibold text-product-main"><SlidersHorizontal size={17} /> Подобрать автоматически</span>
                <input type="checkbox" checked={autoPick} onChange={(event) => setAutoPick(event.target.checked)} className="h-5 w-5 accent-product-primary" />
              </label>
            </div>
            <div className="mt-4 space-y-2">
              {filteredInstructors.length === 0 ? <StateView kind="no-results" title="Инструкторы не найдены" description="Измените фильтры или включите автоподбор." /> : filteredInstructors.map((instructor) => (
                <InstructorCompactCard
                  key={instructor.id}
                  instructor={instructor}
                  branch={db.branches.byId(instructor.branchId)}
                  nextSlot={nextSlotFor(instructor)}
                  selected={selectedInstructorId === instructor.id}
                  onSelect={() => { setAutoPick(false); setSelectedInstructorId(instructor.id); const slot = nextSlotFor(instructor); if (slot) setSelectedDate(slot.date) }}
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
            <h1 className="ui-h1">День и время</h1>
            {selectedInstructor ? (
              <div className="mt-3 flex items-center gap-3 rounded-[20px] border border-product-border bg-white p-3 shadow-soft">
                <img src={getInstructorPhoto(selectedInstructor)} alt={selectedInstructor.name} className="h-12 w-12 rounded-full border border-[#E8EAF4] object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-product-main">{formatInstructorName(selectedInstructor.name)}</p>
                  <p className="truncate text-[13px] font-medium text-product-secondary">{selectedInstructor.car ?? 'Учебный автомобиль'} · {selectedBranch?.name ?? 'Филиал'} · {category || selectedInstructor.categories?.[0] || 'B'}</p>
                </div>
              </div>
            ) : null}
            <div className="mt-4">
              <DayChipsScroller days={days} selectedDate={selectedDate} onSelect={setSelectedDate} getCount={countForDate} />
            </div>
            <div className="mt-4">
              {slotsForDate(selectedDate).length === 0 ? <StateView kind="no-results" title="На этот день нет времени" description="Выберите другой день." /> : <TimeSlotGrid slots={slotsForDate(selectedDate)} selectedSlotId={selectedSlotId} onSelect={selectSlot} />}
            </div>
            <StickyActionBar>
              <Button className="w-full" disabled={!canContinueTime} onClick={() => setStep('contacts')}>Продолжить</Button>
            </StickyActionBar>
          </section>
        ) : null}

        {step === 'contacts' ? (
          <section>
            <h1 className="ui-h1">Ваши контакты</h1>
            <p className="mt-1 text-base text-product-secondary">Имя и телефон нужны для записи. E-mail можно добавить для кабинета.</p>
            <div className="mt-4 space-y-3">
              <Input label="Имя" value={form.name} error={errors.name} placeholder="Анна Иванова" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <Input label="Телефон" value={form.phone} error={errors.phone} placeholder="+7 (999) 123-45-67" onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              <Input label="E-mail (опционально)" value={form.email} error={errors.email} placeholder="name@email.ru" onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <div className="rounded-[20px] bg-product-alt px-4 py-3 text-sm font-semibold text-product-secondary">
                {selectedSlot ? formatTimeRange(selectedSlot) : 'Время не выбрано'} · {selectedInstructor?.name ?? 'Инструктор'}
              </div>
            </div>
            <StickyActionBar>
              <Button className="w-full" onClick={() => validateContacts() && setStep('confirm')}>Проверить запись</Button>
            </StickyActionBar>
          </section>
        ) : null}

        {step === 'confirm' ? (
          <section>
            <h1 className="ui-h1">Подтверждение</h1>
            <p className="mt-1 text-base text-product-secondary">Проверьте детали перед записью.</p>
            <div className="mt-4">
              <SummaryCard slot={selectedSlot} instructor={selectedInstructor} branch={selectedBranch} student={{ name: form.name, phone: normalizePhone(form.phone), email: form.email }} />
            </div>
            <StickyActionBar>
              <Button className="w-full" disabled={submitting} onClick={() => void submitBooking()}>
                {submitting ? 'Записываем...' : 'Записаться'}
              </Button>
            </StickyActionBar>
          </section>
        ) : null}

        {step === 'success' ? (
          <section className="space-y-3">
            <SuccessHeader />
            <BookingDetailsCard slot={selectedSlot} instructor={selectedInstructor} branch={selectedBranch} student={{ name: form.name, phone: normalizePhone(form.phone), email: form.email }} />
            <div className="grid gap-2">
              <Button onClick={() => navigate('/student')}>Мои записи</Button>
              <Button variant="secondary" onClick={downloadCalendar}>
                <CalendarPlus size={18} />
                Добавить в календарь
              </Button>
            </div>
            <div className="rounded-[24px] border border-product-border bg-white p-4 shadow-soft">
              <p className="text-base font-semibold leading-[22px] text-product-main">Хотите быстрее записываться в следующий раз?</p>
              <p className="mt-1 text-[14px] font-medium leading-5 text-product-secondary">Создайте кабинет — ваши записи будут храниться в одном месте.</p>
              <div className="mt-3 grid gap-2">
                <Button variant="secondary" onClick={() => setStep('account')}>Создать кабинет</Button>
                <Button variant="ghost" onClick={() => createdBookingId ? navigate(`/booking/${createdBookingId}`) : navigate(`/school/${school.slug}`)}>Вернуться на страницу школы</Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Button variant="ghost" onClick={() => navigate(`/school/${school.slug}/book`)}>Ещё одна запись</Button>
            </div>
          </section>
        ) : null}

        {step === 'account' ? (
          <section>
            <h1 className="ui-h1">Создать кабинет</h1>
            <p className="mt-1 text-base text-product-secondary">Имя и телефон уже заполнены. Добавьте e-mail и пароль.</p>
            <div className="mt-4 space-y-3">
              <Input label="Имя" value={form.name} error={errors.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <Input label="Телефон" value={form.phone} error={errors.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              <Input label="E-mail" value={form.email} error={errors.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <Input label="Пароль" type="password" value={form.password} error={errors.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            </div>
            <StickyActionBar>
              <div className="grid gap-2">
                <Button disabled={submitting} onClick={() => void createAccount()}>{submitting ? 'Создаём...' : 'Создать кабинет'}</Button>
                <Button variant="secondary" onClick={() => createdBookingId ? navigate(`/booking/${createdBookingId}`) : navigate(`/school/${school.slug}`)}>Позже</Button>
              </div>
            </StickyActionBar>
          </section>
        ) : null}
      </main>
    </div>
  )
}
