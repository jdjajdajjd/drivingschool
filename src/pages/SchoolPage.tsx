import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Car,
  Check,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { formatPhone, generateId, hexToRgba, pluralize } from '../lib/utils'
import {
  acquireSlotLock,
  createBooking,
  getAvailableSlots,
  isValidRussianPhone,
  normalizePhone,
  releaseSessionLocks,
  releaseSlotLock,
} from '../services/bookingService'
import { db } from '../services/storage'
import type { Branch, Instructor, School, Slot } from '../types'
import { formatDate, formatDateFull, formatDayOfWeek, getNext7Days } from '../utils/date'

type BookingStep = 1 | 2 | 3 | 4 | 5 | 6

const STEP_LABELS: Record<BookingStep, string> = {
  1: 'Филиал',
  2: 'Инструктор',
  3: 'Дата',
  4: 'Слот',
  5: 'Данные',
  6: 'Подтверждение',
}

interface FormState {
  name: string
  phone: string
}

function InfoCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: string
  subtitle?: string
  icon: typeof MapPin
}) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white/90 p-4 shadow-card">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-50">
        <Icon size={16} className="text-forest-700" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">{title}</p>
      <p className="mt-1 text-sm font-semibold text-stone-900">{value}</p>
      {subtitle ? <p className="mt-1 text-xs leading-relaxed text-stone-500">{subtitle}</p> : null}
    </div>
  )
}

function StepPill({
  step,
  currentStep,
}: {
  step: BookingStep
  currentStep: BookingStep
}) {
  const done = step < currentStep
  const active = step === currentStep

  return (
    <div
      className={`flex min-w-[112px] items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
        active
          ? 'border-forest-800 bg-forest-800 text-white'
          : done
            ? 'border-forest-200 bg-forest-50 text-forest-800'
            : 'border-stone-200 bg-white text-stone-400'
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
          active
            ? 'bg-white/15 text-white'
            : done
              ? 'bg-forest-100 text-forest-800'
              : 'bg-stone-100 text-stone-500'
        }`}
      >
        {done ? <Check size={12} /> : step}
      </span>
      <span>{STEP_LABELS[step]}</span>
    </div>
  )
}

