import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  LogIn,
  LogOut,
  MapPin,
  Phone,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
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
import { getTenantTheme } from '../services/tenantTheme'
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
  pendingBranchId?: string
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

// ─── Storage ─────────────────────────────────────────────────────────────────

function getProfileKey(schoolId: string): string {
  return `dd:student_profile:${schoolId}`
}

function loadStudentProfile(schoolId: string): StudentProfile | null {
  try {
    const raw = localStorage.getItem(getProfileKey(schoolId))
    if (!raw) return null
    const profile = JSON.parse(raw) as StudentProfile
    if (!profile.createdByConsent || !profile.name || !profile.phone) return null
    return { ...profile, email: profile.email ?? '', avatarUrl: profile.avatarUrl ?? '', passwordSet: Boolean(profile.passwordSet) }
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
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'У'
}

function slotDateTime(slot: Slot): Date {
  return new Date(`${slot.date}T${slot.time}:00`)
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function getVisibleDrivingCategories(school: School, instructors: Instructor[]) {
  const supported = new Set(instructors.flatMap((i) => i.categories ?? []))
  const configured = school.enabledCategoryCodes?.length ? new Set(school.enabledCategoryCodes) : supported
  return DRIVING_CATEGORIES.filter((c) => configured.has(c.code) && supported.has(c.code))
}

async function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const size = 240
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('canvas')); return }
        const min = Math.min(img.width, img.height)
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Atoms ───────────────────────────────────────────────────────────────────

function FreeBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
      Свободно
    </span>
  )
}

function BookedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
      Вы записаны
    </span>
  )
}

function StepHeader({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="ui-kicker">Шаг {current} из {total}</span>
        <span className="rounded-lg bg-white px-2 py-1 text-xs font-black text-blue-700 shadow-sm">{pct}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white shadow-inner">
        <div
          className="h-full rounded-full bg-blue-700 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function BackButton({ onClick, label = 'Назад' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="mb-4 -ml-1 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-slate-500 transition hover:text-ink-900">
      <ArrowLeft size={15} />
      {label}
    </button>
  )
}

function VirazhLogo({ color }: { color: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="relative h-7 w-7">
        <div className="absolute inset-y-0 left-1 w-2 rounded-full" style={{ backgroundColor: color }} />
        <div className="absolute left-3 top-1.5 h-4 w-3 rounded-r-full bg-slate-900" />
        <div className="absolute bottom-1 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-white" />
      </div>
    </div>
  )
}

function LessonCard({ lesson }: { lesson: ResolvedLesson }) {
  const endTime = addMinutesToTime(lesson.slot.time, lesson.slot.duration)
  const photo = lesson.instructor ? getInstructorPhoto(lesson.instructor) : undefined
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
        {photo
          ? <img src={photo} alt={lesson.instructor?.name} className="h-full w-full object-cover" />
          : <CalendarDays size={18} className="text-blue-500" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-ink-900">{formatDate(lesson.slot.date)}, {lesson.slot.time} – {endTime}</p>
        <p className="mt-0.5 truncate text-xs text-slate-600">{lesson.instructor?.name ?? 'Инструктор'} · {lesson.branch?.name ?? 'Филиал'}</p>
      </div>
      <BookedBadge />
    </div>
  )
}

// ─── BranchChangeModal ────────────────────────────────────────────────────────

