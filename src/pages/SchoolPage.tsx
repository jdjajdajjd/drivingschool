import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Car,
  Check,
  CircleUserRound,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { formatDuration, formatPhone, generateId, hexToRgba, pluralize } from '../lib/utils'
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
import type { Booking, Branch, Instructor, School, Slot } from '../types'
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

interface StudentProfile {
  name: string
  phone: string
  updatedAt: string
}

interface StudentLesson {
  branch: Branch | null
  instructor: Instructor | null
  slot: Slot
}

interface ResolvedStudentLesson extends StudentLesson {
  booking: Booking
}

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22 },
}

function getProfileKey(schoolId: string): string {
  return `dd:student_profile:${schoolId}`
}

function getStudentProfile(schoolId: string): StudentProfile | null {
  try {
    const raw = localStorage.getItem(getProfileKey(schoolId))
    if (!raw) return null
    const profile = JSON.parse(raw) as StudentProfile
    return profile.name && profile.phone ? profile : null
  } catch {
    return null
  }
}

function saveStudentProfile(schoolId: string, form: FormState): StudentProfile {
  const profile: StudentProfile = {
    name: form.name.trim(),
    phone: normalizePhone(form.phone),
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(getProfileKey(schoolId), JSON.stringify(profile))
  return profile
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'У'
}

function slotDateTime(slot: Slot): Date {
  return new Date(`${slot.date}T${slot.time}:00`)
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

function StudentProfileCard({
  brandColor,
  brandSoft,
  completedLessons,
  nextLesson,
  profile,
}: {
  brandColor: string
  brandSoft: string
  completedLessons: number
  nextLesson: StudentLesson | null
  profile: StudentProfile | null
}) {
  const progress = profile ? Math.min(100, Math.max(18, 24 + completedLessons * 11)) : 0

  return (
    <section className="mb-5 overflow-hidden rounded-[1.65rem] border border-stone-200 bg-white shadow-card">
      <div
        className="px-5 py-5 text-white"
        style={{
          background:
            `linear-gradient(135deg, ${brandColor} 0%, #2563eb 58%, #7c3aed 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/75">Профиль ученика</p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight">
              {profile ? profile.name : 'Запишем вас один раз'}
            </h2>
            <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-white/78">
              {profile
                ? 'Данные сохранены. Следующая запись будет быстрее.'
                : 'После первой записи имя и телефон будут подставляться автоматически.'}
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/16 text-lg font-semibold ring-1 ring-white/20">
            {profile ? initialsFromName(profile.name) : <CircleUserRound size={25} />}
          </div>
        </div>
      </div>

      <div className="grid gap-3 px-5 py-4">
        {profile ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-stone-50 px-4 py-4">
              <p className="text-sm font-medium text-stone-500">Телефон</p>
              <p className="mt-1 text-base font-semibold text-stone-900">{formatPhone(profile.phone)}</p>
            </div>
            <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: brandSoft }}>
              <p className="text-sm font-medium text-stone-500">Прогресс</p>
              <p className="mt-1 text-base font-semibold text-stone-900">{progress}% навыков</p>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-500">
                {nextLesson ? 'Ближайшее занятие' : 'Что будет в профиле'}
              </p>
              <p className="mt-1 text-base font-semibold text-stone-900">
                {nextLesson
                  ? `${formatDate(nextLesson.slot.date)}, ${nextLesson.slot.time}`
                  : 'Записи, прогресс и данные ученика'}
              </p>
              <p className="mt-1 truncate text-sm text-stone-500">
                {nextLesson
                  ? `${nextLesson.instructor?.name ?? 'Инструктор'} · ${nextLesson.branch?.name ?? 'Филиал'}`
                  : 'Так ученику не нужно каждый раз начинать с нуля.'}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
              {nextLesson ? <CalendarDays size={20} style={{ color: brandColor }} /> : <BookOpen size={20} style={{ color: brandColor }} />}
            </div>
          </div>
          {profile ? (
            <div className="mt-4 h-2 rounded-full bg-white">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: brandColor }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function StudentDashboard({
  availableSlotsCount,
  brandColor,
  branchCount,
  completedLessons,
  instructorCount,
  nextLesson,
  onStartBooking,
  profile,
}: {
  availableSlotsCount: number
  brandColor: string
  branchCount: number
  completedLessons: number
  instructorCount: number
  nextLesson: StudentLesson | null
  onStartBooking: () => void
  profile: StudentProfile | null
}) {
  const skillsDone = profile ? Math.min(15, Math.max(3, 5 + completedLessons)) : 0
  const drivingHoursLeft = profile ? Math.max(8, 32 - completedLessons * 2) : 32
  const theoryProgress = profile ? Math.min(100, 18 + completedLessons * 9) : 0

  return (
    <section className="space-y-4">
      <div className="rounded-[1.65rem] border border-stone-200 bg-white p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-500">Главное действие</p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight text-stone-900">
              Записаться на занятие
            </h2>
            <p className="mt-2 text-base leading-relaxed text-stone-500">
              Выберите филиал, инструктора, дату и время. Это займёт пару минут.
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest-50">
            <CalendarDays size={22} style={{ color: brandColor }} />
          </div>
        </div>
        <Button
          size="lg"
          className="mt-5 w-full min-h-14 text-lg"
          onClick={onStartBooking}
        >
          Записаться на занятие
          <ArrowRight size={20} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-soft">
          <p className="text-sm font-medium text-stone-500">Остаток часов</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">{drivingHoursLeft}</p>
          <p className="mt-1 text-sm text-stone-500">учебных часов</p>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-soft">
          <p className="text-sm font-medium text-stone-500">Инструкторы</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">{instructorCount}</p>
          <p className="mt-1 text-sm text-stone-500">доступно сейчас</p>
        </div>
      </div>

      <div className="rounded-[1.65rem] border border-stone-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-500">Прогресс навыков</p>
            <p className="mt-1 text-xl font-semibold text-stone-900">
              {skillsDone} из 15 навыков освоено
            </p>
          </div>
          <span className="text-xl font-semibold text-stone-900">{Math.round((skillsDone / 15) * 100)}%</span>
        </div>
        <div className="mt-4 h-2.5 rounded-full bg-stone-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.round((skillsDone / 15) * 100)}%`, backgroundColor: brandColor }}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {[
          {
            icon: Clock3,
            title: nextLesson ? 'Моя ближайшая запись' : 'Мои записи',
            text: nextLesson
              ? `${formatDate(nextLesson.slot.date)} в ${nextLesson.slot.time}`
              : 'После записи здесь появится ближайшее занятие.',
          },
          {
            icon: BookOpen,
            title: 'Теория и материалы',
            text: profile ? `Прогресс теории ${theoryProgress}%` : 'ПДД, материалы автошколы и подготовка к экзамену.',
          },
          {
            icon: MapPin,
            title: 'Расписание автошколы',
            text: `${availableSlotsCount} свободных слотов, ${branchCount} филиала`,
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="flex items-center gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-soft">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-50">
                <Icon size={21} style={{ color: brandColor }} />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-stone-900">{item.title}</p>
                <p className="mt-1 text-sm leading-snug text-stone-500">{item.text}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
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
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([])
  const [form, setForm] = useState<FormState>({ name: '', phone: '' })
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isBookingStarted, setIsBookingStarted] = useState(false)
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

  const maxSlotsPerBooking = Math.max(1, school?.maxSlotsPerBooking ?? 1)
  const canSelectMultipleSlots = maxSlotsPerBooking > 1
  const canSelectMultipleDates = canSelectMultipleSlots

  const availableSlotsByDate = useMemo(() => {
    if (!selectedInstructor) return []
    return selectedDates.map((date) => ({
      date,
      slots: getAvailableSlots(selectedInstructor.id, date, sessionId.current),
    }))
  }, [selectedDates, selectedInstructor])

  const studentStats = useMemo(() => {
    if (!school || !studentProfile) {
      return { completedLessons: 0, nextLesson: null as StudentLesson | null }
    }

    const now = new Date()
    const lessons = db.bookings
      .bySchool(school.id)
      .filter((booking) => booking.studentPhone === normalizePhone(studentProfile.phone))
      .map((booking) => {
        const slot = db.slots.byId(booking.slotId)
        if (!slot) return null
        return {
          booking,
          branch: db.branches.byId(booking.branchId),
          instructor: db.instructors.byId(booking.instructorId),
          slot,
        }
      })
      .filter((entry): entry is ResolvedStudentLesson => Boolean(entry))

    const completedLessons = lessons.filter((entry) => entry.booking.status === 'completed').length
    const nextLesson =
      lessons
        .filter((entry) => entry.booking.status === 'active' && slotDateTime(entry.slot) >= now)
        .sort((left, right) => slotDateTime(left.slot).getTime() - slotDateTime(right.slot).getTime())[0] ?? null

    return { completedLessons, nextLesson }
  }, [school, studentProfile])

  const schoolSummary = useMemo(() => {
    if (!school) {
      return { availableSlotsCount: 0, instructorCount: 0 }
    }

    return {
      availableSlotsCount: db.slots.bySchool(school.id).filter((slot) => slot.status === 'available').length,
      instructorCount: db.instructors.bySchool(school.id).filter((instructor) => instructor.isActive).length,
    }
  }, [school, branches, instructors])

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
    const profile = getStudentProfile(currentSchool.id)
    setStudentProfile(profile)
    if (profile) {
      setForm({ name: profile.name, phone: profile.phone })
      setIsEditingProfile(false)
    }
  }, [navigate, slug])

  useEffect(() => {
    if (selectedSlots.length === 0) return
    if (isSubmitting) return
    const refreshLock = () => {
      if (isFinalizingRef.current) return
      for (const selectedSlot of selectedSlots) {
        const result = acquireSlotLock(selectedSlot.id, sessionId.current)
        if (!result.ok) {
          setSelectedSlots((current) => current.filter((slot) => slot.id !== selectedSlot.id))
          if (step >= 4) setStep(4)
          showToast(result.error ?? 'Слот больше недоступен.', 'error')
          return
        }
      }
    }
    refreshLock()
    const id = window.setInterval(refreshLock, 30_000)
    return () => window.clearInterval(id)
  }, [isSubmitting, selectedSlots, showToast, step])

  useEffect(() => {
    return () => { releaseSessionLocks(sessionId.current) }
  }, [])

  function resetAfterBranch() {
    selectedSlots.forEach((slot) => releaseSlotLock(slot.id, sessionId.current))
    setSelectedInstructor(null)
    setSelectedDates([])
    setSelectedSlots([])
    setErrors({})
  }

  function resetAfterInstructor() {
    selectedSlots.forEach((slot) => releaseSlotLock(slot.id, sessionId.current))
    setSelectedDates([])
    setSelectedSlots([])
    setErrors({})
  }

  function resetAfterDate() {
    selectedSlots.forEach((slot) => releaseSlotLock(slot.id, sessionId.current))
    setSelectedSlots([])
  }

  function chooseBranch(branch: Branch): void {
    if (selectedBranch?.id !== branch.id) {
      resetAfterBranch()
      setSelectedBranch(branch)
    }
    setStep(2)
  }

  function chooseInstructor(instructor: Instructor): void {
    if (selectedInstructor?.id !== instructor.id) {
      resetAfterInstructor()
      setSelectedInstructor(instructor)
    }
    setStep(3)
  }

  function chooseDate(date: string): void {
    if (!canSelectMultipleDates) {
      resetAfterDate()
      setSelectedDates([date])
      setStep(4)
      return
    }

    setSelectedDates((current) => {
      if (current.includes(date)) {
        const next = current.filter((item) => item !== date)
        setSelectedSlots((slots) => slots.filter((slot) => slot.date !== date))
        return next
      }
      if (current.length >= maxSlotsPerBooking) {
        showToast(`Можно выбрать максимум ${pluralize(maxSlotsPerBooking, 'день', 'дня', 'дней')}.`, 'info')
        return current
      }
      return [...current, date]
    })
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
    if (selectedSlots.some((selected) => selected.id === slot.id)) {
      releaseSlotLock(slot.id, sessionId.current)
      setSelectedSlots((current) => current.filter((selected) => selected.id !== slot.id))
      return
    }

    if (!canSelectMultipleSlots && selectedSlots.length > 0) {
      selectedSlots.forEach((selected) => releaseSlotLock(selected.id, sessionId.current))
      setSelectedSlots([])
    }

    if (selectedSlots.length >= maxSlotsPerBooking) {
      showToast(`Можно выбрать максимум ${pluralize(maxSlotsPerBooking, 'занятие', 'занятия', 'занятий')}.`, 'info')
      return
    }

    const result = acquireSlotLock(slot.id, sessionId.current)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось заблокировать слот.', 'error')
      return
    }
    const freshSlot = db.slots.byId(slot.id)
    setSelectedSlots((current) => (canSelectMultipleSlots ? [...current, freshSlot ?? slot] : [freshSlot ?? slot]))
    isFinalizingRef.current = false
  }

  async function handleSubmit(): Promise<void> {
    if (!school || !selectedBranch || !selectedInstructor || selectedDates.length === 0 || selectedSlots.length === 0) {
      showToast('Сначала выберите все данные.', 'error')
      return
    }
    if (!validateForm()) {
      showToast('Проверьте имя и телефон.', 'error')
      return
    }
    isFinalizingRef.current = true
    setIsSubmitting(true)

    const createdBookings = []
    for (const slot of selectedSlots) {
      const result = createBooking({
        schoolId: school.id,
        branchId: slot.branchId,
        instructorId: slot.instructorId,
        slotId: slot.id,
        studentName: form.name,
        studentPhone: form.phone,
        sessionId: sessionId.current,
      })

      if (!result.ok || !result.booking) {
        isFinalizingRef.current = false
        setIsSubmitting(false)
        showToast(result.error ?? 'Не удалось создать запись.', 'error')
        const freshSlot = db.slots.byId(slot.id)
        if (!freshSlot || freshSlot.status === 'booked') {
          setSelectedSlots((current) => current.filter((selected) => selected.id !== slot.id))
          setStep(4)
        }
        return
      }
      createdBookings.push(result.booking)
    }

    releaseSessionLocks(sessionId.current)
    setSelectedSlots([])
    setStudentProfile(saveStudentProfile(school.id, form))
    setIsEditingProfile(false)
    showToast(
      createdBookings.length > 1
        ? `${pluralize(createdBookings.length, 'запись сохранена', 'записи сохранены', 'записей сохранено')}.`
        : 'Запись сохранена.',
      'success',
    )
    navigate(`/booking/${createdBookings[0].id}`)
  }

  function startBookingFlow(): void {
    if (school?.branchSelectionMode === 'fixed_first' && branches[0]) {
      setSelectedBranch(branches[0])
      setStep(2)
    } else {
      setStep(1)
    }
    setIsBookingStarted(true)
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
    <div className="min-h-screen bg-[#f6f7fb]">
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
              <p className="text-sm text-stone-400">{isBookingStarted ? 'Запись на занятие' : 'Профиль ученика'}</p>
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
          <StudentProfileCard
            brandColor={brandColor}
            brandSoft={brandSoft}
            completedLessons={studentStats.completedLessons}
            nextLesson={studentStats.nextLesson}
            profile={studentProfile}
          />

          {!isBookingStarted ? (
            <StudentDashboard
              availableSlotsCount={schoolSummary.availableSlotsCount}
              brandColor={brandColor}
              branchCount={branches.length}
              completedLessons={studentStats.completedLessons}
              instructorCount={schoolSummary.instructorCount}
              nextLesson={studentStats.nextLesson}
              profile={studentProfile}
              onStartBooking={startBookingFlow}
            />
          ) : (
          <>
          {/* Step card */}
          <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-[1.65rem] border border-stone-200 bg-white shadow-card sm:min-h-0">
            <StepProgress step={step} />

            <div className="px-6 pb-8 pt-4">
              <AnimatePresence mode="wait">
                {/* ── Step 1: Филиал ── */}
                {step === 1 ? (
                  <motion.div key="step1" {...fadeSlide}>
                    <BackButton onClick={() => setIsBookingStarted(false)} label="Назад в профиль" />
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
                          return (
                            <button
                              key={branch.id}
                              onClick={() => chooseBranch(branch)}
                              className="w-full rounded-2xl border-2 border-stone-200 bg-white px-5 py-5 text-left transition hover:border-forest-400 hover:bg-forest-50/40 active:scale-[0.99]"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-lg font-semibold text-stone-900 leading-snug">
                                  {branch.name}
                                </p>
                                <ArrowRight size={20} className="mt-1 shrink-0 text-stone-300" />
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
                  </motion.div>
                ) : null}

                {/* ── Step 2: Инструктор ── */}
                {step === 2 ? (
                  <motion.div key="step2" {...fadeSlide}>
                    <BackButton
                      onClick={() => {
                        if (school.branchSelectionMode === 'fixed_first') {
                          setIsBookingStarted(false)
                        } else {
                          setStep(1)
                        }
                      }}
                      label={school.branchSelectionMode === 'fixed_first' ? 'Назад в профиль' : 'Назад к филиалам'}
                    />
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
                          return (
                          <button
                            key={instructor.id}
                            onClick={() => chooseInstructor(instructor)}
                            className="w-full rounded-2xl border-2 border-stone-200 bg-white px-5 py-5 text-left transition hover:border-forest-400 hover:bg-forest-50/40 active:scale-[0.99]"
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
                              <ArrowRight size={20} className="text-stone-300 shrink-0" />
                            </div>
                          </button>
                          )
                        })}
                      </div>
                    )}
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
                      {canSelectMultipleDates
                        ? `Можно выбрать до ${pluralize(maxSlotsPerBooking, 'дня', 'дней', 'дней')} для записи.`
                        : 'Ближайшие 7 дней. Выберите удобный день.'}
                    </p>

                    <div className="space-y-2">
                      {dateOptions.map((date) => {
                        const count = selectedInstructor
                          ? getAvailableSlots(selectedInstructor.id, date, sessionId.current).length
                          : 0
                        const available = count > 0
                        const selected = selectedDates.includes(date)

                        return (
                          <button
                            key={date}
                            disabled={!available}
                            onClick={() => chooseDate(date)}
                            className={`w-full rounded-2xl border-2 px-5 py-4 text-left transition ${
                              selected
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
                                  ? selected ? 'Выбрано' : pluralize(count, 'слот', 'слота', 'слотов')
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
                      disabled={selectedDates.length === 0}
                      onClick={() => setStep(4)}
                    >
                      {canSelectMultipleDates ? 'Выбрать время' : 'Далее'}
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
                    {selectedDates.length > 0 ? (
                      <p className="text-base text-stone-500 mb-6">
                        {canSelectMultipleSlots
                          ? `Выберите до ${pluralize(maxSlotsPerBooking, 'занятия', 'занятий', 'занятий')}. Можно в один день или в разные дни.`
                          : `${formatDayOfWeek(selectedDates[0])}, ${formatDateFull(selectedDates[0])}`}
                      </p>
                    ) : null}

                    {availableSlotsByDate.every((group) => group.slots.length === 0) ? (
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
                      <div className="space-y-5">
                        {availableSlotsByDate.map((group) => (
                          group.slots.length > 0 ? (
                            <div key={group.date}>
                              <p className="mb-2 text-sm font-semibold text-stone-500 capitalize">
                                {formatDayOfWeek(group.date)}, {formatDateFull(group.date)}
                              </p>
                              <div className="grid grid-cols-3 gap-3">
                                {group.slots.map((slot) => {
                                  const active = selectedSlots.some((selected) => selected.id === slot.id)
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
                                        {formatDuration(slot.duration)}
                                      </p>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ) : null
                        ))}
                      </div>
                    )}

                    <Button
                      size="lg"
                      className="mt-6 w-full min-h-14 text-lg"
                      disabled={selectedSlots.length === 0}
                      onClick={() => setStep(5)}
                    >
                      {selectedSlots.length > 0
                        ? `Далее: ${pluralize(selectedSlots.length, 'занятие', 'занятия', 'занятий')}`
                        : 'Далее'}
                      <ArrowRight size={20} />
                    </Button>
                  </motion.div>
                ) : null}

                {/* ── Step 5: Данные ── */}
                {step === 5 ? (
                  <motion.div key="step5" {...fadeSlide}>
                    <BackButton onClick={() => setStep(4)} label="Назад к выбору времени" />
                    <h1 className="text-2xl font-semibold text-stone-900 mb-1">
                      {studentProfile && !isEditingProfile ? 'Профиль ученика' : STEP_TITLES[5]}
                    </h1>
                    <p className="text-base text-stone-500 mb-8">
                      {studentProfile && !isEditingProfile
                        ? 'Используем сохранённые данные. Их можно изменить в один клик.'
                        : 'Оставьте контакт — автошкола свяжется при необходимости.'}
                    </p>

                    {studentProfile && !isEditingProfile ? (
                      <div className="rounded-3xl border border-stone-200 bg-gradient-to-br from-white to-forest-50/70 p-5">
                        <div className="flex items-start gap-4">
                          <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-white"
                            style={{ backgroundColor: brandColor }}
                          >
                            {initialsFromName(studentProfile.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-stone-500">Продолжить как</p>
                            <p className="mt-1 text-xl font-semibold leading-tight text-stone-900">
                              {studentProfile.name}
                            </p>
                            <p className="mt-1 text-base text-stone-500">
                              {formatPhone(studentProfile.phone)}
                            </p>
                          </div>
                        </div>
                        <button
                          className="mt-5 inline-flex items-center gap-2 text-base font-medium text-forest-700"
                          onClick={() => setIsEditingProfile(true)}
                        >
                          Изменить данные
                          <ArrowRight size={17} />
                        </button>
                      </div>
                    ) : (
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

                        <div className="rounded-2xl bg-stone-50 px-4 py-4">
                          <div className="flex gap-3">
                            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-forest-700" />
                            <p className="text-sm leading-relaxed text-stone-500">
                              Сохраним данные только в этом браузере, чтобы следующая запись заняла меньше времени.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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
                        selectedDates.length > 0
                          ? {
                              icon: CalendarDays,
                              label: selectedDates.length > 1 ? 'Даты' : 'Дата',
                              value: (() => {
                                if (selectedDates.length > 1) {
                                  return selectedDates.map((date) => formatDate(date)).join(', ')
                                }
                                const day = formatDayOfWeek(selectedDates[0])
                                return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${formatDateFull(selectedDates[0])}`
                              })(),
                              sub: undefined,
                            }
                          : null,
                        selectedSlots.length > 0
                          ? {
                              icon: Clock3,
                              label: selectedSlots.length > 1 ? 'Время' : 'Время',
                              value: selectedSlots.map((slot) => `${formatDate(slot.date)} ${slot.time}`).join(', '),
                              sub: selectedSlots.length > 1
                                ? pluralize(selectedSlots.length, 'занятие', 'занятия', 'занятий')
                                : formatDuration(selectedSlots[0].duration),
                            }
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
          </>
          )}
        </motion.div>
      </main>
    </div>
  )
}