function SummaryPanel({
  school,
  branch,
  instructor,
  date,
  slot,
  form,
}: {
  school: School
  branch: Branch | null
  instructor: Instructor | null
  date: string | null
  slot: Slot | null
  form: FormState
}) {
  const rows = [
    { label: 'Школа', value: school.name, muted: school.phone },
    branch ? { label: 'Филиал', value: branch.name, muted: branch.address } : null,
    instructor
      ? {
          label: 'Инструктор',
          value: instructor.name,
          muted: instructor.car
            ? `${instructor.car}${instructor.transmission ? ` · ${instructor.transmission === 'manual' ? 'Механика' : 'Автомат'}` : ''}`
            : undefined,
        }
      : null,
    date ? { label: 'Дата', value: formatDateFull(date), muted: formatDayOfWeek(date) } : null,
    slot ? { label: 'Время', value: slot.time, muted: `${slot.duration} минут` } : null,
    form.name ? { label: 'Ученик', value: form.name, muted: form.phone ? formatPhone(normalizePhone(form.phone)) : undefined } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; muted?: string }>

  return (
    <div className="overflow-hidden rounded-[28px] border border-stone-200/80 bg-white/90 shadow-card backdrop-blur">
      <div className="border-b border-stone-100 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-400">Детали записи</p>
        <p className="mt-2 text-lg font-semibold text-stone-900">Проверьте детали записи</p>
      </div>
      <div className="space-y-4 px-5 py-5">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl bg-stone-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">{row.label}</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{row.value}</p>
            {row.muted ? <p className="mt-1 text-xs text-stone-500">{row.muted}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SchoolPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const sessionId = useRef(generateId('session'))

  const [school, setSchool] = useState<School | null>(null)
  const [schoolMissing, setSchoolMissing] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [step, setStep] = useState<BookingStep>(1)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [form, setForm] = useState<FormState>({ name: '', phone: '' })
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const dateOptions = useMemo(() => getNext7Days(), [])

  const branchInstructors = useMemo(
    () =>
      selectedBranch
        ? instructors.filter(
            (instructor) => instructor.branchId === selectedBranch.id && instructor.isActive,
          )
        : [],
    [instructors, selectedBranch],
  )

  const availableSlots = useMemo(
    () =>
      selectedInstructor && selectedDate
        ? getAvailableSlots(selectedInstructor.id, selectedDate, sessionId.current)
        : [],
    [selectedDate, selectedInstructor],
  )

  useEffect(() => {
    if (!slug) {
      return
    }

    const currentSchool = db.schools.bySlug(slug)
    if (!currentSchool) {
      setSchoolMissing(true)
      return
    }

    setSchoolMissing(false)
    setSchool(currentSchool)
    setBranches(db.branches.bySchool(currentSchool.id).filter((branch) => branch.isActive))
    setInstructors(db.instructors.bySchool(currentSchool.id))
  }, [navigate, slug])

  useEffect(() => {
    if (!selectedSlot) {
      return
    }

    const refreshLock = () => {
      const result = acquireSlotLock(selectedSlot.id, sessionId.current)
      if (!result.ok) {
        setSelectedSlot(null)
        if (step >= 4) {
          setStep(4)
        }
        showToast(result.error ?? 'Слот больше недоступен.', 'error')
      } else {
        const freshSlot = db.slots.byId(selectedSlot.id)
        if (freshSlot) {
          setSelectedSlot(freshSlot)
        }
      }
    }

    refreshLock()
    const intervalId = window.setInterval(refreshLock, 30_000)

    return () => window.clearInterval(intervalId)
  }, [selectedSlot, showToast, step])

  useEffect(() => {
    return () => {
      releaseSessionLocks(sessionId.current)
    }
  }, [])

  function resetAfterBranch(): void {
    if (selectedSlot) {
      releaseSlotLock(selectedSlot.id, sessionId.current)
    }

    setSelectedInstructor(null)
    setSelectedDate(null)
    setSelectedSlot(null)
    setErrors({})
  }

  function resetAfterInstructor(): void {
    if (selectedSlot) {
      releaseSlotLock(selectedSlot.id, sessionId.current)
    }

    setSelectedDate(null)
    setSelectedSlot(null)
    setErrors({})
  }

  function resetAfterDate(): void {
    if (selectedSlot) {
      releaseSlotLock(selectedSlot.id, sessionId.current)
    }

    setSelectedSlot(null)
  }

  function validateForm(): boolean {
    const nextErrors: Partial<FormState> = {}

    if (!form.name.trim()) {
      nextErrors.name = 'Введите имя ученика'
    }

    if (!form.phone.trim()) {
      nextErrors.phone = 'Введите телефон'
    } else if (!isValidRussianPhone(form.phone)) {
      nextErrors.phone = 'Введите номер в формате +7 или 8'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSlotSelect(slot: Slot): Promise<void> {
    if (selectedSlot?.id === slot.id) {
      setStep(5)
      return
    }

    if (selectedSlot) {
      releaseSlotLock(selectedSlot.id, sessionId.current)
    }

    const result = acquireSlotLock(slot.id, sessionId.current)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось заблокировать слот.', 'error')
      return
    }

    const freshSlot = db.slots.byId(slot.id)
    setSelectedSlot(freshSlot ?? slot)
    setStep(5)
  }

  async function handleSubmit(): Promise<void> {
    if (!school || !selectedBranch || !selectedInstructor || !selectedDate || !selectedSlot) {
      showToast('Сначала выберите филиал, инструктора, дату и слот.', 'error')
      return
    }

    if (!validateForm()) {
      showToast('Проверьте имя и телефон.', 'error')
      return
    }

    setIsSubmitting(true)

    const result = createBooking({
      schoolId: school.id,
      branchId: selectedBranch.id,
      instructorId: selectedInstructor.id,
      slotId: selectedSlot.id,
      studentName: form.name,
      studentPhone: form.phone,
      sessionId: sessionId.current,
    })

    setIsSubmitting(false)

    if (!result.ok || !result.booking) {
      showToast(result.error ?? 'Не удалось создать запись.', 'error')
      if (selectedInstructor && selectedDate) {
        const freshSlot = db.slots.byId(selectedSlot.id)
        if (!freshSlot || freshSlot.status === 'booked') {
          setSelectedSlot(null)
          setStep(4)
        }
      }
      return
    }

    releaseSessionLocks(sessionId.current)
    showToast('Запись сохранена.', 'success')
    navigate(`/booking/${result.booking.id}`)
  }

  if (schoolMissing) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <EmptyState
            title="Автошкола не найдена"
            description="Проверьте ссылку или откройте демо-страницу записи заново."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => navigate('/')}>На главную</Button>
                <Button variant="secondary" onClick={() => navigate('/school/virazh')}>
                  Открыть демо записи
                </Button>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  if (!school) {
    return null
  }

  const brandColor = school.primaryColor ?? '#1f5b43'
  const brandSoft = hexToRgba(brandColor, 0.08)

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-stone-50/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl shadow-soft" style={{ backgroundColor: brandColor }}>
              {school.logoUrl ? (
                <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" />
              ) : (
                <Car size={18} className="text-white" />
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-stone-900">{school.name}</p>
              <p className="text-xs text-stone-400">Онлайн-запись на вождение</p>
            </div>
          </button>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-stone-900">{school.name}</p>
            <p className="text-xs text-stone-500">{formatPhone(school.phone)}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-card">
              <div className="border-b border-stone-100 px-6 py-6">
                <Badge variant="outline" size="md" className="border-transparent" style={{ backgroundColor: brandSoft, color: brandColor }}>
                  Онлайн-запись
                </Badge>
                <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-stone-900 md:text-[2.6rem]">
                  Запишитесь на занятие без звонков и лишних шагов
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-500">
                  {school.description || 'Выберите филиал, инструктора и свободное время для занятия.'}
                </p>
                <p className="mt-2 text-sm font-medium text-stone-600">
                  Выберите филиал, инструктора и свободное время для занятия.
                </p>
              </div>

              <div className="grid gap-3 border-b border-stone-100 px-6 py-5 md:grid-cols-3">
                <InfoCard title="Школа" value={school.name} subtitle={school.address} icon={MapPin} />
                <InfoCard title="Контакт" value={formatPhone(school.phone)} subtitle={school.email} icon={Phone} />
                <InfoCard
                  title="Лимит"
                  value={
                    school.bookingLimitEnabled && school.maxActiveBookingsPerStudent
                      ? pluralize(school.maxActiveBookingsPerStudent, 'активная запись', 'активные записи', 'активных записей')
                      : 'Без ограничений'
                  }
                  subtitle="Проверяется при подтверждении"
                  icon={ShieldCheck}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto px-6 py-5">
                {([1, 2, 3, 4, 5, 6] as BookingStep[]).map((item) => (
                  <StepPill key={item} step={item} currentStep={step} />
                ))}
              </div>

              <div className="px-6 pb-6">
                {step === 1 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">1. Выберите филиал</p>
                        <p className="text-sm text-stone-500">От него зависит список инструкторов и адрес занятия.</p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {branches.length === 0 ? (
                        <EmptyState
                          title="Нет доступных филиалов"
                          description="Сейчас на публичной странице нет активных филиалов. Попробуйте позже или свяжитесь с автошколой."
                        />
                      ) : null}
                      {branches.map((branch) => {
                        const branchInstructorCount = instructors.filter(
                          (instructor) => instructor.branchId === branch.id && instructor.isActive,
                        ).length

                        return (
                          <button
                            key={branch.id}
                            onClick={() => {
                              setSelectedBranch(branch)
                              resetAfterBranch()
                              setStep(2)
                            }}
                            className="rounded-[28px] border border-stone-200 bg-white px-5 py-5 text-left transition hover:border-forest-300 hover:bg-forest-50/50"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-base font-semibold text-stone-900">{branch.name}</p>
                                <p className="mt-2 flex items-center gap-2 text-sm text-stone-500">
                                  <MapPin size={14} className="text-stone-400" />
                                  {branch.address}
                                </p>
                                <p className="mt-2 flex items-center gap-2 text-sm text-stone-500">
                                  <Phone size={14} className="text-stone-400" />
                                  {formatPhone(branch.phone)}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {pluralize(branchInstructorCount, 'инструктор', 'инструктора', 'инструкторов')}
                              </Badge>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-2 text-sm text-stone-500 transition hover:text-stone-900"
                    >
                      <ArrowLeft size={15} />
                      Назад к филиалам
                    </button>

                    <div>
                      <p className="text-sm font-semibold text-stone-900">2. Выберите инструктора</p>
                      <p className="text-sm text-stone-500">Показываем только активных инструкторов выбранного филиала.</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {branchInstructors.length === 0 ? (
                        <div className="md:col-span-2">
                          <EmptyState
                            title="В этом филиале пока нет доступных инструкторов"
                            description="Выберите другой филиал или попробуйте зайти позже."
                          />
                        </div>
                      ) : null}
                      {branchInstructors.map((instructor) => (
                        <button
                          key={instructor.id}
                          onClick={() => {
                            setSelectedInstructor(instructor)
                            resetAfterInstructor()
                            setStep(3)
                          }}
                          className="rounded-[28px] border border-stone-200 bg-white px-5 py-5 text-left transition hover:border-forest-300 hover:bg-forest-50/50"
                        >
                          <div className="flex items-start gap-4">
                            <Avatar initials={instructor.avatarInitials} color={instructor.avatarColor} size="lg" />
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-semibold text-stone-900">{instructor.name}</p>
                              <p className="mt-1 text-sm text-stone-500">{instructor.bio}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {instructor.categories.map((category) => (
                                  <Badge key={category} variant="outline">
                                    кат. {category}
                                  </Badge>
                                ))}
                                {instructor.car ? (
                                  <Badge variant="forest">
                                    {instructor.car}
                                    {instructor.transmission
                                      ? ` · ${instructor.transmission === 'manual' ? 'Механика' : 'Автомат'}`
                                      : ''}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-2 text-sm text-stone-500 transition hover:text-stone-900"
                    >
                      <ArrowLeft size={15} />
                      Назад к инструкторам
                    </button>

                    <div>
                      <p className="text-sm font-semibold text-stone-900">3. Выберите дату</p>
                      <p className="text-sm text-stone-500">Показываем ближайшие 7 дней и доступные слоты по каждому дню.</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {dateOptions.map((date) => {
                        const count = selectedInstructor
                          ? getAvailableSlots(selectedInstructor.id, date, sessionId.current).length
                          : 0

                        return (
                          <button
                            key={date}
                            disabled={count === 0}
                            onClick={() => {
                              setSelectedDate(date)
                              resetAfterDate()
                              setStep(4)
                            }}
                            className={`rounded-[28px] border px-5 py-5 text-left transition ${
                              count === 0
                                ? 'cursor-not-allowed border-stone-100 bg-stone-50 text-stone-300'
                                : 'border-stone-200 bg-white hover:border-forest-300 hover:bg-forest-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <CalendarDays size={18} className={count === 0 ? 'text-stone-300' : 'text-forest-700'} />
                              <Badge variant={count === 0 ? 'default' : 'forest'}>{count} слотов</Badge>
                            </div>
                            <p className="mt-6 text-base font-semibold text-stone-900">{formatDate(date)}</p>
                            <p className="mt-1 text-sm capitalize text-stone-500">{formatDayOfWeek(date)}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => setStep(3)}
                      className="inline-flex items-center gap-2 text-sm text-stone-500 transition hover:text-stone-900"
                    >
                      <ArrowLeft size={15} />
                      Назад к датам
                    </button>

                    <div>
                      <p className="text-sm font-semibold text-stone-900">4. Выберите слот</p>
                      <p className="text-sm text-stone-500">
                        Слот блокируется сразу после выбора, чтобы его не заняли параллельно.
                      </p>
                    </div>

                    {selectedDate ? (
                      <div className="rounded-[28px] border border-stone-200 bg-stone-50 px-5 py-4">
                        <p className="text-sm font-semibold text-stone-900">{formatDateFull(selectedDate)}</p>
                        <p className="mt-1 text-sm capitalize text-stone-500">{formatDayOfWeek(selectedDate)}</p>
                      </div>
                    ) : null}

                    {availableSlots.length === 0 ? (
                      <div className="rounded-[28px] border border-dashed border-stone-200 bg-stone-50 px-6 py-12 text-center">
                        <Clock3 size={24} className="mx-auto text-stone-300" />
                        <p className="mt-4 text-sm font-semibold text-stone-900">На эту дату нет свободных слотов</p>
                        <p className="mt-2 text-sm text-stone-500">Выберите другой день или другого инструктора.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => void handleSlotSelect(slot)}
                            className={`rounded-[24px] border px-4 py-4 text-left transition ${
                              selectedSlot?.id === slot.id
                                ? 'border-forest-800 bg-forest-800 text-white'
                                : 'border-stone-200 bg-white hover:border-forest-300 hover:bg-forest-50/50'
                            }`}
                          >
                            <p className="text-lg font-semibold">{slot.time}</p>
                            <p
                              className={`mt-1 text-xs ${
                                selectedSlot?.id === slot.id ? 'text-white/70' : 'text-stone-500'
                              }`}
                            >
                              {slot.duration} минут
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {step === 5 ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => setStep(4)}
                      className="inline-flex items-center gap-2 text-sm text-stone-500 transition hover:text-stone-900"
                    >
                      <ArrowLeft size={15} />
                      Назад к слотам
                    </button>

                    <div>
                      <p className="text-sm font-semibold text-stone-900">5. Данные ученика</p>
                      <p className="text-sm text-stone-500">
                        Имя и телефон обязательны. Телефон нормализуется в формат `7xxxxxxxxxx`.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="Имя ученика"
                        placeholder="Анна Иванова"
                        value={form.name}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, name: event.target.value }))
                          if (errors.name) {
                            setErrors((current) => ({ ...current, name: undefined }))
                          }
                        }}
                        error={errors.name}
                      />
                      <Input
                        label="Телефон"
                        placeholder="+7 (999) 123-45-67"
                        value={form.phone}
                        helperText="Нормализуем номер к формату 7XXXXXXXXXX"
                        onChange={(event) => {
                          setForm((current) => ({ ...current, phone: event.target.value }))
                          if (errors.phone) {
                            setErrors((current) => ({ ...current, phone: undefined }))
                          }
                        }}
                        error={errors.phone}
                      />
                    </div>

                    <div className="rounded-[28px] border border-stone-200 bg-stone-50 px-5 py-5">
                      <p className="text-sm font-semibold text-stone-900">Перед записью мы проверим</p>
                      <ul className="mt-3 space-y-2 text-sm text-stone-500">
                        <li>Имя не может быть пустым.</li>
                        <li>Телефон должен быть валиден для российского формата.</li>
                        <li>Слот ещё раз проверяется на занятость при создании записи.</li>
                      </ul>
                    </div>

                    <Button
                      size="lg"
                      className="w-full"
                      disabled={!form.name.trim() || !form.phone.trim()}
                      onClick={() => {
                        if (!validateForm()) {
                          showToast('Проверьте форму перед продолжением.', 'error')
                          return
                        }
                        setStep(6)
                      }}
                    >
                      Перейти к подтверждению
                      <ArrowRight size={16} />
                    </Button>
                    {!form.name.trim() || !form.phone.trim() ? (
                      <p className="text-sm text-stone-500">Кнопка станет активной, когда вы заполните имя и телефон.</p>
                    ) : null}
                  </div>
                ) : null}

                {step === 6 ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => setStep(5)}
                      className="inline-flex items-center gap-2 text-sm text-stone-500 transition hover:text-stone-900"
                    >
                      <ArrowLeft size={15} />
                      Назад к данным
                    </button>

                    <div>
                      <p className="text-sm font-semibold text-stone-900">6. Подтверждение</p>
                      <p className="text-sm text-stone-500">
                        После сохранения вы попадёте на страницу подтверждения и сможете скачать `.ics`.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedBranch ? (
                        <InfoCard title="Филиал" value={selectedBranch.name} subtitle={selectedBranch.address} icon={MapPin} />
                      ) : null}
                      {selectedInstructor ? (
                        <InfoCard
                          title="Инструктор"
                          value={selectedInstructor.name}
                          subtitle={selectedInstructor.car ?? 'Автомобиль уточняется'}
                          icon={Users}
                        />
                      ) : null}
                      {selectedDate ? (
                        <InfoCard title="Дата" value={formatDateFull(selectedDate)} subtitle={formatDayOfWeek(selectedDate)} icon={CalendarDays} />
                      ) : null}
                      {selectedSlot ? (
                        <InfoCard title="Слот" value={selectedSlot.time} subtitle={`${selectedSlot.duration} минут`} icon={Clock3} />
                      ) : null}
                      <InfoCard title="Ученик" value={form.name.trim()} subtitle={formatPhone(normalizePhone(form.phone))} icon={UserRound} />
                    </div>

                    <Button
                      size="lg"
                      className="w-full"
                      disabled={isSubmitting}
                      style={!isSubmitting ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
                      onClick={() => void handleSubmit()}
                    >
                      {isSubmitting ? 'Сохраняем запись...' : 'Записаться'}
                      {!isSubmitting ? <Check size={16} /> : null}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <SummaryPanel
              school={school}
              branch={selectedBranch}
              instructor={selectedInstructor}
              date={selectedDate}
              slot={selectedSlot}
              form={form}
            />
          </div>
        </motion.section>
      </main>
    </div>
  )
}