function BranchChangeModal({
  branches,
  currentBranchId,
  onClose,
  onSubmit,
  open,
}: {
  branches: Branch[]
  currentBranchId?: string
  onClose: () => void
  onSubmit: (branchId: string) => void
  open: boolean
}) {
  const [selected, setSelected] = useState(currentBranchId ?? '')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Выберите филиал</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2">
          {branches.map((branch) => {
            const active = selected === branch.id
            return (
              <button
                key={branch.id}
                onClick={() => setSelected(branch.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                  {active && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{branch.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{branch.address}</p>
                </div>
              </button>
            )
          })}
        </div>
        <div className="mt-5 grid gap-2">
          <Button size="lg" className="w-full" disabled={!selected || selected === currentBranchId} onClick={() => selected && onSubmit(selected)}>
            Подать заявку
          </Button>
          <Button variant="secondary" className="w-full" onClick={onClose}>Отмена</Button>
        </div>
      </div>
    </div>
  )
}

// ─── SchoolHome ───────────────────────────────────────────────────────────────

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
    .filter((s) => s.status === 'available' && slotDateTime(s) > new Date())
    .sort((a, b) => slotDateTime(a).getTime() - slotDateTime(b).getTime())
  const visibleCategories = getVisibleDrivingCategories(school, instructors).slice(0, 12)
  const instructorCards = instructors.slice(0, 6).map((instructor) => ({
    instructor,
    branch: branches.find((b) => b.id === instructor.branchId) ?? null,
    nextSlot: futureSlots.find((s) => s.instructorId === instructor.id) ?? null,
  }))

  return (
    <section className="space-y-5">
      {/* Hero card */}
      <div className="overflow-hidden rounded-[1.7rem] border border-slate-200/70 bg-white shadow-card">
        <div className="px-6 pb-5 pt-6">
          <div className="flex items-start gap-3">
            <VirazhLogo color={brandColor} />
            <div className="min-w-0">
              <p className="ui-kicker">Автошкола</p>
              <h1 className="mt-1 text-3xl font-black leading-tight tracking-normal text-ink-900">{school.name}</h1>
            </div>
          </div>
          {school.description ? <p className="mt-4 text-[15px] leading-relaxed text-slate-600">{school.description}</p> : null}
          <div className="mt-6 space-y-3">
            <button
              onClick={onStartBooking}
              className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.20)] transition hover:brightness-105 active:scale-[0.98]"
              style={{ backgroundColor: brandColor }}
            >
              <span className="text-base">Записаться на занятие</span>
              <ArrowRight size={18} />
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={onLogin}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                <LogIn size={16} className="text-slate-500" />
                Войти
              </button>
              <button
                onClick={onOpenSchedule}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                <CalendarDays size={16} className="text-slate-500" />
                Расписание
              </button>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-px border-t border-slate-100 bg-slate-100">
          <div className="bg-slate-50/80 py-4 text-center">
            <p className="text-xl font-black tabular-nums text-ink-900">{branches.length}</p>
            <p className="mt-0.5 text-[11px] font-bold text-slate-500">филиала</p>
          </div>
          <div className="bg-slate-50/80 py-4 text-center">
            <p className="text-xl font-black tabular-nums text-ink-900">{instructors.length}</p>
            <p className="mt-0.5 text-[11px] font-bold text-slate-500">инструкторов</p>
          </div>
          <div className="bg-slate-50/80 py-4 text-center">
            <p className="text-xl font-black tabular-nums" style={{ color: brandColor }}>{futureSlots.length}</p>
            <p className="mt-0.5 text-[11px] font-bold text-slate-500">свободных мест</p>
          </div>
        </div>
      </div>

      {/* Instructors */}
      {instructorCards.length > 0 && (
        <div className="rounded-[1.7rem] border border-slate-200/70 bg-white shadow-card">
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 className="text-lg font-black text-ink-900">Инструкторы</h2>
            <button
              onClick={onStartBooking}
              className="text-sm font-semibold"
              style={{ color: brandColor }}
            >
              Записаться →
            </button>
          </div>
          <div className="mt-4 space-y-2.5 px-4 pb-5">
            {instructorCards.map(({ branch, instructor, nextSlot }) => {
              const photo = getInstructorPhoto(instructor)
              return (
                <button
                  key={instructor.id}
                  type="button"
                  onClick={() => onSelectCategory(instructor.categories?.[0] ?? '')}
                  className="ui-card-hover flex w-full items-center gap-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3.5 text-left active:scale-[0.99]"
                >
                  <Avatar
                    initials={instructor.avatarInitials}
                    color={instructor.avatarColor}
                    src={photo}
                    alt={instructor.name}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-ink-900">{instructor.name}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-600">{instructor.car ?? 'Учебный автомобиль'} · {instructor.transmission === 'auto' ? 'автомат' : 'механика'}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      {(instructor.categories ?? []).map((cat) => (
                        <span key={cat} className="rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">{cat}</span>
                      ))}
                      {branch && <span className="truncate text-[11px] text-slate-400">{branch.name}</span>}
                    </div>
                  </div>
                  {nextSlot && (
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold text-slate-400">ближайший</p>
                      <p className="text-xs font-bold" style={{ color: brandColor }}>{formatDate(nextSlot.date)}</p>
                      <p className="text-xs text-slate-500">{nextSlot.time}</p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Categories */}
      {visibleCategories.length > 0 && (
        <div className="rounded-[1.7rem] border border-slate-200/70 bg-white px-6 py-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-ink-900">Категории прав</h2>
            <ShieldCheck size={18} style={{ color: brandColor }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visibleCategories.map((cat) => (
              <button
                key={cat.code}
                onClick={() => onSelectCategory(cat.code)}
                className="group rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-left transition hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98]"
              >
                 <p className="text-2xl font-black text-ink-900 group-hover:text-blue-700">{cat.code}</p>
                 <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-slate-600">{cat.title}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Branches */}
      <div className="rounded-[1.7rem] border border-slate-200/70 bg-white px-6 py-5 shadow-card">
        <h2 className="text-lg font-black text-ink-900">Филиалы</h2>
        <div className="mt-4 space-y-2">
          {branches.map((branch) => (
            <div key={branch.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3.5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <MapPin size={15} style={{ color: brandColor }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{branch.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{branch.address}</p>
                {branch.phone && <p className="mt-0.5 text-xs text-slate-400">{formatPhone(branch.phone)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── StudentDashboard ─────────────────────────────────────────────────────────

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
      {/* Profile card */}
      <div className="overflow-hidden rounded-[1.7rem] border border-slate-200/70 bg-white shadow-card">
        {/* Header */}
        <div className="flex items-center gap-4 px-5 pt-5">
          <div className="relative shrink-0">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-lg font-black text-white shadow-sm" style={{ backgroundColor: brandColor }}>
              {profile.avatarUrl
                ? <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                : initialsFromName(profile.name)}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="ui-kicker">Кабинет ученика</p>
            <p className="mt-0.5 truncate text-lg font-black text-ink-900">{profile.name}</p>
            {branch && <p className="mt-0.5 truncate text-xs font-medium text-slate-600"><MapPin size={10} className="mr-0.5 inline" />{branch.name}</p>}
            {profile.pendingBranchId && (
              <p className="mt-1 text-[11px] font-semibold text-amber-600">⏳ Заявка на смену филиала — ожидает подтверждения</p>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={onOpenSettings} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
              <Settings size={15} />
            </button>
            <button onClick={onLogout} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Incomplete profile warning */}
        {!isComplete && (
          <button onClick={onOpenSettings} className="mx-5 mt-4 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition hover:border-amber-300 hover:bg-amber-50/80">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">!</div>
            <div>
              <p className="text-sm font-semibold text-amber-900">Профиль не заполнен</p>
              <p className="text-xs text-amber-700">Добавьте e-mail и пароль для входа с других устройств</p>
            </div>
            <ChevronRight size={16} className="ml-auto shrink-0 text-amber-400" />
          </button>
        )}

        {/* Next lesson */}
        <div className="mx-5 mt-4 mb-5 overflow-hidden rounded-3xl shadow-[0_18px_42px_rgba(37,99,235,0.18)]" style={{ backgroundColor: brandColor }}>
          <div className="px-5 pt-5 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Ближайшее занятие</p>
            {nextLesson ? (
              <>
                <p className="mt-2 text-2xl font-black leading-tight text-white">
                  {formatDate(nextLesson.slot.date)}, {nextLesson.slot.time} – {addMinutesToTime(nextLesson.slot.time, nextLesson.slot.duration)}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  {nextLesson.instructor && (
                    <Avatar
                      initials={nextLesson.instructor.avatarInitials}
                      color="rgba(255,255,255,0.3)"
                      src={getInstructorPhoto(nextLesson.instructor)}
                      alt={nextLesson.instructor.name}
                      size="sm"
                    />
                  )}
                  <p className="text-sm font-semibold text-white/85">{nextLesson.instructor?.name ?? 'Инструктор'} · {nextLesson.branch?.name ?? 'Филиал'}</p>
                </div>
              </>
            ) : (
              <p className="mt-2 text-base font-semibold text-white/85">Нет активных записей</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-white/20 px-4 py-3.5">
            <button
              onClick={onStartBooking}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-black transition hover:bg-white/90"
              style={{ color: brandColor }}
            >
              Записаться
              <ArrowRight size={14} />
            </button>
            <button
              onClick={onOpenSchedule}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 py-3 text-sm font-bold text-white transition hover:bg-white/20"
            >
              <CalendarDays size={14} />
              Расписание
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming lessons */}
      <div className="rounded-[1.7rem] border border-slate-200/70 bg-white shadow-card">
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-lg font-black text-ink-900">Мои записи</h2>
          {futureLessons.length > 0 && (
            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ backgroundColor: `${brandColor}15`, color: brandColor }}>
              {futureLessons.length}
            </span>
          )}
        </div>
        <div className="mt-3 space-y-2 px-4 pb-5">
          {futureLessons.length === 0 ? (
            <EmptyState title="Записей пока нет" description="Когда вы запишетесь, занятия появятся здесь." />
          ) : (
            futureLessons.map((lesson) => <LessonCard key={lesson.booking.id} lesson={lesson} />)
          )}
        </div>
      </div>
    </section>
  )
}

// ─── ScheduleOverview ─────────────────────────────────────────────────────────

function ScheduleOverview({
  brandColor,
  onBack,
  onSelectSlot,
  profile,
  school,
}: {
  brandColor: string
  onBack: () => void
  onSelectSlot: (slot: Slot) => void
  profile: StudentProfile | null
  school: School
}) {
  const [branchId, setBranchId] = useState('')
  const [category, setCategory] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const days = useMemo(() => getNext14Days(), [])
  const branches = db.branches.bySchool(school.id).filter((b) => b.isActive)
  const instructors = db.instructors.bySchool(school.id).filter((i) => i.isActive)
  const categoryOptions = getVisibleDrivingCategories(school, instructors)
  const studentPhone = profile ? normalizePhone(profile.phone) : null

  const visibleSlots = days.map((date) => {
    const slots = db.slots.bySchool(school.id)
      .filter((s) => s.date === date)
      .filter((s) => branchId ? s.branchId === branchId : true)
      .filter((s) => onlyAvailable ? s.status === 'available' : true)
      .filter((s) => {
        if (!category) return true
        const ins = db.instructors.byId(s.instructorId)
        return Boolean(ins?.categories?.includes(category))
      })
      .sort((a, b) => slotDateTime(a).getTime() - slotDateTime(b).getTime())
    return { date, slots }
  }).filter((g) => g.slots.length > 0)

  const freeCount = visibleSlots.reduce((sum, g) => sum + g.slots.filter((s) => s.status === 'available').length, 0)

  function isMySlot(slot: Slot): boolean {
    if (!studentPhone) return false
    const booking = db.bookings.bySchool(school.id).find(
      (b) => b.slotId === slot.id && b.status === 'active' && b.studentPhone === studentPhone
    )
    return Boolean(booking)
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="rounded-[1.7rem] border border-slate-200/70 bg-white px-5 py-5 shadow-card">
        <BackButton onClick={onBack} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-ink-900">Расписание</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">Ближайшие 14 дней</p>
          </div>
          <div className="rounded-2xl border border-blue-100 px-4 py-3 text-center shadow-sm" style={{ backgroundColor: `${brandColor}12` }}>
            <p className="text-2xl font-black tabular-nums" style={{ color: brandColor }}>{freeCount}</p>
            <p className="text-[10px] font-bold text-slate-600">свободно</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="ui-field h-10 bg-slate-50"
            >
              <option value="">Все филиалы</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="ui-field h-10 bg-slate-50"
            >
              <option value="">Все категории</option>
              {categoryOptions.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:border-blue-200">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="h-4 w-4 rounded accent-blue-600"
            />
            <span className="text-sm font-medium text-slate-700">Только свободные</span>
          </label>
        </div>
      </div>

      {/* Slot list */}
      {visibleSlots.length === 0 ? (
        <div className="rounded-[1.7rem] border border-slate-200/70 bg-white px-5 py-10 shadow-card">
          <EmptyState title="Нет подходящих мест" description="Попробуйте изменить фильтры или выберите другой период." />
        </div>
      ) : (
        visibleSlots.map((group) => {
          const dayLabel = formatDayOfWeek(group.date)
          const dateLabel = formatDateFull(group.date)
          return (
            <div key={group.date}>
              <p className="mb-2 px-1 text-sm font-black capitalize text-ink-800">{dayLabel}, {dateLabel}</p>
              <div className="overflow-hidden rounded-[1.4rem] border border-slate-200/70 bg-white shadow-card">
                {group.slots.map((slot, idx) => {
                  const instructor = db.instructors.byId(slot.instructorId)
                  const branch = db.branches.byId(slot.branchId)
                  const free = slot.status === 'available'
                  const mine = isMySlot(slot)
                  const endTime = addMinutesToTime(slot.time, slot.duration)
                  const photo = instructor ? getInstructorPhoto(instructor) : undefined

                  return (
                    <div
                      key={slot.id}
                      className={`relative flex items-center gap-4 px-4 py-4 transition hover:bg-slate-50/80 ${idx < group.slots.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                      {/* Left accent */}
                      <div
                        className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                        style={{ backgroundColor: mine ? '#16a34a' : free ? brandColor : '#e2e8f0' }}
                      />

                      {/* Instructor photo */}
                      <div className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                        {photo
                          ? <img src={photo} alt={instructor?.name} className="h-full w-full object-cover" />
                          : <Avatar initials={instructor?.avatarInitials ?? '?'} color={instructor?.avatarColor} size="md" />}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-black text-ink-900">{slot.time} – {endTime}</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-600">{formatDuration(slot.duration)}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{instructor?.name ?? 'Инструктор'} · {branch?.name ?? 'Филиал'}</p>
                      </div>

                      {/* Status + CTA */}
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {mine ? <BookedBadge /> : free ? <FreeBadge /> : (
                          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">занято</span>
                        )}
                        {free && !mine && (
                          <button
                            onClick={() => onSelectSlot(slot)}
                            className="rounded-xl px-3.5 py-2 text-xs font-black text-white shadow-sm transition hover:brightness-105 active:scale-95"
                            style={{ backgroundColor: brandColor }}
                          >
                            Записаться
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </section>
  )
}

// ─── LoginPanel ───────────────────────────────────────────────────────────────

function LoginPanel({ errors, login, onBack, onChange, onLogin, submitting }: {
  errors: Partial<LoginState>
  login: LoginState
  onBack: () => void
  onChange: (patch: Partial<LoginState>) => void
  onLogin: () => void
  submitting: boolean
}) {
  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60">
      <div className="px-6 pt-6">
        <BackButton onClick={onBack} />
        <h1 className="text-2xl font-black text-ink-900">Вход в кабинет</h1>
        <p className="mt-1 text-sm font-medium text-slate-600">Телефон и пароль, которые указывали при создании кабинета</p>
      </div>
      <div className="space-y-4 px-6 pb-6 pt-5">
        <Input
          label="Телефон"
          value={login.phone}
          error={errors.phone}
          placeholder="+7 (999) 123-45-67"
          onChange={(e) => onChange({ phone: e.target.value })}
        />
        <Input
          label="Пароль"
          type="password"
          value={login.password}
          error={errors.password}
          placeholder="Ваш пароль"
          onChange={(e) => onChange({ password: e.target.value })}
        />
        <button
          disabled={submitting}
          onClick={onLogin}
          className="flex h-12 w-full items-center justify-center rounded-2xl text-base font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.20)] transition hover:brightness-105 disabled:opacity-50"
          style={{ backgroundColor: '#2563EB' }}
        >
          {submitting ? 'Проверяем...' : 'Войти'}
        </button>
      </div>
    </section>
  )
}

// ─── ProfileSettings ──────────────────────────────────────────────────────────

function ProfileSettings({
  branch,
  branches,
  form,
  onAvatarFile,
  onBack,
  onChange,
  onCopy,
  onOpenBranchChange,
  onSave,
  profile,
  submitting,
}: {
  branch: Branch | null
  branches: Branch[]
  form: FormState
  onAvatarFile: (file: File) => void
  onBack: () => void
  onChange: (patch: Partial<FormState>) => void
  onCopy: () => void
  onOpenBranchChange: () => void
  onSave: () => void
  profile: StudentProfile
  submitting: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <section className="space-y-4">
      {/* Avatar + profile info */}
      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60">
        <div className="px-6 pt-6">
          <BackButton onClick={onBack} label="В кабинет" />
          <h1 className="text-xl font-black text-slate-900">Настройки профиля</h1>
        </div>

        {/* Avatar upload */}
        <div className="mt-5 flex flex-col items-center pb-6">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl text-2xl font-black text-white shadow-md" style={{ backgroundColor: '#2563EB' }}>
              {form.avatarUrl
                ? <img src={form.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                : initialsFromName(profile.name)}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-800 text-white shadow-md transition hover:bg-slate-700"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarFile(f) }}
            />
          </div>
          <p className="mt-3 text-base font-bold text-slate-900">{profile.name}</p>
          <p className="mt-0.5 text-sm text-slate-500">{branch?.name ?? 'Филиал не закреплён'}</p>
          {branch?.address && <p className="mt-0.5 text-xs text-slate-400">{branch.address}</p>}
        </div>
      </div>

      {/* Branch change */}
      {branches.length > 1 && (
        <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <div className="px-6 py-5">
            <h2 className="text-sm font-bold text-slate-700">Филиал</h2>
            {profile.pendingBranchId ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">Заявка отправлена</p>
                <p className="mt-0.5 text-xs text-amber-700">Администратор рассмотрит запрос на смену филиала и свяжется с вами.</p>
              </div>
            ) : (
              <button
                onClick={onOpenBranchChange}
                className="mt-3 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">Сменить филиал</p>
                  <p className="mt-0.5 text-xs text-slate-500">Текущий: {branch?.name ?? 'не указан'}</p>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60">
        <div className="px-6 py-5">
          <h2 className="mb-4 text-sm font-bold text-slate-700">Контакты и доступ</h2>
          <div className="space-y-4">
            <Input label="Телефон" value={form.phone} onChange={(e) => onChange({ phone: e.target.value })} />
            <Input label="E-mail" type="email" value={form.email} onChange={(e) => onChange({ email: e.target.value })} />
            <Input
              label="Новый пароль"
              type="password"
              helperText="Оставьте пустым, если не хотите менять"
              value={form.password}
              onChange={(e) => onChange({ password: e.target.value })}
            />
          </div>
          <div className="mt-5 space-y-2.5">
            <button
              disabled={submitting}
              onClick={onSave}
              className="flex h-12 w-full items-center justify-center rounded-2xl text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#2563EB' }}
            >
              {submitting ? 'Сохраняем...' : 'Сохранить'}
            </button>
            <button
              onClick={onCopy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Copy size={14} />
              Скопировать логин и пароль
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── SchoolPage (main) ────────────────────────────────────────────────────────

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
  const [branchChangeOpen, setBranchChangeOpen] = useState(false)

  useEffect(() => {
    if (!slug) return
    const applySchool = (s: School, b: Branch[], ins: Instructor[]) => {
      setSchool(s)
      setBranches(b.filter((x) => x.isActive))
      setInstructors(ins.filter((x) => x.isActive))
      const saved = loadStudentProfile(s.id)
      setProfile(saved)
      if (saved) {
        setForm({ name: saved.name, phone: saved.phone, email: saved.email, password: '', avatarUrl: saved.avatarUrl })
        setView('dashboard')
      }
    }
    void getPublicSchoolBundle(slug)
      .then((bundle) => {
        if (!bundle) {
          const fb = db.schools.bySlug(slug)
          if (!fb) { setMissing(true); return }
          applySchool(fb, db.branches.bySchool(fb.id), db.instructors.bySchool(fb.id))
          return
        }
        db.schools.upsert(bundle.school)
        bundle.branches.forEach((x) => db.branches.upsert(x))
        bundle.instructors.forEach((x) => db.instructors.upsert(x))
        bundle.slots.forEach((x) => db.slots.upsert(x))
        bundle.students.forEach((x) => db.students.upsert(x))
        bundle.bookings.forEach((x) => db.bookings.upsert(x))
        applySchool(bundle.school, bundle.branches, bundle.instructors)
      })
      .catch(() => {
        const fb = db.schools.bySlug(slug ?? '')
        if (!fb) { setMissing(true); return }
        applySchool(fb, db.branches.bySchool(fb.id), db.instructors.bySchool(fb.id))
      })
  }, [slug])

  useEffect(() => {
    const refresh = () => selectedSlots.forEach((s) => acquireSlotLock(s.id, sessionId.current))
    refresh()
    const id = window.setInterval(refresh, 30_000)
    return () => { window.clearInterval(id); if (!finalizing.current) releaseSessionLocks(sessionId.current) }
  }, [selectedSlots])

  const tenantTheme = school ? getTenantTheme(school) : null
  const brandColor = tenantTheme?.primaryColor ?? '#2563EB'
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
      .filter((b) => b.status === 'active' && b.studentPhone === phone)
      .map((booking) => {
        const slot = db.slots.byId(booking.slotId)
        if (!slot || slotDateTime(slot) <= new Date()) return null
        return { booking, slot, branch: db.branches.byId(booking.branchId), instructor: db.instructors.byId(booking.instructorId) }
      })
      .filter((x): x is ResolvedLesson => Boolean(x))
      .sort((a, b) => slotDateTime(a.slot).getTime() - slotDateTime(b.slot).getTime())
  }, [profile, school])

  const visibleInstructors = useMemo(() =>
    instructors
      .filter((i) => selectedBranch ? i.branchId === selectedBranch.id : true)
      .filter((i) => selectedCategory ? i.categories?.includes(selectedCategory) : true),
    [instructors, selectedBranch, selectedCategory])

  const bookingCategoryOptions = useMemo(() =>
    school ? getVisibleDrivingCategories(school, instructors) : [],
    [instructors, school])

  const slotsByDate = useMemo(() => {
    if (!selectedInstructor) return []
    return selectedDates.map((date) => ({ date, slots: getAvailableSlots(selectedInstructor.id, date, sessionId.current) }))
  }, [selectedDates, selectedInstructor])

  function resetBooking(): void {
    releaseSessionLocks(sessionId.current)
    setStep('category'); setSelectedCategory(''); setSelectedBranch(null)
    setSelectedInstructor(null); setSelectedDates([]); setSelectedSlots([])
    setErrors({}); setCreatedBookingId(null)
  }

  function startBooking(category = ''): void {
    if (profile && !isProfileComplete(profile)) { setProfileRequiredOpen(true); return }
    resetBooking(); setSelectedCategory(category); setView('booking')
    if (category) setStep('branch')
  }

  function backFromBooking(): void {
    resetBooking(); setView(profile ? 'dashboard' : 'home')
  }

  function selectSlot(slot: Slot): void {
    const active = selectedSlots.some((s) => s.id === slot.id)
    if (active) { releaseSlotLock(slot.id, sessionId.current); setSelectedSlots((c) => c.filter((s) => s.id !== slot.id)); return }
    if (selectedSlots.length >= maxSlots) { showToast(`Можно выбрать не больше ${maxSlots}.`, 'error'); return }
    const result = acquireSlotLock(slot.id, sessionId.current)
    if (!result.ok) { showToast(result.error ?? 'Это время уже недоступно.', 'error'); return }
    const fresh = db.slots.byId(slot.id)
    setSelectedSlots((c) => [...c, fresh ?? slot].sort((a, b) => slotDateTime(a).getTime() - slotDateTime(b).getTime()))
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
    finalizing.current = true; setSubmitting(true)
    try {
      const result = await createSupabaseBooking({ schoolId: school.id, studentName: form.name, studentPhone: form.phone, slotIds: selectedSlots.map((s) => s.id) })
      const student = getOrCreateStudent(school.id, form.name, form.phone)
      selectedSlots.forEach((slot, idx) => {
        const bookingId = result.bookingIds[idx] ?? generateId('booking')
        const booking: Booking = {
          id: bookingId, bookingGroupId: result.bookingGroupId || undefined,
          schoolId: school.id, slotId: slot.id, branchId: slot.branchId, instructorId: slot.instructorId,
          studentId: student.id, studentName: student.name, studentPhone: student.normalizedPhone,
          studentEmail: student.email, status: 'active',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }
        db.bookings.upsert(booking)
        db.slots.upsert({ ...slot, status: 'booked', bookingId })
      })
      releaseSessionLocks(sessionId.current)
      setCreatedBookingId(result.bookingIds[0] ?? null); setSelectedSlots([])
      setSubmitting(false); finalizing.current = false
      if (profile) { navigate(`/booking/${result.bookingIds[0]}`); return }
      setStep('profile')
    } catch (error) {
      setSubmitting(false); finalizing.current = false
      showToast(error instanceof Error ? error.message : 'Не удалось создать запись.', 'error')
      setStep('time')
    }
  }

  async function createProfile(): Promise<void> {
    if (!school || !validateDetails(true)) return
    setSubmitting(true)
    try {
      const saved = saveStudentProfile(school.id, form, { passwordSet: true })
      const result = await updateStudentProfileInSupabase({ schoolId: school.id, name: form.name, phone: form.phone, email: form.email, password: form.password, avatarUrl: form.avatarUrl })
      const student = db.students.byNormalizedPhone(school.id, result.normalizedPhone)
      if (student) db.students.upsert({ ...student, name: form.name.trim(), email: form.email.trim(), avatarUrl: form.avatarUrl.trim() || undefined, hasPassword: true })
      setProfile(saved)
      showToast('Кабинет ученика создан.', 'success')
      if (createdBookingId) navigate(`/booking/${createdBookingId}`)
      else setView('dashboard')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить профиль.', 'error')
    } finally { setSubmitting(false) }
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
      if (!student) { showToast('Телефон или пароль не подошли.', 'error'); return }
      const saved = saveStudentProfile(school.id, { name: student.name, phone: student.phone, email: student.email, password: '', avatarUrl: student.avatarUrl }, { assignedBranchId: student.assignedBranchId, passwordSet: true })
      setProfile(saved); setForm({ name: saved.name, phone: saved.phone, email: saved.email, password: '', avatarUrl: saved.avatarUrl })
      setView('dashboard'); showToast('Вы вошли в кабинет.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось войти.', 'error')
    } finally { setSubmitting(false) }
  }

  async function saveSettings(): Promise<void> {
    if (!school || !profile || !validateDetails(false)) return
    setSubmitting(true)
    try {
      const saved = saveStudentProfile(school.id, form, { assignedBranchId: profile.assignedBranchId, pendingBranchId: profile.pendingBranchId, branchChangeRequestedAt: profile.branchChangeRequestedAt, passwordSet: profile.passwordSet || Boolean(form.password.trim()) })
      if (form.email.trim() && form.password.trim()) {
        await updateStudentProfileInSupabase({ schoolId: school.id, name: saved.name, phone: saved.phone, email: saved.email, password: form.password.trim(), avatarUrl: saved.avatarUrl })
      }
      setProfile(saved); showToast('Профиль сохранен.', 'success'); setView('dashboard')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить профиль.', 'error')
    } finally { setSubmitting(false) }
  }

  async function copyCredentials(): Promise<void> {
    const loginText = normalizePhone(form.phone || profile?.phone || '')
    const password = form.password.trim()
    if (!loginText || !password) { showToast('Введите телефон и пароль перед копированием.', 'error'); return }
    await navigator.clipboard.writeText(`Логин: ${loginText}\nПароль: ${password}`)
    showToast('Логин и пароль скопированы.', 'success')
  }

  async function handleAvatarFile(file: File): Promise<void> {
    try {
      const dataUrl = await compressAvatar(file)
      setForm((c) => ({ ...c, avatarUrl: dataUrl }))
    } catch {
      showToast('Не удалось загрузить фото.', 'error')
    }
  }

  async function submitBranchChange(branchId: string): Promise<void> {
    if (!school || !profile) return
    setBranchChangeOpen(false)
    const targetBranch = branches.find((b) => b.id === branchId)
    await requestBranchChangeInSupabase({ schoolId: school.id, phone: profile.phone, note: `Запрос на смену филиала на: ${targetBranch?.name ?? branchId}` })
    const saved = saveStudentProfile(school.id, form, { ...profile, pendingBranchId: branchId, branchChangeRequestedAt: new Date().toISOString() })
    setProfile(saved)
    showToast('Заявка отправлена. Администратор свяжется с вами.', 'success')
  }

  if (missing) {
    return (
      <div className="ui-shell flex min-h-screen items-center justify-center px-4">
        <EmptyState title="Автошкола не найдена" description="Проверьте ссылку или откройте страницу автошколы." action={<Button onClick={() => navigate('/school/virazh')}>Открыть Вираж</Button>} />
      </div>
    )
  }

  if (!school) return <div className="ui-shell" />

  return (
    <div className="ui-shell">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={() => setView(profile ? 'dashboard' : 'home')} className="flex min-w-0 items-center gap-3 text-left">
            {school.logoUrl ? (
              <div className="h-11 w-11 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" />
              </div>
            ) : <VirazhLogo color={brandColor} />}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-black text-ink-900">{school.name}</p>
              <p className="text-xs font-medium text-slate-500">
                {view === 'dashboard' ? 'Кабинет ученика' : view === 'booking' ? 'Запись на занятие' : view === 'schedule' ? 'Расписание' : view === 'settings' ? 'Настройки' : view === 'login' ? 'Вход' : 'Страница школы'}
              </p>
            </div>
          </button>
          {school.phone && (
            <a href={`tel:${school.phone}`} className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50 sm:flex">
              <Phone size={15} />
              {formatPhone(school.phone)}
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 pb-28">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

          {view === 'login' ? (
            <LoginPanel
              errors={loginErrors} login={login}
              onBack={() => setView('home')}
              onChange={(patch) => { setLogin((c) => ({ ...c, ...patch })); setLoginErrors({}) }}
              onLogin={() => void loginStudent()}
              submitting={submitting}
            />
          ) : view === 'settings' && profile ? (
            <>
              <ProfileSettings
                branch={profileBranch}
                branches={branches}
                form={form}
                onAvatarFile={(f) => void handleAvatarFile(f)}
                onBack={() => setView('dashboard')}
                onChange={(patch) => setForm((c) => ({ ...c, ...patch }))}
                onCopy={() => void copyCredentials()}
                onOpenBranchChange={() => setBranchChangeOpen(true)}
                onSave={() => void saveSettings()}
                profile={profile}
                submitting={submitting}
              />
              <BranchChangeModal
                branches={branches}
                currentBranchId={profile.assignedBranchId ?? branches[0]?.id}
                onClose={() => setBranchChangeOpen(false)}
                onSubmit={(id) => void submitBranchChange(id)}
                open={branchChangeOpen}
              />
            </>
          ) : view === 'schedule' ? (
            <ScheduleOverview
              brandColor={brandColor}
              onBack={() => setView(profile ? 'dashboard' : 'home')}
              onSelectSlot={(slot) => {
                const instructor = db.instructors.byId(slot.instructorId)
                const branch = db.branches.byId(slot.branchId)
                setSelectedBranch(branch); setSelectedInstructor(instructor)
                setSelectedCategory(instructor?.categories?.[0] ?? '')
                setSelectedDates([slot.date]); setSelectedSlots([slot])
                setView('booking'); setStep('details')
              }}
              profile={profile}
              school={school}
            />
          ) : view === 'dashboard' && profile ? (
            <StudentDashboard
              branch={profileBranch}
              brandColor={brandColor}
              futureLessons={futureLessons}
              isComplete={isProfileComplete(profile)}
              onLogout={() => { removeStudentProfile(school.id); setProfile(null); setForm(emptyForm); setView('home') }}
              onOpenSchedule={() => setView('schedule')}
              onOpenSettings={() => setView('settings')}
              onStartBooking={() => startBooking()}
              profile={profile}
            />
          ) : view === 'booking' ? (
            <section className="overflow-hidden rounded-[1.7rem] border border-slate-200/70 bg-white shadow-card">
              <StepHeader current={Math.min(currentStep, totalSteps)} total={totalSteps} />
              <div className="px-5 py-5">

                {step === 'category' && (
                  <>
                    <BackButton onClick={backFromBooking} label={profile ? 'В кабинет' : 'На главную'} />
                    <h1 className="text-2xl font-black text-ink-900">Какая категория?</h1>
                    <p className="mt-1 text-sm font-medium text-slate-600">Если не уверены — можно пропустить</p>
                    <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {bookingCategoryOptions.map((cat) => (
                        <button
                          key={cat.code}
                          onClick={() => { setSelectedCategory(cat.code); setStep('branch') }}
                          className={`group rounded-2xl border px-4 py-4 text-left transition active:scale-[0.98] ${selectedCategory === cat.code ? 'ui-selected' : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50'}`}
                        >
                          <p className="text-3xl font-black text-ink-900 group-hover:text-blue-700">{cat.code}</p>
                          <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-slate-600">{cat.title}</p>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setStep('branch')} className="mt-4 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50/50">
                      Пропустить, выберу с инструктором
                    </button>
                  </>
                )}

                {step === 'branch' && (
                  <>
                    <BackButton onClick={() => setStep('category')} />
                    <h1 className="text-2xl font-black text-ink-900">Выберите филиал</h1>
                    <div className="mt-4 space-y-2">
                      {branches.map((branch) => (
                        <button
                          key={branch.id}
                          onClick={() => { setSelectedBranch(branch); setSelectedInstructor(null); setStep('instructor') }}
                          className={`ui-card-hover flex w-full items-center gap-3 rounded-2xl border p-4 text-left active:scale-[0.99] ${selectedBranch?.id === branch.id ? 'ui-selected' : 'border-slate-200 bg-white'}`}
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                            <MapPin size={17} className="text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-ink-900">{branch.name}</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-600">{branch.address}</p>
                          </div>
                          <ChevronRight size={16} className="shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === 'instructor' && (
                  <>
                    <BackButton onClick={() => setStep('branch')} />
                    <h1 className="text-2xl font-black text-ink-900">Выберите инструктора</h1>
                    <div className="mt-4 space-y-2">
                      {visibleInstructors.length === 0
                        ? <EmptyState title="Нет инструкторов" description="Выберите другой филиал или категорию." />
                        : visibleInstructors.map((instructor) => {
                          const photo = getInstructorPhoto(instructor)
                          return (
                            <button
                              key={instructor.id}
                              onClick={() => { setSelectedInstructor(instructor); setSelectedDates([]); setSelectedSlots([]); setStep('date') }}
                              className={`ui-card-hover flex w-full items-center gap-4 rounded-2xl border p-4 text-left active:scale-[0.99] ${selectedInstructor?.id === instructor.id ? 'ui-selected' : 'border-slate-200 bg-white'}`}
                            >
                              <Avatar initials={instructor.avatarInitials} color={instructor.avatarColor} src={photo} alt={instructor.name} size="lg" />
                              <div className="min-w-0 flex-1">
                                <p className="font-black text-ink-900">{instructor.name}</p>
                                <p className="mt-0.5 text-sm font-medium text-slate-600">{instructor.car ?? 'Учебный автомобиль'}</p>
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {(instructor.categories ?? []).map((c) => (
                                    <span key={c} className="rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">{c}</span>
                                  ))}
                                </div>
                              </div>
                              <ChevronRight size={16} className="shrink-0 text-slate-400" />
                            </button>
                          )
                        })}
                    </div>
                  </>
                )}

                {step === 'date' && (
                  <>
                    <BackButton onClick={() => setStep('instructor')} />
                    <h1 className="text-2xl font-black text-ink-900">Выберите день</h1>
                    <div className="mt-4 space-y-2">
                      {dates.map((date) => {
                        const count = selectedInstructor ? getAvailableSlots(selectedInstructor.id, date, sessionId.current).length : 0
                        const active = selectedDates.includes(date)
                        return (
                          <button
                            key={date}
                            disabled={count === 0}
                            onClick={() => setSelectedDates(active ? selectedDates.filter((d) => d !== date) : [...selectedDates, date])}
                            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${active ? 'ui-selected' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60`}
                          >
                            <div>
                              <p className="font-black capitalize text-ink-900">{formatDayOfWeek(date)}, {formatDate(date)}</p>
                              <p className="mt-0.5 text-sm font-medium text-slate-600">{count > 0 ? pluralize(count, 'свободное время', 'свободных времени', 'свободных времен') : 'Нет мест'}</p>
                            </div>
                            {active && <Check size={18} className="text-blue-600" />}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      disabled={selectedDates.length === 0}
                      onClick={() => setStep('time')}
                      className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl text-base font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.20)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ backgroundColor: brandColor }}
                    >
                      Выбрать время
                    </button>
                  </>
                )}

                {step === 'time' && (
                  <>
                    <BackButton onClick={() => setStep('date')} />
                    <h1 className="text-2xl font-black text-ink-900">Выберите время</h1>
                    <p className="mt-1 text-sm font-medium text-slate-600">Можно выбрать до {maxSlots} {maxSlots === 1 ? 'занятия' : 'занятий'}</p>
                    <div className="mt-4 space-y-3">
                      {slotsByDate.map((group) => (
                        <div key={group.date}>
                          <p className="mb-2 ui-kicker capitalize">{formatDayOfWeek(group.date)}, {formatDateFull(group.date)}</p>
                          <div className="space-y-2">
                            {group.slots.map((slot) => {
                              const active = selectedSlots.some((s) => s.id === slot.id)
                              const endTime = addMinutesToTime(slot.time, slot.duration)
                              return (
                                <button
                                  key={slot.id}
                                  onClick={() => selectSlot(slot)}
                                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition active:scale-[0.99] ${active ? 'ui-selected' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'}`}
                                  >
                                    <div>
                                      <p className="text-xl font-black text-ink-900">{slot.time} – {endTime}</p>
                                      <p className="mt-0.5 text-sm font-medium text-slate-600">{formatDuration(slot.duration)}</p>
                                    </div>
                                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${active ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                                    {active && <Check size={13} className="text-white" strokeWidth={3} />}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      disabled={selectedSlots.length === 0}
                      onClick={() => setStep('details')}
                      className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl text-base font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.20)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ backgroundColor: brandColor }}
                    >
                      Продолжить
                      {selectedSlots.length > 0 && <span className="ml-2 rounded-full bg-white/30 px-2 py-0.5 text-sm">{selectedSlots.length}</span>}
                    </button>
                  </>
                )}

                {step === 'details' && (
                  <>
                    <BackButton onClick={() => setStep('time')} />
                    <h1 className="text-2xl font-black text-ink-900">Ваши данные</h1>
                    <p className="mt-1 text-sm font-medium text-slate-600">Только имя и телефон — этого достаточно для записи</p>
                    <div className="mt-5 space-y-4">
                      <Input label="Имя" value={form.name} error={errors.name} placeholder="Анна Иванова" onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
                      <Input label="Телефон" value={form.phone} error={errors.phone} placeholder="+7 (999) 123-45-67" onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
                    </div>
                    <button
                      onClick={() => validateDetails() && setStep('review')}
                      className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl text-base font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.20)] transition hover:brightness-105"
                      style={{ backgroundColor: brandColor }}
                    >
                      Проверить запись
                    </button>
                  </>
                )}

                {step === 'review' && (
                  <>
                    <BackButton onClick={() => setStep('details')} />
                    <h1 className="text-2xl font-black text-ink-900">Всё верно?</h1>
                    <div className="mt-4 space-y-3">
                      {selectedSlots.map((slot) => {
                        const b = db.branches.byId(slot.branchId)
                        const ins = db.instructors.byId(slot.instructorId)
                        const endTime = addMinutesToTime(slot.time, slot.duration)
                        return (
                          <div key={slot.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                                <Clock size={16} className="text-blue-600" />
                              </div>
                              <div>
                                <p className="font-black text-ink-900">{slot.time} – {endTime}</p>
                                <p className="text-sm font-medium text-slate-600">{formatDate(slot.date)}</p>
                              </div>
                            </div>
                            <div className="px-4 py-3">
                              <p className="text-sm font-bold text-slate-800">{ins?.name ?? 'Инструктор'}</p>
                              <p className="mt-0.5 text-xs text-slate-400">{b?.name ?? 'Филиал'} · {formatDuration(slot.duration)}</p>
                            </div>
                          </div>
                        )
                      })}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5">
                        <p className="font-black text-ink-900">{form.name}</p>
                        <p className="mt-0.5 text-sm text-slate-500">{formatPhone(normalizePhone(form.phone))}</p>
                      </div>
                    </div>
                    <button
                      disabled={submitting}
                      onClick={() => void submitBooking()}
                      className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.20)] transition hover:brightness-105 disabled:opacity-50"
                      style={{ backgroundColor: brandColor }}
                    >
                      {submitting ? 'Записываем...' : (<><Check size={18} strokeWidth={3} /> Записаться</>)}
                    </button>
                  </>
                )}

                {step === 'profile' && (
                  <>
                    <div className="flex flex-col items-center pb-2 pt-2">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50">
                        <CheckCircle2 size={32} className="text-emerald-600" />
                      </div>
                      <h1 className="mt-4 text-center text-2xl font-black text-ink-900">Вы записаны!</h1>
                      <p className="mt-1 max-w-xs text-center text-sm font-medium leading-relaxed text-slate-600">
                        Создайте кабинет — управляйте записями и входите быстро в следующий раз
                      </p>
                    </div>
                    <div className="mt-5 space-y-4">
                      <Input label="ФИО" value={form.name} error={errors.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
                      <Input label="Телефон" value={form.phone} error={errors.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
                      <Input label="E-mail" type="email" value={form.email} error={errors.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
                      <Input label="Пароль" type="password" helperText="Минимум 6 символов" value={form.password} error={errors.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} />
                    </div>
                    <div className="mt-5 space-y-2.5">
                      <button
                        disabled={submitting}
                        onClick={() => void createProfile()}
                        className="flex h-12 w-full items-center justify-center rounded-2xl text-base font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.20)] transition hover:brightness-105 disabled:opacity-50"
                        style={{ backgroundColor: brandColor }}
                      >
                        {submitting ? 'Создаём...' : 'Создать кабинет'}
                      </button>
                      <button
                        onClick={() => void copyCredentials()}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/50"
                      >
                        <Copy size={14} />
                        Скопировать данные для входа
                      </button>
                      <button
                        onClick={() => createdBookingId ? navigate(`/booking/${createdBookingId}`) : setView('home')}
                        className="flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-500 transition hover:bg-slate-50"
                      >
                        Пропустить
                      </button>
                    </div>
                  </>
                )}

              </div>
            </section>
          ) : (
            <SchoolHome
              branches={branches}
              brandColor={brandColor}
              instructors={instructors}
              onLogin={() => setView('login')}
              onOpenSchedule={() => setView('schedule')}
              onSelectCategory={(cat) => startBooking(cat)}
              onStartBooking={() => startBooking()}
              school={school}
            />
          )}
        </motion.div>
      </main>

      {/* Profile required modal */}
      <Modal open={profileRequiredOpen} onClose={() => setProfileRequiredOpen(false)} title="Заполните профиль">
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-slate-600">Чтобы записываться из кабинета, добавьте e-mail и пароль.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button size="lg" onClick={() => { setProfileRequiredOpen(false); setView('settings') }}>Заполнить</Button>
            <Button variant="secondary" size="lg" onClick={() => setProfileRequiredOpen(false)}>Позже</Button>
          </div>
        </div>
      </Modal>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-2xl items-center px-2">
          <button
            onClick={() => setView(profile ? 'dashboard' : 'home')}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-bold transition ${(view === 'home' || view === 'dashboard') ? 'text-blue-700' : 'text-slate-400'}`}
          >
            <div className={`rounded-xl p-1.5 ${(view === 'home' || view === 'dashboard') ? 'bg-blue-50' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            Главная
          </button>
          <button
            onClick={() => setView('schedule')}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-bold transition ${view === 'schedule' ? 'text-blue-700' : 'text-slate-400'}`}
          >
            <div className={`rounded-xl p-1.5 ${view === 'schedule' ? 'bg-blue-50' : ''}`}>
              <CalendarDays size={20} />
            </div>
            Расписание
          </button>
          <div className="flex flex-1 items-center justify-center py-2">
            <button
              onClick={() => profile ? startBooking() : setView('login')}
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[0_14px_30px_rgba(37,99,235,0.25)] transition hover:brightness-105 active:scale-95"
              style={{ backgroundColor: brandColor }}
            >
              {profile ? <ArrowRight size={20} /> : <LogIn size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
