import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  LogIn,
  LogOut,
  Phone,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { formatDuration, formatPhone, generateId, pluralize } from '../lib/utils'
import {
  acquireSlotLock,
  getAvailableSlots,
  getOrCreateStudent,
  isValidRussianPhone,
  normalizePhone,
  releaseSessionLocks,
  releaseSlotLock,
} from '../services/bookingService'
import { DRIVING_CATEGORIES } from '../services/drivingCategories'
import { getInstructorPhoto } from '../services/instructorPhotos'
import { db } from '../services/storage'
import {
  createSupabaseBooking,
  getPublicSchoolBundle,
  loginStudentInSupabase,
  requestBranchChangeInSupabase,
  updateStudentProfileInSupabase,
} from '../services/supabasePublicService'
import type { Booking, Branch, Instructor, School, Slot } from '../types'
import { formatDate, formatDateFull, formatDayOfWeek, getNext14Days, getNext7Days } from '../utils/date'

type BookingStep = 'category' | 'branch' | 'instructor' | 'date' | 'time' | 'details' | 'review' | 'profile'
type SchoolView = 'home' | 'dashboard' | 'booking' | 'schedule' | 'settings' | 'login'

interface FormState {
  name: string
  phone: string
  email: string
  password: string
  avatarUrl: string
}

interface LoginState {
  phone: string
  password: string
}

interface StudentProfile {
  name: string
  phone: string
  email: string
  avatarUrl: string
  passwordSet: boolean
  assignedBranchId?: string
  branchChangeRequestedAt?: string
  updatedAt: string
  createdByConsent: boolean
}

interface ResolvedLesson {
  booking: Booking
  slot: Slot
  branch: Branch | null
  instructor: Instructor | null
}

const stepOrder: BookingStep[] = ['category', 'branch', 'instructor', 'date', 'time', 'details', 'review', 'profile']
const emptyForm: FormState = { name: '', phone: '', email: '', password: '', avatarUrl: '' }

function getProfileKey(schoolId: string): string {
  return `dd:student_profile:${schoolId}`
}

function loadStudentProfile(schoolId: string): StudentProfile | null {
  try {
    const raw = localStorage.getItem(getProfileKey(schoolId))
    if (!raw) return null
    const profile = JSON.parse(raw) as StudentProfile
    if (!profile.createdByConsent || !profile.name || !profile.phone) return null
    return {
      ...profile,
      email: profile.email ?? '',
      avatarUrl: profile.avatarUrl ?? '',
      passwordSet: Boolean(profile.passwordSet),
    }
  } catch {
    return null
  }
}

function saveStudentProfile(schoolId: string, form: FormState, extra?: Partial<StudentProfile>): StudentProfile {
  const profile: StudentProfile = {
    name: form.name.trim(),
    phone: normalizePhone(form.phone),
    email: form.email.trim(),
    avatarUrl: form.avatarUrl.trim(),
    passwordSet: Boolean(form.password.trim() || extra?.passwordSet),
    updatedAt: new Date().toISOString(),
    createdByConsent: true,
    ...extra,
  }
  localStorage.setItem(getProfileKey(schoolId), JSON.stringify(profile))
  return profile
}

function removeStudentProfile(schoolId: string): void {
  localStorage.removeItem(getProfileKey(schoolId))
}

function isProfileComplete(profile: StudentProfile | null): boolean {
  return Boolean(profile?.name.trim() && profile.phone && profile.email.trim() && profile.passwordSet)
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'У'
}

function slotDateTime(slot: Slot): Date {
  return new Date(`${slot.date}T${slot.time}:00`)
}

function selectClassName(): string {
  return 'h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-base text-stone-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100'
}

