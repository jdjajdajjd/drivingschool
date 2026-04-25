import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, CalendarDays, Car, Check, Clock3, MapPin, Phone, UserRound } from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
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

const STEP_TITLES: Record<BookingStep, string> = {
  1: 'Выберите филиал',
  2: 'Выберите инструктора',
  3: 'Выберите дату',
  4: 'Выберите время',
  5: 'Ваши данные',
  6: 'Проверьте запись',
}

interface FormState {
  name: string
  phone: string
}

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22 },
}

function StepProgress({ step, total = 6 }: { step: BookingStep; total?: number }) {
  const current = Math.min(step as number, total)
  const pct = Math.round((current / total) * 100)

  return (
    <div className="px-6 pt-6 pb-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-stone-400">Шаг {current} из {total}</span>
        <span className="text-sm font-medium text-stone-400">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-forest-700 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-2 text-base text-stone-500 hover:text-stone-900 transition-colors"
    >
      <ArrowLeft size={18} />
      {label}
    </button>
  )
}

export function SchoolPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const sessionId = useRef(generateId('session'))
  const isFinalizingRef = useRef(false)

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
        ? instructors.filter((i) => i.branchId === selectedBranch.id && i.isActive)
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
    if (!slug) return
    const currentSchool = db.schools.bySlug(slug)
    if (!currentSchool) {
      setSchoolMissing(true)
      return
    }
    setSchoolMissing(false)
    setSchool(currentSchool)
    setBranches(db.branches.bySchool(currentSchool.id).filter((b) => b.isActive))
    setInstructors(db.instructors.bySchool(currentSchool.id))
  }, [navigate, slug])

  useEffect(() => {
    if (!selectedSlot) return
    if (isSubmitting) return
    const refreshLock = () => {
      if (isFinalizingRef.current) return
      const result = acquireSlotLock(selectedSlot.id, sessionId.current)
      if (!result.ok) {
        setSelectedSlot(null)
        if (step >= 4) setStep(4)
        showToast(result.error ?? 'Слот больше недоступен.', 'error')
      } else {
        const freshSlot = db.slots.byId(selectedSlot.id)
        if (freshSlot) setSelectedSlot(freshSlot)
      }
    }
    refreshLock()
    const id = window.setInterval(refreshLock, 30_000)
    return () => window.clearInterval(id)
  }, [isSubmitting, selectedSlot, showToast, step])

  useEffect(() => {
    return () => { releaseSessionLocks(sessionId.current) }
  }, [])

  function resetAfterBranch() {
    if (selectedSlot) releaseSlotLock(selectedSlot.id, sessionId.current)
    setSelectedInstructor(null)
    setSelectedDate(null)
    setSelectedSlot(null)
    setErrors({})
  }

  function resetAfterInstructor() {
    if (selectedSlot) releaseSlotLock(selectedSlot.id, sessionId.current)
    setSelectedDate(null)
    setSelectedSlot(null)
    setErrors({})
  }

  function resetAfterDate() {
    if (selectedSlot) releaseSlotLock(selectedSlot.id, sessionId.current)
    setSelectedSlot(null)
  }

  function chooseBranch(branch: Branch): void {
    if (selectedBranch?.id === branch.id) return
    resetAfterBranch()
    setSelectedBranch(branch)
  }

  function chooseInstructor(instructor: Instructor): void {
    if (selectedInstructor?.id === instructor.id) return
    resetAfterInstructor()
    setSelectedInstructor(instructor)
  }

  function chooseDate(date: string): void {
    if (selectedDate === date) return
    resetAfterDate()
    setSelectedDate(date)
  }

  function validateForm(): boolean {
    const nextErrors: Partial<FormState> = {}
    if (!form.name.trim()) nextErrors.name = 'Введите имя'
    if (!form.phone.trim()) nextErrors.phone = 'Введите телефон'
    else if (!isValidRussianPhone(form.phone)) nextErrors.phone = 'Формат: +7 или 8...'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSlotSelect(slot: Slot): Promise<void> {
    if (selectedSlot?.id === slot.id) {
      return
    }
    if (selectedSlot) releaseSlotLock(selectedSlot.id, sessionId.current)
    const result = acquireSlotLock(slot.id, sessionId.current)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось заблокировать слот.', 'error')
      return
    }
    const freshSlot = db.slots.byId(slot.id)
    setSelectedSlot(freshSlot ?? slot)
    isFinalizingRef.current = false
  }

  async function handleSubmit(): Promise<void> {
    if (!school || !selectedBranch || !selectedInstructor || !selectedDate || !selectedSlot) {
      showToast('Сначала выберите все данные.', 'error')
      return
    }
    if (!validateForm()) {
      showToast('Проверьте имя и телефон.', 'error')
      return
    }
    isFinalizingRef.current = true
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
    if (!result.ok || !result.booking) {
      isFinalizingRef.current = false
      setIsSubmitting(false)
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
    setSelectedSlot(null)
    showToast('Запись сохранена.', 'success')
    navigate(`/booking/${result.booking.id}`)
  }

  if (schoolMissing) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <EmptyState
            title="Автошкола не найдена"
            description="Проверьте ссылку или откройте демо-страницу."
            action={
              <div className="flex flex-col gap-3 mt-2">
                <Button size="lg" className="w-full" onClick={() => navigate('/school/virazh')}>
                  Открыть демо записи
                </Button>
                <Button size="lg" variant="secondary" className="w-full" onClick={() => navigate('/')}>
                  На главную
                </Button>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  if (!school) return null

  const brandColor = school.primaryColor === '#1f5b43' ? '#4455C4' : (school.primaryColor ?? '#4455C4')
  const brandSoft = hexToRgba(brandColor, 0.08)

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-soft overflow-hidden shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              {school.logoUrl ? (
                <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" />
              ) : (
                <Car size={20} className="text-white" />
              )}
            </div>
            <div className="text-left">
              <p className="text-base font-semibold text-stone-900 leading-tight">{school.name}</p>
              <p className="text-sm text-stone-400">Запись на занятие</p>
            </div>
          </button>
          {school.phone ? (
            <a
              href={`tel:${school.phone}`}
              className="flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              <Phone size={15} className="text-stone-400" />
              {formatPhone(school.phone)}
            </a>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6 pb-24 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Step card */}
          <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-3xl border border-stone-200 bg-white sm:min-h-0">
            <StepProgress step={step} />

            <div className="px-6 pb-8 pt-4">
              <AnimatePresence mode="wait">
                {/* ── Step 1: Филиал ── */}
                {step === 1 ? (
                  <motion.div key="step1" {...fadeSlide}>
                    <h1 className="text-2xl font-semibold text-stone-900 mb-1">
                      {STEP_TITLES[1]}
                    </h1>
                    <p className="text-base text-stone-500 mb-6">
                      От филиала зависит список инструкторов и адрес занятия.
                    </p>

                    {branches.length === 0 ? (
                      <EmptyState
                        title="Нет доступных филиалов"
                        description="Попробуйте позже или позвоните в автошколу."
                      />
                    ) : (
                      <div className="space-y-3">
                        {branches.map((branch) => {
                          const cnt = instructors.filter(
                            (i) => i.branchId === branch.id && i.isActive,
                          ).length
                          const selected = selectedBranch?.id === branch.id
                          return (
                            <button
                              key={branch.id}
                              onClick={() => chooseBranch(branch)}
                              className={`w-full rounded-2xl border-2 px-5 py-5 text-left transition active:scale-[0.99] ${
                                selected
                                  ? 'border-forest-700 bg-forest-50'
                                  : 'border-stone-200 bg-white hover:border-forest-400 hover:bg-forest-50/40'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-lg font-semibold text-stone-900 leading-snug">
                                  {branch.name}
                                </p>
                                {selected ? (
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white">
                                    <Check size={16} />
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 flex items-center gap-2 text-base text-stone-500">
                                <MapPin size={16} className="shrink-0 text-stone-400" />
                                {branch.address}
                              </p>
                              {branch.phone ? (
                                <p className="mt-1 flex items-center gap-2 text-base text-stone-500">
                                  <Phone size={16} className="shrink-0 text-stone-400" />
                                  {formatPhone(branch.phone)}
                                </p>
                              ) : null}
                              {cnt > 0 ? (
                                <p className="mt-3 text-sm text-stone-400">
                                  {pluralize(cnt, 'инструктор', 'инструктора', 'инструкторов')} доступно
                                </p>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    <Button
                      size="lg"
                      className="mt-6 w-full min-h-14 text-lg"
                      disabled={!selectedBranch}
                      onClick={() => setStep(2)}
                    >
                      Далее
                      <ArrowRight size={20} />
                    </Button>
                  </motion.div>
                ) : null}

                {/* ── Step 2: Инструктор ── */}
                {step === 2 ? (
                  <motion.div key="step2" {...fadeSlide}>
                    <BackButton onClick={() => setStep(1)} label="Назад к филиалам" />
                    <h1 className="text-2xl font-semibold text-stone-900 mb-1">
                      {STEP_TITLES[2]}
                    </h1>
                    <p className="text-base text-stone-500 mb-6">
                      Показываем инструкторов выбранного филиала.
                    </p>

                    {branchInstructors.length === 0 ? (
                      <EmptyState
                        title="Нет доступных инструкторов"
                        description="Выберите другой филиал или попробуйте позже."
                      />
                    ) : (
                      <div className="space-y-3">
                        {branchInstructors.map((instructor) => {
                          const selected = selectedInstructor?.id === instructor.id
                          return (
                          <button
                            key={instructor.id}
                            onClick={() => chooseInstructor(instructor)}
                            className={`w-full rounded-2xl border-2 px-5 py-5 text-left transition active:scale-[0.99] ${
                              selected
                                ? 'border-forest-700 bg-forest-50'
                                : 'border-stone-200 bg-white hover:border-forest-400 hover:bg-forest-50/40'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <Avatar
                                initials={instructor.avatarInitials}
                                color={instructor.avatarColor}
                                size="lg"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-lg font-semibold text-stone-900 leading-snug">
                                  {instructor.name}
                                </p>
                                {instructor.bio ? (
                                  <p className="mt-1 text-base text-stone-500 line-clamp-2">
                                    {instructor.bio}
                                  </p>
                                ) : null}
                                {instructor.car ? (
                                  <p className="mt-1 text-sm text-stone-400">
                                    {instructor.car}
                                    {instructor.transmission
                                      ? ` · ${instructor.transmission === 'manual' ? 'Механика' : 'Автомат'}`
                                      : ''}
                                  </p>
                                ) : null}
                              </div>
                              {selected ? (
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white">
                                  <Check size={17} />
                                </span>
                              ) : null}
                            </div>
                          </button>
                          )
                        })}
                      </div>
                    )}

                    <Button
                      size="lg"
                      className="mt-6 w-full min-h-14 text-lg"
                      disabled={!selectedInstructor}
                      onClick={() => setStep(3)}
                    >
                      Далее
                      <ArrowRight size={20} />
                    </Button>
                  </motion.div>
                ) : null}

                {/* ── Step 3: Дата ── */}
                {step === 3 ? (
                  <motion.div key="step3" {...fadeSlide}>
                    <BackButton onClick={() => setStep(2)} label="Назад к инструкторам" />
                    <h1 className="text-2xl font-semibold text-stone-900 mb-1">
                      {STEP_TITLES[3]}
                    </h1>
                    <p className="text-base text-stone-500 mb-6">
                      Ближайшие 7 дней. Выберите удобный день.
                    </p>

                    <div className="space-y-2">
                      {dateOptions.map((date) => {
                        const count = selectedInstructor
                          ? getAvailableSlots(selectedInstructor.id, date, sessionId.current).length
                          : 0
                        const available = count > 0

                        return (
                          <button
                            key={date}
                            disabled={!available}
                            onClick={() => chooseDate(date)}
                            className={`w-full rounded-2xl border-2 px-5 py-4 text-left transition ${
                              selectedDate === date
                                ? 'border-forest-700 bg-forest-50 active:scale-[0.99]'
                                : available
                                  ? 'border-stone-200 bg-white hover:border-forest-400 hover:bg-forest-50/40 active:scale-[0.99]'
                                : 'border-stone-100 bg-stone-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p
                                  className={`text-lg font-semibold capitalize ${
                                    available ? 'text-stone-900' : 'text-stone-300'
                                  }`}
                                >
                                  {formatDayOfWeek(date)}, {formatDate(date)}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 text-sm font-medium ${
                                  available ? 'text-forest-700' : 'text-stone-300'
                                }`}
                              >
                                {available
                                  ? pluralize(count, 'слот', 'слота', 'слотов')
                                  : 'Нет мест'}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    <Button
                      size="lg"
                      className="mt-6 w-full min-h-14 text-lg"
                      disabled={!selectedDate}
                      onClick={() => setStep(4)}
                    >
                      Далее
                      <ArrowRight size={20} />
                    </Button>
                  </motion.div>
                ) : null}

                {/* ── Step 4: Время ── */}
                {step === 4 ? (
                  <motion.div key="step4" {...fadeSlide}>
                    <BackButton onClick={() => setStep(3)} label="Назад к датам" />
                    <h1 className="text-2xl font-semibold text-stone-900 mb-1">
                      {STEP_TITLES[4]}
                    </h1>
                    {selectedDate ? (
                      <p className="text-base text-stone-500 mb-6 capitalize">
                        {formatDayOfWeek(selectedDate)}, {formatDateFull(selectedDate)}
                      </p>
                    ) : null}

                    {availableSlots.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-12 text-center">
                        <Clock3 size={28} className="mx-auto text-stone-300 mb-3" />
                        <p className="text-base font-semibold text-stone-700">Нет свободных мест</p>
                        <p className="mt-1 text-sm text-stone-500">Выберите другой день.</p>
                        <button
                          onClick={() => setStep(3)}
                          className="mt-4 text-sm font-medium text-forest-700 hover:underline"
                        >
                          ← Вернуться к выбору даты
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {availableSlots.map((slot) => {
                          const active = selectedSlot?.id === slot.id
                          return (
                            <button
                              key={slot.id}
                              onClick={() => void handleSlotSelect(slot)}
                              className={`rounded-2xl border-2 px-3 py-4 text-center transition active:scale-[0.97] ${
                                active
                                  ? 'border-forest-700 bg-forest-700 text-white'
                                  : 'border-stone-200 bg-white hover:border-forest-400 hover:bg-forest-50/40'
                              }`}
                            >
                              <p className={`text-xl font-bold ${active ? 'text-white' : 'text-stone-900'}`}>
                                {slot.time}
                              </p>
                              <p className={`mt-1 text-xs ${active ? 'text-white/70' : 'text-stone-400'}`}>
                                {slot.duration} мин
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    <Button
                      size="lg"
                      className="mt-6 w-full min-h-14 text-lg"
                      disabled={!selectedSlot}
                      onClick={() => setStep(5)}
                    >
                      Далее
                      <ArrowRight size={20} />
                    </Button>
                  </motion.div>
                ) : null}

                {/* ── Step 5: Данные ── */}
                {step === 5 ? (
                  <motion.div key="step5" {...fadeSlide}>
                    <BackButton onClick={() => setStep(4)} label="Назад к выбору времени" />
                    <h1 className="text-2xl font-semibold text-stone-900 mb-1">
                      {STEP_TITLES[5]}
                    </h1>
                    <p className="text-base text-stone-500 mb-8">
                      Оставьте контакт — автошкола свяжется при необходимости.
                    </p>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-base font-medium text-stone-700 mb-2">
                          Как вас зовут?
                        </label>
                        <Input
                          placeholder="Анна Иванова"
                          value={form.name}
                          onChange={(e) => {
                            setForm((c) => ({ ...c, name: e.target.value }))
                            if (errors.name) setErrors((c) => ({ ...c, name: undefined }))
                          }}
                          error={errors.name}
                        />
                      </div>

                      <div>
                        <label className="block text-base font-medium text-stone-700 mb-2">
                          Ваш номер для связи?
                        </label>
                        <Input
                          placeholder="+7 (999) 123-45-67"
                          value={form.phone}
                          onChange={(e) => {
                            setForm((c) => ({ ...c, phone: e.target.value }))
                            if (errors.phone) setErrors((c) => ({ ...c, phone: undefined }))
                          }}
                          error={errors.phone}
                        />
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="w-full mt-8 min-h-14 text-lg"
                      disabled={!form.name.trim() || !form.phone.trim()}
                      onClick={() => {
                        if (!validateForm()) {
                          showToast('Проверьте форму перед продолжением.', 'error')
                          return
                        }
                        setStep(6)
                      }}
                    >
                      Далее
                      <ArrowRight size={18} />
                    </Button>
                  </motion.div>
                ) : null}

                {/* ── Step 6: Подтверждение ── */}
                {step === 6 ? (
                  <motion.div key="step6" {...fadeSlide}>
                    <BackButton onClick={() => setStep(5)} label="Назад к данным" />
                    <h1 className="text-2xl font-semibold text-stone-900 mb-1">
                      {STEP_TITLES[6]}
                    </h1>
                    <p className="text-base text-stone-500 mb-6">
                      Всё верно? Нажмите «Записаться».
                    </p>

                    <div className="rounded-2xl border border-stone-200 overflow-hidden mb-6">
                      {[
                        selectedBranch
                          ? { icon: MapPin, label: 'Филиал', value: selectedBranch.name, sub: selectedBranch.address }
                          : null,
                        selectedInstructor
                          ? { icon: UserRound, label: 'Инструктор', value: selectedInstructor.name, sub: selectedInstructor.car ?? undefined }
                          : null,
                        selectedDate
                          ? {
                              icon: CalendarDays,
                              label: 'Дата',
                              value: (() => {
                                const day = formatDayOfWeek(selectedDate)
                                return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${formatDateFull(selectedDate)}`
                              })(),
                              sub: undefined,
                            }
                          : null,
                        selectedSlot
                          ? { icon: Clock3, label: 'Время', value: selectedSlot.time, sub: `${selectedSlot.duration} минут` }
                          : null,
                        form.name
                          ? {
                              icon: UserRound,
                              label: 'Ученик',
                              value: form.name.trim(),
                              sub: form.phone ? formatPhone(normalizePhone(form.phone)) : undefined,
                            }
                          : null,
                      ]
                        .filter(Boolean)
                        .map((row, idx, arr) => {
                          if (!row) return null
                          const Icon = row.icon
                          return (
                            <div
                              key={row.label}
                              className={`flex items-start gap-4 px-5 py-4 ${idx < arr.length - 1 ? 'border-b border-stone-100' : ''}`}
                            >
                              <div
                                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                style={{ backgroundColor: brandSoft }}
                              >
                                <Icon size={16} style={{ color: brandColor }} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-stone-400">{row.label}</p>
                                <p className="mt-0.5 text-base font-semibold text-stone-900">
                                  {row.value}
                                </p>
                                {row.sub ? (
                                  <p className="mt-0.5 text-sm text-stone-500">{row.sub}</p>
                                ) : null}
                              </div>
                            </div>
                          )
                        })}
                    </div>

                    <Button
                      size="lg"
                      className="w-full min-h-14 text-lg"
                      disabled={isSubmitting}
                      style={!isSubmitting ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
                      onClick={() => void handleSubmit()}
                    >
                      {isSubmitting ? 'Сохраняем...' : 'Записаться'}
                      {!isSubmitting ? <Check size={18} /> : null}
                    </Button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