function StepHeader({ current, total }: { current: number; total: number }) {
  return (
    <div className="border-b border-stone-100 px-5 py-4">
      <div className="flex items-center justify-between text-sm font-medium text-stone-500">
        <span>Шаг {current} из {total}</span>
        <span>{Math.round((current / total) * 100)}%</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(current / total) * 100}%` }} />
      </div>
    </div>
  )
}

function BackButton({ onClick, label = 'Назад' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="mb-5 inline-flex min-h-10 items-center gap-2 text-base font-medium text-stone-500 hover:text-stone-900">
      <ArrowLeft size={18} />
      {label}
    </button>
  )
}

function VirazhLogo({ color }: { color: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-soft ring-1 ring-stone-200">
      <div className="relative h-6 w-6">
        <div className="absolute left-0 top-0 h-6 w-2 rounded-full" style={{ backgroundColor: color }} />
        <div className="absolute left-2 top-2 h-2 w-4 rounded-full bg-stone-900" />
        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-stone-900 bg-white" />
      </div>
    </div>
  )
}

function LessonCard({ lesson }: { lesson: ResolvedLesson }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-stone-900">{formatDate(lesson.slot.date)}, {lesson.slot.time}</p>
          <p className="mt-1 text-base text-stone-600">{lesson.instructor?.name ?? 'Инструктор'}</p>
          <p className="mt-1 text-sm text-stone-500">{lesson.branch?.name ?? 'Филиал'} · {formatDuration(lesson.slot.duration)}</p>
        </div>
        <CalendarDays size={22} className="shrink-0 text-blue-600" />
      </div>
    </div>
  )
}

function SchoolHome({
  branches,
  brandColor,
  instructors,
  onLogin,
  onOpenSchedule,
  onSelectCategory,
  onStartBooking,
  school,
}: {
  branches: Branch[]
  brandColor: string
  instructors: Instructor[]
  onLogin: () => void
  onOpenSchedule: () => void
  onSelectCategory: (category: string) => void
  onStartBooking: () => void
  school: School
}) {
  const futureSlots = db.slots.bySchool(school.id)
    .filter((slot) => slot.status === 'available' && slotDateTime(slot) > new Date())
    .sort((left, right) => slotDateTime(left).getTime() - slotDateTime(right).getTime())
  const supported = new Set(instructors.flatMap((item) => item.categories ?? []))
  const visibleCategories = DRIVING_CATEGORIES.filter((category) => supported.has(category.code)).slice(0, 12)

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-card">
        <p className="text-base font-medium text-stone-500">Автошкола</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-stone-950">{school.name}</h1>
        <p className="mt-3 text-lg leading-relaxed text-stone-600">{school.description}</p>
        <div className="mt-5 grid gap-3">
          <Button size="lg" className="min-h-14 text-lg" onClick={onStartBooking}>
            Записаться
            <ArrowRight size={20} />
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" variant="secondary" className="min-h-12 text-base" onClick={onLogin}>
              <LogIn size={18} />
              Войти
            </Button>
            <Button size="lg" variant="secondary" className="min-h-12 text-base" onClick={onOpenSchedule}>
              <CalendarDays size={18} />
              Расписание
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-2xl font-semibold text-stone-900">{branches.length}</p>
          <p className="mt-1 text-sm text-stone-500">филиала</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-2xl font-semibold text-stone-900">{instructors.length}</p>
          <p className="mt-1 text-sm text-stone-500">инструкторов</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-2xl font-semibold text-stone-900">{futureSlots.length}</p>
          <p className="mt-1 text-sm text-stone-500">свободных мест</p>
        </div>
      </div>

      {visibleCategories.length > 0 ? (
        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Категории прав</h2>
              <p className="mt-1 text-base text-stone-500">Выберите категорию, если уже знаете цель обучения.</p>
            </div>
            <ShieldCheck size={23} style={{ color: brandColor }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibleCategories.map((category) => (
              <button
                key={category.code}
                onClick={() => onSelectCategory(category.code)}
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
              >
                <p className="text-lg font-semibold text-stone-900">{category.code}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-snug text-stone-500">{category.title}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-semibold text-stone-900">Филиалы</h2>
        <div className="mt-4 space-y-3">
          {branches.map((branch) => (
            <div key={branch.id} className="rounded-2xl bg-stone-50 p-4">
              <p className="text-base font-semibold text-stone-900">{branch.name}</p>
              <p className="mt-1 text-base text-stone-600">{branch.address}</p>
              {branch.phone ? <p className="mt-1 text-sm text-stone-500">{formatPhone(branch.phone)}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StudentDashboard({
  branch,
  brandColor,
  futureLessons,
  isComplete,
  onLogout,
  onOpenSchedule,
  onOpenSettings,
  onStartBooking,
  profile,
}: {
  branch: Branch | null
  brandColor: string
  futureLessons: ResolvedLesson[]
  isComplete: boolean
  onLogout: () => void
  onOpenSchedule: () => void
  onOpenSettings: () => void
  onStartBooking: () => void
  profile: StudentProfile
}) {
  const nextLesson = futureLessons[0] ?? null

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-card">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl text-2xl font-semibold text-white" style={{ backgroundColor: brandColor }}>
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" /> : initialsFromName(profile.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base text-stone-500">Кабинет ученика</p>
            <h1 className="mt-1 truncate text-2xl font-semibold text-stone-950">{profile.name}</h1>
            <p className="mt-1 text-base text-stone-600">{branch?.address ?? 'Филиал уточнит администратор'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onOpenSettings} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600">
              <Settings size={19} />
            </button>
            <button onClick={onLogout} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600">
              <LogOut size={19} />
            </button>
          </div>
        </div>

        {!isComplete ? (
          <button onClick={onOpenSettings} className="mt-5 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left">
            <p className="text-base font-semibold text-amber-950">Профиль заполнен не до конца</p>
            <p className="mt-1 text-base text-amber-800">Добавьте e-mail и пароль, чтобы входить с другого устройства.</p>
          </button>
        ) : null}

        <div className="mt-5 rounded-2xl bg-stone-50 p-4">
          <p className="text-base font-medium text-stone-500">Ближайшее занятие</p>
          {nextLesson ? (
            <>
              <p className="mt-1 text-xl font-semibold text-stone-950">{formatDate(nextLesson.slot.date)}, {nextLesson.slot.time}</p>
              <p className="mt-1 text-base text-stone-600">{nextLesson.instructor?.name ?? 'Инструктор'} · {nextLesson.branch?.name ?? 'Филиал'}</p>
            </>
          ) : (
            <p className="mt-1 text-lg font-semibold text-stone-900">Активных записей пока нет</p>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        <Button size="lg" className="min-h-14 text-lg" onClick={onStartBooking}>
          Записаться еще
          <ArrowRight size={20} />
        </Button>
        <Button size="lg" variant="secondary" className="min-h-12 text-base" onClick={onOpenSchedule}>
          <CalendarDays size={18} />
          Открыть расписание
        </Button>
      </div>

      <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-semibold text-stone-900">Мои записи</h2>
        <div className="mt-4 space-y-3">
          {futureLessons.length === 0 ? (
            <EmptyState title="Записей пока нет" description="Когда вы запишетесь на занятие, оно появится здесь." />
          ) : (
            futureLessons.map((lesson) => <LessonCard key={lesson.booking.id} lesson={lesson} />)
          )}
        </div>
      </div>
    </section>
  )
}

function ScheduleOverview({ brandColor, onBack, onSelectSlot, school }: {
  brandColor: string
  onBack: () => void
  onSelectSlot: (slot: Slot) => void
  school: School
}) {
  const [branchId, setBranchId] = useState('')
  const [category, setCategory] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const days = useMemo(() => getNext14Days(), [])
  const branches = db.branches.bySchool(school.id).filter((item) => item.isActive)
  const instructors = db.instructors.bySchool(school.id).filter((item) => item.isActive)
  const categoryOptions = DRIVING_CATEGORIES.filter((categoryItem) =>
    instructors.some((instructor) => instructor.categories?.includes(categoryItem.code)),
  )

  const visibleSlots = days.map((date) => {
    const slots = db.slots.bySchool(school.id)
      .filter((slot) => slot.date === date)
      .filter((slot) => branchId ? slot.branchId === branchId : true)
      .filter((slot) => onlyAvailable ? slot.status === 'available' : true)
      .filter((slot) => {
        if (!category) return true
        const instructor = db.instructors.byId(slot.instructorId)
        return Boolean(instructor?.categories?.includes(category))
      })
      .sort((left, right) => slotDateTime(left).getTime() - slotDateTime(right).getTime())
    return { date, slots }
  })
  const freeCount = visibleSlots.reduce((sum, group) => sum + group.slots.filter((slot) => slot.status === 'available').length, 0)

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-card">
      <BackButton onClick={onBack} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">Расписание автошколы</h1>
          <p className="mt-2 text-base leading-relaxed text-stone-600">Ближайшие две недели. Нажмите на свободное время, чтобы записаться.</p>
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-blue-700">{freeCount}</p>
          <p className="text-xs font-semibold text-blue-700/70">свободно</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={selectClassName()}>
          <option value="">Все филиалы</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className={selectClassName()}>
          <option value="">Все категории</option>
          {categoryOptions.map((item) => <option key={item.code} value={item.code}>{item.code} - {item.title}</option>)}
        </select>
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base text-stone-700">
          <input type="checkbox" checked={onlyAvailable} onChange={(event) => setOnlyAvailable(event.target.checked)} />
          Только свободные
        </label>
      </div>

      <div className="mt-5 space-y-5">
        {visibleSlots.map((group) => (
          <div key={group.date}>
            <p className="mb-2 text-base font-semibold capitalize text-stone-700">{formatDayOfWeek(group.date)}, {formatDateFull(group.date)}</p>
            {group.slots.length === 0 ? (
              <div className="rounded-2xl bg-stone-50 px-4 py-4 text-base text-stone-500">Нет подходящих мест.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {group.slots.map((slot) => {
                  const instructor = db.instructors.byId(slot.instructorId)
                  const disabled = slot.status !== 'available'
                  return (
                    <button
                      key={slot.id}
                      disabled={disabled}
                      onClick={() => onSelectSlot(slot)}
                      className="rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:border-blue-300 disabled:bg-stone-50 disabled:text-stone-400"
                    >
                      <p className="text-xl font-semibold text-stone-950">{slot.time}</p>
                      <p className="mt-1 truncate text-sm text-stone-500">{instructor?.name ?? 'Инструктор'}</p>
                      <p className="mt-1 text-xs font-semibold" style={{ color: disabled ? undefined : brandColor }}>
                        {disabled ? 'занято' : formatDuration(slot.duration)}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function LoginPanel({ errors, login, onBack, onChange, onLogin, submitting }: {
  errors: Partial<LoginState>
  login: LoginState
  onBack: () => void
  onChange: (patch: Partial<LoginState>) => void
  onLogin: () => void
  submitting: boolean
}) {
  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-card">
      <BackButton onClick={onBack} />
      <h1 className="text-2xl font-semibold text-stone-950">Вход ученика</h1>
      <p className="mt-2 text-base text-stone-600">Введите телефон и пароль, который указывали при создании кабинета.</p>
      <div className="mt-6 space-y-4">
        <Input label="Телефон" value={login.phone} error={errors.phone} placeholder="+7 (999) 123-45-67" onChange={(event) => onChange({ phone: event.target.value })} />
        <Input label="Пароль" type="password" value={login.password} error={errors.password} placeholder="Ваш пароль" onChange={(event) => onChange({ password: event.target.value })} />
        <Button size="lg" className="min-h-14 w-full text-lg" disabled={submitting} onClick={onLogin}>
          {submitting ? 'Проверяем...' : 'Войти'}
        </Button>
      </div>
    </section>
  )
}

function ProfileSettings({ branch, branchRequestNote, form, onBack, onBranchRequestNoteChange, onChange, onCopy, onRequestBranchChange, onSave, profile }: {
  branch: Branch | null
  branchRequestNote: string
  form: FormState
  onBack: () => void
  onBranchRequestNoteChange: (value: string) => void
  onChange: (patch: Partial<FormState>) => void
  onCopy: () => void
  onRequestBranchChange: () => void
  onSave: () => void
  profile: StudentProfile
}) {
  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-card">
      <BackButton onClick={onBack} label="В кабинет" />
      <h1 className="text-2xl font-semibold text-stone-950">Настройки профиля</h1>
      <p className="mt-2 text-base text-stone-600">Контакты и пароль хранятся здесь. ФИО меняйте через администратора, если в документах ошибка.</p>
      <div className="mt-6 rounded-2xl bg-stone-50 p-4">
        <p className="text-base font-semibold text-stone-900">{profile.name}</p>
        <p className="mt-1 text-base text-stone-600">{branch?.address ?? 'Филиал не закреплен'}</p>
      </div>
      <div className="mt-6 space-y-4">
        <Input label="Телефон" value={form.phone} onChange={(event) => onChange({ phone: event.target.value })} />
        <Input label="E-mail" type="email" value={form.email} onChange={(event) => onChange({ email: event.target.value })} />
        <Input label="Новый пароль" type="password" helperText="Оставьте пустым, если не хотите менять." value={form.password} onChange={(event) => onChange({ password: event.target.value })} />
        <Input label="Аватарка" placeholder="Ссылка на фото, можно оставить пустой" value={form.avatarUrl} onChange={(event) => onChange({ avatarUrl: event.target.value })} />
        <Textarea
          label="Запрос на смену филиала"
          rows={3}
          placeholder="Например: хочу заниматься ближе к дому, филиал на Ленина."
          value={branchRequestNote}
          onChange={(event) => onBranchRequestNoteChange(event.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Button size="lg" className="min-h-12 text-base" onClick={onSave}>Сохранить</Button>
          <Button size="lg" variant="secondary" className="min-h-12 text-base" onClick={onCopy}>
            <Copy size={18} />
            Скопировать доступ
          </Button>
          <Button size="lg" variant="secondary" className="min-h-12 text-base sm:col-span-2" onClick={onRequestBranchChange}>
            Запросить смену филиала
          </Button>
        </div>
      </div>
    </section>
  )
}

export function SchoolPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const sessionId = useRef(generateId('session'))
  const finalizing = useRef(false)
  const [school, setSchool] = useState<School | null>(null)
  const [missing, setMissing] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [view, setView] = useState<SchoolView>('home')
  const [step, setStep] = useState<BookingStep>('category')
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [login, setLogin] = useState<LoginState>({ phone: '', password: '' })
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [loginErrors, setLoginErrors] = useState<Partial<LoginState>>({})
  const [submitting, setSubmitting] = useState(false)
  const [profileRequiredOpen, setProfileRequiredOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([])
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)
  const [branchRequestNote, setBranchRequestNote] = useState('')

  useEffect(() => {
    if (!slug) return

    const applySchool = (nextSchool: School, nextBranches: Branch[], nextInstructors: Instructor[]) => {
      setSchool(nextSchool)
      setBranches(nextBranches.filter((branch) => branch.isActive))
      setInstructors(nextInstructors.filter((instructor) => instructor.isActive))
      const savedProfile = loadStudentProfile(nextSchool.id)
      setProfile(savedProfile)
      if (savedProfile) {
        setForm({
          name: savedProfile.name,
          phone: savedProfile.phone,
          email: savedProfile.email,
          password: '',
          avatarUrl: savedProfile.avatarUrl,
        })
        setView('dashboard')
      }
    }

    void getPublicSchoolBundle(slug)
      .then((bundle) => {
        if (!bundle) {
          const fallback = db.schools.bySlug(slug)
          if (!fallback) {
            setMissing(true)
            return
          }
          applySchool(fallback, db.branches.bySchool(fallback.id), db.instructors.bySchool(fallback.id))
          return
        }

        db.schools.upsert(bundle.school)
        bundle.branches.forEach((branch) => db.branches.upsert(branch))
        bundle.instructors.forEach((instructor) => db.instructors.upsert(instructor))
        bundle.slots.forEach((slot) => db.slots.upsert(slot))
        bundle.students.forEach((student) => db.students.upsert(student))
        bundle.bookings.forEach((booking) => db.bookings.upsert(booking))
        applySchool(bundle.school, bundle.branches, bundle.instructors)
      })
      .catch(() => {
        const fallback = db.schools.bySlug(slug)
        if (!fallback) {
          setMissing(true)
          return
        }
        applySchool(fallback, db.branches.bySchool(fallback.id), db.instructors.bySchool(fallback.id))
      })
  }, [slug])

  useEffect(() => {
    const refreshLock = () => {
      selectedSlots.forEach((slot) => acquireSlotLock(slot.id, sessionId.current))
    }
    refreshLock()
    const id = window.setInterval(refreshLock, 30_000)
    return () => {
      window.clearInterval(id)
      if (!finalizing.current) releaseSessionLocks(sessionId.current)
    }
  }, [selectedSlots])

  const brandColor = school?.primaryColor === '#1f5b43' ? '#3157C8' : (school?.primaryColor ?? '#3157C8')
  const dates = useMemo(() => getNext7Days(), [])
  const maxSlots = Math.max(1, school?.maxSlotsPerBooking ?? 1)
  const currentStep = stepOrder.indexOf(step) + 1
  const totalSteps = profile ? 7 : 8

  const profileBranch = useMemo(() => {
    if (!profile) return null
    if (profile.assignedBranchId) return db.branches.byId(profile.assignedBranchId)
    return branches[0] ?? null
  }, [branches, profile])

  const futureLessons = useMemo<ResolvedLesson[]>(() => {
    if (!school || !profile) return []
    const phone = normalizePhone(profile.phone)
    return db.bookings.bySchool(school.id)
      .filter((booking) => booking.status === 'active' && booking.studentPhone === phone)
      .map((booking) => {
        const slot = db.slots.byId(booking.slotId)
        if (!slot || slotDateTime(slot) <= new Date()) return null
        return {
          booking,
          slot,
          branch: db.branches.byId(booking.branchId),
          instructor: db.instructors.byId(booking.instructorId),
        }
      })
      .filter((item): item is ResolvedLesson => Boolean(item))
      .sort((left, right) => slotDateTime(left.slot).getTime() - slotDateTime(right.slot).getTime())
  }, [profile, school])

  const visibleInstructors = useMemo(() => {
    return instructors
      .filter((instructor) => selectedBranch ? instructor.branchId === selectedBranch.id : true)
      .filter((instructor) => selectedCategory ? instructor.categories?.includes(selectedCategory) : true)
  }, [instructors, selectedBranch, selectedCategory])

  const slotsByDate = useMemo(() => {
    if (!selectedInstructor) return []
    return selectedDates.map((date) => ({
      date,
      slots: getAvailableSlots(selectedInstructor.id, date, sessionId.current),
    }))
  }, [selectedDates, selectedInstructor])

  function resetBooking(): void {
    releaseSessionLocks(sessionId.current)
    setStep('category')
    setSelectedCategory('')
    setSelectedBranch(null)
    setSelectedInstructor(null)
    setSelectedDates([])
    setSelectedSlots([])
    setErrors({})
    setCreatedBookingId(null)
  }

  function startBooking(category = ''): void {
    if (profile && !isProfileComplete(profile)) {
      setProfileRequiredOpen(true)
      return
    }
    resetBooking()
    setSelectedCategory(category)
    setView('booking')
    if (category) setStep('branch')
  }

  function backFromBooking(): void {
    resetBooking()
    setView(profile ? 'dashboard' : 'home')
  }

  function selectSlot(slot: Slot): void {
    const active = selectedSlots.some((item) => item.id === slot.id)
    if (active) {
      releaseSlotLock(slot.id, sessionId.current)
      setSelectedSlots((current) => current.filter((item) => item.id !== slot.id))
      return
    }
    if (selectedSlots.length >= maxSlots) {
      showToast(`Можно выбрать не больше ${maxSlots}.`, 'error')
      return
    }
    const result = acquireSlotLock(slot.id, sessionId.current)
    if (!result.ok) {
      showToast(result.error ?? 'Это время уже недоступно.', 'error')
      return
    }
    const fresh = db.slots.byId(slot.id)
    setSelectedSlots((current) => [...current, fresh ?? slot].sort((left, right) => slotDateTime(left).getTime() - slotDateTime(right).getTime()))
  }

  function validateDetails(requireEmail = false): boolean {
    const next: Partial<FormState> = {}
    if (!form.name.trim()) next.name = 'Введите имя.'
    if (!isValidRussianPhone(form.phone)) next.phone = 'Введите российский номер телефона.'
    if (requireEmail && !form.email.trim()) next.email = 'Введите e-mail.'
    if (requireEmail && form.password.trim().length < 6) next.password = 'Минимум 6 символов.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submitBooking(): Promise<void> {
    if (!school || selectedSlots.length === 0 || !validateDetails()) return
    finalizing.current = true
    setSubmitting(true)
    try {
      const result = await createSupabaseBooking({
        schoolId: school.id,
        studentName: form.name,
        studentPhone: form.phone,
        slotIds: selectedSlots.map((slot) => slot.id),
      })
      const student = getOrCreateStudent(school.id, form.name, form.phone)
      selectedSlots.forEach((slot, index) => {
        const bookingId = result.bookingIds[index] ?? generateId('booking')
        const booking: Booking = {
          id: bookingId,
          bookingGroupId: result.bookingGroupId || undefined,
          schoolId: school.id,
          slotId: slot.id,
          branchId: slot.branchId,
          instructorId: slot.instructorId,
          studentId: student.id,
          studentName: student.name,
          studentPhone: student.normalizedPhone,
          studentEmail: student.email,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        db.bookings.upsert(booking)
        db.slots.upsert({ ...slot, status: 'booked', bookingId })
      })
      releaseSessionLocks(sessionId.current)
      setCreatedBookingId(result.bookingIds[0] ?? null)
      setSelectedSlots([])
      setSubmitting(false)
      finalizing.current = false
      if (profile) {
        navigate(`/booking/${result.bookingIds[0]}`)
        return
      }
      setStep('profile')
    } catch (error) {
      setSubmitting(false)
      finalizing.current = false
      showToast(error instanceof Error ? error.message : 'Не удалось создать запись.', 'error')
      setStep('time')
    }
  }

  async function createProfile(): Promise<void> {
    if (!school || !validateDetails(true)) return
    setSubmitting(true)
    try {
      const saved = saveStudentProfile(school.id, form, { passwordSet: true })
      const result = await updateStudentProfileInSupabase({
        schoolId: school.id,
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password,
        avatarUrl: form.avatarUrl,
      })
      const student = db.students.byNormalizedPhone(school.id, result.normalizedPhone)
      if (student) {
        db.students.upsert({
          ...student,
          name: form.name.trim(),
          email: form.email.trim(),
          avatarUrl: form.avatarUrl.trim() || undefined,
          hasPassword: true,
        })
      }
      setProfile(saved)
      showToast('Кабинет ученика создан.', 'success')
      if (createdBookingId) navigate(`/booking/${createdBookingId}`)
      else setView('dashboard')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить профиль.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function loginStudent(): Promise<void> {
    if (!school) return
    const next: Partial<LoginState> = {}
    if (!isValidRussianPhone(login.phone)) next.phone = 'Введите телефон.'
    if (!login.password.trim()) next.password = 'Введите пароль.'
    setLoginErrors(next)
    if (Object.keys(next).length > 0) return
    setSubmitting(true)
    try {
      const student = await loginStudentInSupabase({ schoolId: school.id, phone: login.phone, password: login.password })
      if (!student) {
        showToast('Телефон или пароль не подошли.', 'error')
        return
      }
      const saved = saveStudentProfile(school.id, {
        name: student.name,
        phone: student.phone,
        email: student.email,
        password: '',
        avatarUrl: student.avatarUrl,
      }, { assignedBranchId: student.assignedBranchId, passwordSet: true })
      setProfile(saved)
      setForm({ name: saved.name, phone: saved.phone, email: saved.email, password: '', avatarUrl: saved.avatarUrl })
      setView('dashboard')
      showToast('Вы вошли в кабинет.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось войти.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveSettings(): Promise<void> {
    if (!school || !profile) return
    if (!validateDetails(false)) return
    setSubmitting(true)
    try {
      const saved = saveStudentProfile(school.id, form, {
        assignedBranchId: profile.assignedBranchId,
        branchChangeRequestedAt: profile.branchChangeRequestedAt,
        passwordSet: profile.passwordSet || Boolean(form.password.trim()),
      })
      if (form.email.trim() && form.password.trim()) {
        await updateStudentProfileInSupabase({
          schoolId: school.id,
          name: saved.name,
          phone: saved.phone,
          email: saved.email,
          password: form.password.trim(),
          avatarUrl: saved.avatarUrl,
        })
      }
      setProfile(saved)
      showToast('Профиль сохранен.', 'success')
      setView('dashboard')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить профиль.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyCredentials(): Promise<void> {
    const loginText = normalizePhone(form.phone || profile?.phone || '')
    const password = form.password.trim()
    if (!loginText || !password) {
      showToast('Введите телефон и пароль перед копированием.', 'error')
      return
    }
    await navigator.clipboard.writeText(`Логин: ${loginText}\nПароль: ${password}`)
    showToast('Логин и пароль скопированы.', 'success')
  }

  async function requestBranchChange(): Promise<void> {
    if (!school || !profile) return
    const note = branchRequestNote.trim() || 'Прошу связаться для смены филиала.'
    await requestBranchChangeInSupabase({ schoolId: school.id, phone: profile.phone, note })
    const saved = saveStudentProfile(school.id, form, {
      ...profile,
      branchChangeRequestedAt: new Date().toISOString(),
    })
    setProfile(saved)
    setBranchRequestNote('')
    showToast('Запрос отправлен администратору.', 'success')
  }

  if (missing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <EmptyState title="Автошкола не найдена" description="Проверьте ссылку или откройте страницу автошколы Вираж." action={<Button onClick={() => navigate('/school/virazh')}>Открыть Вираж</Button>} />
      </div>
    )
  }

  if (!school) return <div className="min-h-screen bg-stone-50" />

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <button onClick={() => setView(profile ? 'dashboard' : 'home')} className="flex min-w-0 items-center gap-3 text-left">
            {school.logoUrl ? (
              <div className="h-11 w-11 overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" />
              </div>
            ) : (
              <VirazhLogo color={brandColor} />
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-stone-950">{school.name}</p>
              <p className="text-sm text-stone-500">
                {view === 'dashboard' ? 'Кабинет ученика' : view === 'booking' ? 'Запись на занятие' : view === 'schedule' ? 'Расписание' : 'Страница автошколы'}
              </p>
            </div>
          </button>
          {school.phone ? (
            <a href={`tel:${school.phone}`} className="hidden items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 sm:flex">
              <Phone size={16} />
              {formatPhone(school.phone)}
            </a>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {view === 'login' ? (
            <LoginPanel
              errors={loginErrors}
              login={login}
              onBack={() => setView('home')}
              onChange={(patch) => {
                setLogin((current) => ({ ...current, ...patch }))
                setLoginErrors({})
              }}
              onLogin={() => void loginStudent()}
              submitting={submitting}
            />
          ) : view === 'settings' && profile ? (
            <ProfileSettings
              branch={profileBranch}
              branchRequestNote={branchRequestNote}
              form={form}
              onBack={() => setView('dashboard')}
              onBranchRequestNoteChange={setBranchRequestNote}
              onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
              onCopy={() => void copyCredentials()}
              onRequestBranchChange={() => void requestBranchChange()}
              onSave={() => void saveSettings()}
              profile={profile}
            />
          ) : view === 'schedule' ? (
            <ScheduleOverview
              brandColor={brandColor}
              onBack={() => setView(profile ? 'dashboard' : 'home')}
              onSelectSlot={(slot) => {
                const instructor = db.instructors.byId(slot.instructorId)
                const branch = db.branches.byId(slot.branchId)
                setSelectedBranch(branch)
                setSelectedInstructor(instructor)
                setSelectedCategory(instructor?.categories?.[0] ?? '')
                setSelectedDates([slot.date])
                setSelectedSlots([slot])
                setView('booking')
                setStep('details')
              }}
              school={school}
            />
          ) : view === 'dashboard' && profile ? (
            <StudentDashboard
              branch={profileBranch}
              brandColor={brandColor}
              futureLessons={futureLessons}
              isComplete={isProfileComplete(profile)}
              onLogout={() => {
                removeStudentProfile(school.id)
                setProfile(null)
                setForm(emptyForm)
                setView('home')
              }}
              onOpenSchedule={() => setView('schedule')}
              onOpenSettings={() => setView('settings')}
              onStartBooking={() => startBooking()}
              profile={profile}
            />
          ) : view === 'booking' ? (
            <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-card">
              <StepHeader current={Math.min(currentStep, totalSteps)} total={totalSteps} />
              <div className="p-5">
                {step === 'category' ? (
                  <>
                    <BackButton onClick={backFromBooking} label={profile ? 'В кабинет' : 'На страницу школы'} />
                    <h1 className="text-2xl font-semibold text-stone-950">Какая категория нужна?</h1>
                    <p className="mt-2 text-base text-stone-600">Если не уверены, можно пропустить и выбрать инструктора.</p>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {DRIVING_CATEGORIES.filter((category) => instructors.some((instructor) => instructor.categories?.includes(category.code))).map((category) => (
                        <button key={category.code} onClick={() => { setSelectedCategory(category.code); setStep('branch') }} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left hover:border-blue-300 hover:bg-blue-50">
                          <p className="text-xl font-semibold text-stone-950">{category.code}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-stone-500">{category.title}</p>
                        </button>
                      ))}
                    </div>
                    <Button size="lg" variant="secondary" className="mt-4 min-h-12 w-full text-base" onClick={() => setStep('branch')}>Пропустить</Button>
                  </>
                ) : null}

                {step === 'branch' ? (
                  <>
                    <BackButton onClick={() => setStep('category')} />
                    <h1 className="text-2xl font-semibold text-stone-950">Выберите филиал</h1>
                    <div className="mt-5 space-y-3">
                      {branches.map((branch) => (
                        <button key={branch.id} onClick={() => { setSelectedBranch(branch); setSelectedInstructor(null); setStep('instructor') }} className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left hover:border-blue-300">
                          <p className="text-lg font-semibold text-stone-950">{branch.name}</p>
                          <p className="mt-1 text-base text-stone-600">{branch.address}</p>
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                {step === 'instructor' ? (
                  <>
                    <BackButton onClick={() => setStep('branch')} />
                    <h1 className="text-2xl font-semibold text-stone-950">Выберите инструктора</h1>
                    <div className="mt-5 space-y-3">
                      {visibleInstructors.length === 0 ? <EmptyState title="Инструкторов нет" description="Выберите другой филиал или категорию." /> : visibleInstructors.map((instructor) => (
                        <button key={instructor.id} onClick={() => { setSelectedInstructor(instructor); setSelectedDates([]); setSelectedSlots([]); setStep('date') }} className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left hover:border-blue-300">
                          <div className="flex items-center gap-4">
                            <Avatar
                              initials={instructor.avatarInitials}
                              color={instructor.avatarColor}
                              src={getInstructorPhoto(instructor)}
                              alt={instructor.name}
                              size="lg"
                            />
                            <div className="min-w-0">
                              <p className="text-lg font-semibold text-stone-950">{instructor.name}</p>
                              <p className="mt-1 text-base text-stone-600">{instructor.car ?? 'Автомобиль уточняется'}</p>
                              <p className="mt-1 text-sm text-stone-500">{(instructor.categories ?? []).join(', ')}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                {step === 'date' ? (
                  <>
                    <BackButton onClick={() => setStep('instructor')} />
                    <h1 className="text-2xl font-semibold text-stone-950">Выберите день</h1>
                    <div className="mt-5 space-y-3">
                      {dates.map((date) => {
                        const count = selectedInstructor ? getAvailableSlots(selectedInstructor.id, date, sessionId.current).length : 0
                        const active = selectedDates.includes(date)
                        return (
                          <button
                            key={date}
                            disabled={count === 0}
                            onClick={() => setSelectedDates(active ? selectedDates.filter((item) => item !== date) : [...selectedDates, date])}
                            className={`w-full rounded-2xl border p-4 text-left ${active ? 'border-blue-500 bg-blue-50' : 'border-stone-200 bg-white'} disabled:bg-stone-50 disabled:text-stone-400`}
                          >
                            <p className="text-lg font-semibold capitalize">{formatDayOfWeek(date)}, {formatDate(date)}</p>
                            <p className="mt-1 text-base text-stone-500">{count > 0 ? pluralize(count, 'свободное время', 'свободных времени', 'свободных времен') : 'Нет мест'}</p>
                          </button>
                        )
                      })}
                    </div>
                    <Button size="lg" className="mt-5 min-h-14 w-full text-lg" disabled={selectedDates.length === 0} onClick={() => setStep('time')}>Выбрать время</Button>
                  </>
                ) : null}

                {step === 'time' ? (
                  <>
                    <BackButton onClick={() => setStep('date')} />
                    <h1 className="text-2xl font-semibold text-stone-950">Выберите время</h1>
                    <p className="mt-2 text-base text-stone-600">Можно выбрать до {maxSlots} занятий.</p>
                    <div className="mt-5 space-y-5">
                      {slotsByDate.map((group) => (
                        <div key={group.date}>
                          <p className="mb-2 text-base font-semibold capitalize text-stone-700">{formatDayOfWeek(group.date)}, {formatDateFull(group.date)}</p>
                          <div className="grid grid-cols-3 gap-3">
                            {group.slots.map((slot) => {
                              const active = selectedSlots.some((item) => item.id === slot.id)
                              return (
                                <button key={slot.id} onClick={() => selectSlot(slot)} className={`rounded-2xl border p-4 text-center ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-stone-200 bg-white'}`}>
                                  <p className="text-xl font-semibold">{slot.time}</p>
                                  <p className="mt-1 text-xs">{formatDuration(slot.duration)}</p>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button size="lg" className="mt-5 min-h-14 w-full text-lg" disabled={selectedSlots.length === 0} onClick={() => setStep('details')}>Дальше</Button>
                  </>
                ) : null}

                {step === 'details' ? (
                  <>
                    <BackButton onClick={() => setStep('time')} />
                    <h1 className="text-2xl font-semibold text-stone-950">Ваши данные</h1>
                    <p className="mt-2 text-base text-stone-600">Для записи нужны только имя и телефон.</p>
                    <div className="mt-5 space-y-4">
                      <Input label="Имя" value={form.name} error={errors.name} placeholder="Анна Иванова" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                      <Input label="Телефон" value={form.phone} error={errors.phone} placeholder="+7 (999) 123-45-67" onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                    </div>
                    <Button size="lg" className="mt-5 min-h-14 w-full text-lg" onClick={() => validateDetails() && setStep('review')}>Проверить запись</Button>
                  </>
                ) : null}

                {step === 'review' ? (
                  <>
                    <BackButton onClick={() => setStep('details')} />
                    <h1 className="text-2xl font-semibold text-stone-950">Проверьте запись</h1>
                    <div className="mt-5 space-y-3">
                      {selectedSlots.map((slot) => {
                        const branch = db.branches.byId(slot.branchId)
                        const instructor = db.instructors.byId(slot.instructorId)
                        return (
                          <div key={slot.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                            <p className="text-lg font-semibold text-stone-950">{formatDate(slot.date)}, {slot.time}</p>
                            <p className="mt-1 text-base text-stone-600">{instructor?.name ?? 'Инструктор'} · {branch?.name ?? 'Филиал'}</p>
                          </div>
                        )
                      })}
                      <div className="rounded-2xl border border-stone-200 bg-white p-4">
                        <p className="text-base font-semibold text-stone-900">{form.name}</p>
                        <p className="mt-1 text-base text-stone-600">{formatPhone(normalizePhone(form.phone))}</p>
                      </div>
                    </div>
                    <Button size="lg" className="mt-5 min-h-14 w-full text-lg" disabled={submitting} style={!submitting ? { backgroundColor: brandColor, borderColor: brandColor } : undefined} onClick={() => void submitBooking()}>
                      {submitting ? 'Сохраняем...' : 'Записаться'}
                      {!submitting ? <Check size={18} /> : null}
                    </Button>
                  </>
                ) : null}

                {step === 'profile' ? (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <CheckCircle2 size={32} />
                    </div>
                    <h1 className="mt-5 text-center text-2xl font-semibold text-stone-950">Запись создана</h1>
                    <p className="mx-auto mt-2 max-w-md text-center text-base leading-relaxed text-stone-600">Создайте кабинет ученика, чтобы видеть свои занятия и быстрее записываться снова.</p>
                    <div className="mt-6 space-y-4">
                      <Input label="ФИО" value={form.name} error={errors.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                      <Input label="Телефон" value={form.phone} error={errors.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                      <Input label="E-mail" type="email" value={form.email} error={errors.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                      <Input label="Пароль" type="password" value={form.password} error={errors.password} helperText="Минимум 6 символов." onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
                      <Input label="Аватарка" value={form.avatarUrl} placeholder="Ссылка на фото, можно пусто" onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))} />
                    </div>
                    <div className="mt-6 grid gap-3">
                      <Button size="lg" className="min-h-14 w-full text-lg" disabled={submitting} onClick={() => void createProfile()}>Создать кабинет</Button>
                      <Button size="lg" variant="secondary" className="min-h-12 w-full text-base" onClick={() => void copyCredentials()}>
                        <Copy size={18} />
                        Скопировать логин и пароль
                      </Button>
                      <Button size="lg" variant="secondary" className="min-h-12 w-full text-base" onClick={() => createdBookingId ? navigate(`/booking/${createdBookingId}`) : setView('home')}>Готово</Button>
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          ) : (
            <SchoolHome
              branches={branches}
              brandColor={brandColor}
              instructors={instructors}
              onLogin={() => setView('login')}
              onOpenSchedule={() => setView('schedule')}
              onSelectCategory={(category) => startBooking(category)}
              onStartBooking={() => startBooking()}
              school={school}
            />
          )}
        </motion.div>
      </main>

      <Modal open={profileRequiredOpen} onClose={() => setProfileRequiredOpen(false)} title="Заполните профиль">
        <div className="space-y-4 px-6 py-5">
          <p className="text-base leading-relaxed text-stone-600">Чтобы записываться из кабинета без повторного ввода данных, добавьте e-mail и пароль.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button size="lg" className="min-h-12 text-base" onClick={() => { setProfileRequiredOpen(false); setView('settings') }}>Заполнить профиль</Button>
            <Button size="lg" variant="secondary" className="min-h-12 text-base" onClick={() => setProfileRequiredOpen(false)}>Позже</Button>
          </div>
        </div>
      </Modal>

      <div className="fixed bottom-4 left-1/2 z-20 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 rounded-3xl border border-stone-200 bg-white/95 p-2 shadow-modal backdrop-blur sm:hidden">
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setView(profile ? 'dashboard' : 'home')} className="rounded-2xl px-3 py-2 text-sm font-semibold text-stone-700">Главная</button>
          <button onClick={() => setView('schedule')} className="rounded-2xl px-3 py-2 text-sm font-semibold text-stone-700">Расписание</button>
          <button onClick={() => profile ? startBooking() : setView('login')} className="rounded-2xl px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: brandColor }}>{profile ? 'Запись' : 'Войти'}</button>
        </div>
      </div>
    </div>
  )
}
