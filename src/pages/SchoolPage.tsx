import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleUserRound,
  Copy,
  Clock3,
  AlertTriangle,
  Bike,
  Bus,
  Car,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Settings,
  Truck,
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
  getAvailableSlots,
  isValidRussianPhone,
  normalizePhone,
  releaseSessionLocks,
  releaseSlotLock,
} from '../services/bookingService'
import { db } from '../services/storage'
import {
  createSupabaseBooking,
  getPublicSchoolBundle,
  loginStudentInSupabase,
  requestBranchChangeInSupabase,
  updateStudentProfileInSupabase,
} from '../services/supabasePublicService'
import { DRIVING_CATEGORIES, type DrivingCategoryInfo } from '../services/drivingCategories'
import type { Booking, Branch, Instructor, School, Slot } from '../types'
import { formatDate, formatDateFull, formatDayOfWeek, getNext14Days, getNext7Days } from '../utils/date'

type BookingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

const STEP_TITLES: Record<BookingStep, string> = {
  1: 'Выберите филиал',
  2: 'Выберите инструктора',
  3: 'Выберите дату',
  4: 'Выберите время',
  5: 'Ваши данные',
  6: 'Проверьте запись',
  7: 'Создать профиль?',
}

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
    return profile.name && profile.phone && profile.createdByConsent ? {
      ...profile,
      email: profile.email ?? '',
      avatarUrl: profile.avatarUrl ?? '',
      passwordSet: Boolean(profile.passwordSet),
    } : null
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
  return Boolean(profile?.name?.trim() && profile.phone && profile.email?.trim() && profile.passwordSet)
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
  branch,
  futureLessons,
  isComplete,
  nextLesson,
  onLogout,
  onOpenSettings,
  profile,
}: {
  brandColor: string
  branch: Branch | null
  futureLessons: ResolvedStudentLesson[]
  isComplete: boolean
  nextLesson: StudentLesson | null
  onLogout: () => void
  onOpenSettings: () => void
  profile: StudentProfile
}) {
  const avatar = profile.avatarUrl.trim()

  return (
    <section className="mb-5 overflow-hidden rounded-[1.65rem] border border-stone-200 bg-white shadow-card">
      <div className="relative overflow-hidden px-5 py-5 text-white" style={{ background: `linear-gradient(135deg, ${brandColor} 0%, #2563eb 58%, #111827 100%)` }}>
        <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-36 w-36 rounded-full bg-cyan-200/15" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] bg-white/16 text-2xl font-semibold ring-1 ring-white/25">
            {avatar ? (
              <img src={avatar} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              initialsFromName(profile.name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white/72">Профиль ученика</p>
            <h2 className="mt-1 truncate text-2xl font-semibold leading-tight">{profile.name}</h2>
            <p className="mt-2 truncate text-sm text-white/78">
              {branch?.address ?? 'Филиал уточнит администратор'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={onOpenSettings}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/14 ring-1 ring-white/20 transition hover:bg-white/20"
              aria-label="Настройки профиля"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={onLogout}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/14 ring-1 ring-white/20 transition hover:bg-white/20"
              aria-label="Выйти из профиля"
            >
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 px-5 py-4">
        {!isComplete ? (
          <button
            onClick={onOpenSettings}
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-red-900 transition hover:bg-red-100"
          >
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <span>
              <span className="block text-sm font-semibold">Профиль заполнен не до конца</span>
              <span className="mt-0.5 block text-sm text-red-700">Заполните e-mail и пароль, чтобы записываться без повторного ввода данных.</span>
            </span>
          </button>
        ) : null}
        <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-500">Ближайшая запись</p>
              <p className="mt-1 text-base font-semibold text-stone-900">
                {nextLesson ? formatDate(nextLesson.slot.date) + ', ' + nextLesson.slot.time : 'Пока нет активных записей'}
              </p>
              <p className="mt-1 truncate text-sm text-stone-500">
                {nextLesson
                  ? (nextLesson.instructor?.name ?? 'Инструктор') + ' · ' + (nextLesson.branch?.name ?? 'Филиал')
                  : 'Нажмите "Записаться на занятие", когда будете готовы.'}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
              <CalendarDays size={20} style={{ color: brandColor }} />
            </div>
          </div>
        </div>
        {futureLessons.length > 1 ? (
          <div className="rounded-2xl border border-stone-100 bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-900">Ближайшие занятия</p>
                <p className="mt-0.5 text-sm text-stone-500">
                  {pluralize(futureLessons.length, 'активная запись', 'активные записи', 'активных записей')}
                </p>
              </div>
              <CalendarDays size={20} style={{ color: brandColor }} />
            </div>
            <div className="mt-3 space-y-2">
              {futureLessons.slice(0, 4).map((lesson) => (
                <div key={lesson.booking.id} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900">
                      {formatDate(lesson.slot.date)}, {lesson.slot.time}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      {(lesson.instructor?.name ?? 'Инструктор') + ' · ' + (lesson.branch?.name ?? 'Филиал')}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-stone-500">
                    {formatDuration(lesson.slot.duration)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function StudentDashboard({
  availableSlotsCount,
  brandColor,
  futureLessons,
  nextLesson,
  onOpenSchedule,
  onStartBooking,
}: {
  availableSlotsCount: number
  brandColor: string
  futureLessons: ResolvedStudentLesson[]
  nextLesson: StudentLesson | null
  onOpenSchedule: () => void
  onStartBooking: () => void
}) {
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
              Выберите удобный день и время. Имя и телефон уже подставятся из профиля.
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

      <div className="grid gap-3">
        {futureLessons.length > 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-stone-900">Мои ближайшие занятия</p>
                <p className="mt-1 text-sm text-stone-500">
                  Показываем только реальные активные записи.
                </p>
              </div>
              <Clock3 size={21} style={{ color: brandColor }} />
            </div>
            <div className="mt-4 space-y-2">
              {futureLessons.slice(0, 5).map((lesson) => (
                <div key={lesson.booking.id} className="rounded-2xl bg-stone-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-stone-900">
                      {formatDate(lesson.slot.date)} в {lesson.slot.time}
                    </p>
                    <p className="shrink-0 text-xs font-semibold text-stone-500">
                      {formatDuration(lesson.slot.duration)}
                    </p>
                  </div>
                  <p className="mt-1 truncate text-sm text-stone-500">
                    {(lesson.instructor?.name ?? 'Инструктор') + ' · ' + (lesson.branch?.name ?? 'Филиал')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {[
          {
            icon: Clock3,
            title: nextLesson ? 'Моя ближайшая запись' : 'Мои записи',
            text: nextLesson
              ? formatDate(nextLesson.slot.date) + ' в ' + nextLesson.slot.time
              : 'После записи здесь появится ближайшее занятие.',
          },
          {
            icon: MapPin,
            title: 'Расписание автошколы',
            text: availableSlotsCount > 0
              ? pluralize(availableSlotsCount, 'свободное место', 'свободных места', 'свободных мест') + ' в ближайшие дни.'
              : 'Свободных мест пока нет.',
            onClick: onOpenSchedule,
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.title}
              onClick={item.onClick}
              className="flex w-full items-center gap-4 rounded-3xl border border-stone-200 bg-white p-4 text-left shadow-soft transition hover:border-stone-300 active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-50">
                <Icon size={21} style={{ color: brandColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-stone-900">{item.title}</p>
                <p className="mt-1 text-sm leading-snug text-stone-500">{item.text}</p>
              </div>
              {item.onClick ? <ArrowRight size={18} className="shrink-0 text-stone-300" /> : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ScheduleOverview({
  brandColor,
  onBack,
  school,
}: {
  brandColor: string
  onBack: () => void
  school: School
}) {
  const days = useMemo(() => getNext14Days(), [])
  const slotsByDate = useMemo(
    () =>
      days.map((date) => ({
        date,
        slots: db.slots
          .bySchool(school.id)
          .filter((slot) => slot.date === date)
          .sort((left, right) => left.time.localeCompare(right.time)),
      })),
    [days, school.id],
  )

  return (
    <section className="rounded-[1.65rem] border border-stone-200 bg-white p-5 shadow-card">
      <BackButton onClick={onBack} label="Назад в профиль" />
      <h1 className="text-2xl font-semibold text-stone-900">Расписание автошколы</h1>
      <p className="mt-2 text-base leading-relaxed text-stone-500">
        Ближайшие две недели. Зеленым отмечены свободные занятия, серым - уже занятые.
      </p>

      <div className="mt-6 space-y-4">
        {slotsByDate.map((group) => (
          <div key={group.date} className="rounded-2xl border border-stone-200 p-4">
            <div>
              <p className="text-base font-semibold capitalize text-stone-900">
                {formatDayOfWeek(group.date)}, {formatDateFull(group.date)}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {group.slots.length > 0
                  ? pluralize(group.slots.length, 'слот', 'слота', 'слотов')
                  : 'Нет занятий'}
              </p>
            </div>

            {group.slots.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {group.slots.map((slot) => {
                  const available = slot.status === 'available'
                  return (
                    <div
                      key={slot.id}
                      className={
                        'rounded-xl border px-3 py-3 ' +
                        (available ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-stone-50')
                      }
                    >
                      <p className="text-base font-semibold text-stone-900">{slot.time}</p>
                      <p className={'mt-1 text-sm ' + (available ? 'text-emerald-700' : 'text-stone-500')}>
                        {available ? 'Свободно' : 'Занято'}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">{formatDuration(slot.duration)}</p>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <Button
        size="lg"
        className="mt-6 w-full min-h-14 text-lg"
        style={{ backgroundColor: brandColor, borderColor: brandColor }}
        onClick={onBack}
      >
        Понятно
      </Button>
    </section>
  )
}

function ProfileSettingsPanel({
  branch,
  brandColor,
  form,
  onBack,
  onChange,
  onCopyCredentials,
  onRequestBranchChange,
  onSave,
  profile,
}: {
  branch: Branch | null
  brandColor: string
  form: FormState
  onBack: () => void
  onChange: (patch: Partial<FormState>) => void
  onCopyCredentials: () => void
  onRequestBranchChange: () => void
  onSave: () => void
  profile: StudentProfile | null
}) {
  const complete = isProfileComplete(profile)

  return (
    <section className="rounded-[1.65rem] border border-stone-200 bg-white p-5 shadow-card">
      <BackButton onClick={onBack} label="Назад в профиль" />
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Настройки профиля</h1>
          <p className="mt-2 text-base leading-relaxed text-stone-500">
            Заполните данные один раз. Потом запись будет быстрее, а профиль станет вашим личным кабинетом.
          </p>
        </div>
      </div>

      {!complete ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          Перед записью заполните ФИО, телефон, e-mail и пароль. Так автошкола сможет найти ваш профиль, а вы сможете войти снова.
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        <Input
          label="ФИО"
          placeholder="Анна Иванова"
          disabled={Boolean(profile)}
          helperText={profile ? 'ФИО меняет администратор автошколы.' : undefined}
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <Input
          label="Телефон"
          placeholder="+7 (999) 123-45-67"
          value={form.phone}
          onChange={(event) => onChange({ phone: event.target.value })}
        />
        <Input
          label="E-mail"
          type="email"
          placeholder="name@example.ru"
          value={form.email}
          onChange={(event) => onChange({ email: event.target.value })}
        />
        <Input
          label={profile?.passwordSet ? 'Новый пароль' : 'Пароль'}
          type="password"
          placeholder={profile?.passwordSet ? 'Оставьте пустым, если не меняете' : 'Минимум 6 символов'}
          value={form.password}
          onChange={(event) => onChange({ password: event.target.value })}
        />
        <Input
          label="Аватарка"
          placeholder="Ссылка на фото"
          helperText="Пока используем ссылку на изображение. Загрузку файла подключим позже."
          value={form.avatarUrl}
          onChange={(event) => onChange({ avatarUrl: event.target.value })}
        />

        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
          <div className="flex items-start gap-3">
            <MapPin size={20} className="mt-0.5 shrink-0 text-blue-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-500">Филиал</p>
              <p className="mt-1 text-base font-semibold text-stone-900">
                {branch?.name ?? 'Филиал пока не закреплён'}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {branch?.address ?? 'Если нужен другой филиал, отправьте запрос администратору.'}
              </p>
              <button
                className="mt-3 text-sm font-semibold text-blue-700"
                onClick={onRequestBranchChange}
                type="button"
              >
                Запросить смену филиала
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Button
          size="lg"
          className="w-full min-h-14 text-lg"
          style={{ backgroundColor: brandColor, borderColor: brandColor }}
          onClick={onSave}
        >
          Сохранить профиль
          <Check size={18} />
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="w-full min-h-14 text-lg"
          onClick={onCopyCredentials}
        >
          <Copy size={18} />
          Скопировать логин и пароль
        </Button>
      </div>
    </section>
  )
}

function StudentLoginPanel({
  brandColor,
  errors,
  login,
  onBack,
  onChange,
  onLogin,
  isSubmitting,
}: {
  brandColor: string
  errors: Partial<LoginState>
  login: LoginState
  onBack: () => void
  onChange: (patch: Partial<LoginState>) => void
  onLogin: () => void
  isSubmitting: boolean
}) {
  return (
    <section className="rounded-[1.65rem] border border-stone-200 bg-white p-6 shadow-card">
      <BackButton onClick={onBack} label="Назад к записи" />
      <div
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-soft"
        style={{ background: `linear-gradient(135deg, ${brandColor}, #2563eb)` }}
      >
        <LockKeyhole size={24} />
      </div>
      <h1 className="text-2xl font-semibold text-stone-900">Войти в профиль</h1>
      <p className="mt-2 text-base leading-relaxed text-stone-500">
        Если вы уже создавали профиль, введите телефон и пароль. Сайт откроет личный кабинет без повторного ввода данных.
      </p>

      <div className="mt-7 space-y-4">
        <Input
          label="Телефон"
          placeholder="+7 (999) 123-45-67"
          value={login.phone}
          error={errors.phone}
          onChange={(event) => onChange({ phone: event.target.value })}
        />
        <Input
          label="Пароль"
          type="password"
          placeholder="Ваш пароль"
          value={login.password}
          error={errors.password}
          onChange={(event) => onChange({ password: event.target.value })}
        />
      </div>

      <Button
        size="lg"
        className="mt-7 w-full min-h-14 text-lg"
        style={{ backgroundColor: brandColor, borderColor: brandColor }}
        onClick={onLogin}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Проверяем...' : 'Войти'}
        <ArrowRight size={20} />
      </Button>
    </section>
  )
}

function ProfileRequiredDialog({
  onClose,
  onOpenSettings,
}: {
  onClose: () => void
  onOpenSettings: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/35 px-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-sm rounded-[1.5rem] border border-red-100 bg-white p-5 shadow-2xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle size={24} />
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-stone-900">Заполните профиль</h2>
        <p className="mt-2 text-base leading-relaxed text-stone-500">
          Перед записью нужны e-mail и пароль. Так автошкола сможет связать запись с вашим профилем, а вы потом войдёте без повторного ввода данных.
        </p>
        <div className="mt-6 space-y-3">
          <Button size="lg" className="w-full min-h-14 text-lg" onClick={onOpenSettings}>
            Заполнить профиль
            <ArrowRight size={20} />
          </Button>
          <Button size="lg" variant="secondary" className="w-full min-h-14 text-lg" onClick={onClose}>
            Позже
          </Button>
        </div>
      </motion.div>
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

function VirazhLogo({ color }: { color: string }) {
  return (
    <div
      className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-soft ring-1 ring-black/5"
      style={{ background: `linear-gradient(145deg, ${color}, #1d4ed8)` }}
    >
      <div className="absolute inset-x-2 top-2 h-px bg-white/30" />
      <div className="absolute inset-x-2 bottom-2 h-px bg-white/20" />
      <div className="relative h-7 w-7">
        <div className="absolute left-[3px] top-0 h-7 w-2 origin-top rounded-full bg-white shadow-sm [transform:skewX(-23deg)]" />
        <div className="absolute right-[3px] top-0 h-7 w-2 origin-top rounded-full bg-white/95 shadow-sm [transform:skewX(23deg)]" />
        <div className="absolute left-[11px] top-[8px] h-4 w-[3px] rounded-full bg-blue-600/80" />
      </div>
    </div>
  )
}

function categoryIcon(category: DrivingCategoryInfo) {
  if (category.group === 'moto') return Bike
  if (category.group === 'truck') return Truck
  if (category.group === 'bus' || category.group === 'special') return Bus
  return Car
}

function PublicSchoolHome({
  brandColor,
  branches,
  instructors,
  onLogin,
  onOpenSchedule,
  onStartBooking,
  school,
}: {
  brandColor: string
  branches: Branch[]
  instructors: Instructor[]
  onLogin: () => void
  onOpenSchedule: () => void
  onStartBooking: () => void
  school: School
}) {
  const supportedCategoryCodes = useMemo(
    () => new Set(instructors.flatMap((instructor) => instructor.categories ?? [])),
    [instructors],
  )
  const supportedCategories = DRIVING_CATEGORIES.filter((category) => supportedCategoryCodes.has(category.code))
  const futureSlots = db.slots
    .bySchool(school.id)
    .filter((slot) => slot.status === 'available' && slotDateTime(slot) >= new Date())
    .sort((left, right) => slotDateTime(left).getTime() - slotDateTime(right).getTime())
  const nextSlot = futureSlots[0] ?? null
  const activeInstructors = instructors.filter((instructor) => instructor.isActive)

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[1.65rem] border border-stone-200 bg-white shadow-card">
        <div className="relative px-5 pb-6 pt-6 text-white" style={{ background: `linear-gradient(135deg, ${brandColor} 0%, #2563eb 56%, #111827 100%)` }}>
          <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-white/10" />
          <div className="relative flex items-start gap-4">
            <VirazhLogo color={brandColor} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/68">Страница автошколы</p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight">{school.name}</h1>
              <p className="mt-3 text-base leading-relaxed text-white/78">{school.description}</p>
            </div>
          </div>
          <div className="relative mt-6 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/12 px-4 py-3 ring-1 ring-white/16">
              <p className="text-2xl font-semibold">{supportedCategories.length || 0}</p>
              <p className="mt-1 text-sm text-white/72">категорий в школе</p>
            </div>
            <div className="rounded-2xl bg-white/12 px-4 py-3 ring-1 ring-white/16">
              <p className="text-2xl font-semibold">{branches.length}</p>
              <p className="mt-1 text-sm text-white/72">филиалов</p>
            </div>
            <div className="rounded-2xl bg-white/12 px-4 py-3 ring-1 ring-white/16">
              <p className="text-2xl font-semibold">{futureSlots.length}</p>
              <p className="mt-1 text-sm text-white/72">свободных мест</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5">
          <Button size="lg" className="min-h-14 w-full text-lg" style={{ backgroundColor: brandColor, borderColor: brandColor }} onClick={onStartBooking}>
            Записаться на занятие
            <ArrowRight size={20} />
          </Button>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button size="lg" variant="secondary" className="min-h-13 w-full" onClick={onLogin}>
              Войти в профиль
            </Button>
            <Button size="lg" variant="secondary" className="min-h-13 w-full" onClick={onOpenSchedule}>
              Расписание
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-[1.65rem] border border-stone-200 bg-white p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Категории прав</h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-500">
              Показываем все категории, но активными отмечены только те, где у школы есть инструкторы.
            </p>
          </div>
          <Car size={22} style={{ color: brandColor }} />
        </div>
        <div className="mt-4 grid gap-2">
          {DRIVING_CATEGORIES.map((category) => {
            const Icon = categoryIcon(category)
            const active = supportedCategoryCodes.has(category.code)
            return (
              <div
                key={category.code}
                className={'flex items-start gap-3 rounded-2xl border px-4 py-3 ' + (active ? 'border-blue-100 bg-blue-50/70' : 'border-stone-100 bg-stone-50')}
              >
                <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + (active ? 'bg-white text-blue-700' : 'bg-white text-stone-400')}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-stone-900">{category.code} · {category.title}</p>
                    <span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + (active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500')}>
                      {active ? 'доступно' : 'не подключено'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-snug text-stone-500">{category.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-[1.65rem] border border-stone-200 bg-white p-5 shadow-card">
          <h2 className="text-xl font-semibold text-stone-900">Ближайшее свободное время</h2>
          {nextSlot ? (
            <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-4">
              <p className="text-lg font-semibold text-stone-900">{formatDateFull(nextSlot.date)} в {nextSlot.time}</p>
              <p className="mt-1 text-sm text-stone-500">
                {(db.instructors.byId(nextSlot.instructorId)?.name ?? 'Инструктор') + ' · ' + (db.branches.byId(nextSlot.branchId)?.name ?? 'Филиал')}
              </p>
              <Button className="mt-4 w-full" onClick={onStartBooking}>
                Выбрать занятие
              </Button>
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-500">Свободных мест пока нет. Можно посмотреть расписание или связаться с автошколой.</p>
          )}
        </div>

        <div className="rounded-[1.65rem] border border-stone-200 bg-white p-5 shadow-card">
          <h2 className="text-xl font-semibold text-stone-900">Филиалы</h2>
          <div className="mt-4 space-y-2">
            {branches.map((branch) => (
              <div key={branch.id} className="rounded-2xl bg-stone-50 px-4 py-3">
                <p className="text-sm font-semibold text-stone-900">{branch.name}</p>
                <p className="mt-1 text-sm text-stone-500">{branch.address}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.65rem] border border-stone-200 bg-white p-5 shadow-card">
          <h2 className="text-xl font-semibold text-stone-900">Инструкторы</h2>
          <div className="mt-4 space-y-2">
            {activeInstructors.slice(0, 4).map((instructor) => (
              <div key={instructor.id} className="flex items-start gap-3 rounded-2xl bg-stone-50 px-4 py-3">
                <Avatar initials={instructor.avatarInitials} color={instructor.avatarColor} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900">{instructor.name}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {(instructor.categories ?? []).join(', ') || 'Категория не указана'} · {instructor.car ?? 'Автомобиль уточняется'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[1.65rem] border border-stone-200 bg-white p-5 shadow-card">
        <h2 className="text-xl font-semibold text-stone-900">Контакты</h2>
        <div className="mt-4 grid gap-2">
          <a className="rounded-2xl bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-900" href={`tel:${school.phone}`}>
            {formatPhone(school.phone)}
          </a>
          <a className="rounded-2xl bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-900" href={`mailto:${school.email}`}>
            {school.email}
          </a>
          <p className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-500">{school.address}</p>
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
  const [form, setForm] = useState<FormState>({ name: '', phone: '', email: '', password: '', avatarUrl: '' })
  const [loginForm, setLoginForm] = useState<LoginState>({ phone: '', password: '' })
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false)
  const [isProfileRequiredOpen, setIsProfileRequiredOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isBookingStarted, setIsBookingStarted] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [loginErrors, setLoginErrors] = useState<Partial<LoginState>>({})
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
      return { completedLessons: 0, futureLessons: [] as ResolvedStudentLesson[], nextLesson: null as StudentLesson | null }
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
    const futureLessons = lessons
      .filter((entry) => entry.booking.status === 'active' && slotDateTime(entry.slot) >= now)
      .sort((left, right) => slotDateTime(left.slot).getTime() - slotDateTime(right.slot).getTime())
    const nextLesson = futureLessons[0] ?? null

    return { completedLessons, futureLessons, nextLesson }
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

  const profileBranch = useMemo(() => {
    if (!studentProfile) return null
    if (studentProfile.assignedBranchId) {
      return branches.find((branch) => branch.id === studentProfile.assignedBranchId) ?? null
    }
    return selectedBranch ?? branches[0] ?? null
  }, [branches, selectedBranch, studentProfile])

  useEffect(() => {
    if (!slug) return

    const applySchool = (currentSchool: School, nextBranches: Branch[], nextInstructors: Instructor[]) => {
      setSchoolMissing(false)
      setSchool(currentSchool)
      setBranches(nextBranches.filter((b) => b.isActive))
      setInstructors(nextInstructors)
      const profile = getStudentProfile(currentSchool.id)
      setStudentProfile(profile)
      if (profile) {
        setForm({ name: profile.name, phone: profile.phone, email: profile.email, password: '', avatarUrl: profile.avatarUrl })
        setIsEditingProfile(false)
        setIsBookingStarted(false)
      } else {
        setForm({ name: '', phone: '', email: '', password: '', avatarUrl: '' })
        setIsEditingProfile(false)
        setIsBookingStarted(false)
        if (currentSchool.branchSelectionMode === 'fixed_first') {
          const firstBranch = nextBranches.filter((b) => b.isActive)[0]
          if (firstBranch) {
            setSelectedBranch(firstBranch)
            setStep(2)
          } else {
            setStep(1)
          }
        } else {
          setStep(1)
        }
      }
    }

    void getPublicSchoolBundle(slug)
      .then((bundle) => {
        if (!bundle) {
          const fallbackSchool = db.schools.bySlug(slug)
          if (!fallbackSchool) {
            setSchoolMissing(true)
            return
          }
          applySchool(
            fallbackSchool,
            db.branches.bySchool(fallbackSchool.id).filter((b) => b.isActive),
            db.instructors.bySchool(fallbackSchool.id),
          )
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
        const fallbackSchool = db.schools.bySlug(slug)
        if (!fallbackSchool) {
          setSchoolMissing(true)
          return
        }
        applySchool(
          fallbackSchool,
          db.branches.bySchool(fallbackSchool.id).filter((b) => b.isActive),
          db.instructors.bySchool(fallbackSchool.id),
        )
      })
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

    let createdBookingIds: string[] = []
    try {
      const result = await createSupabaseBooking({
        schoolId: school.id,
        studentName: form.name,
        studentPhone: form.phone,
        slotIds: selectedSlots.map((slot) => slot.id),
      })
      createdBookingIds = result.bookingIds
    } catch (error) {
      isFinalizingRef.current = false
      setIsSubmitting(false)
      showToast(error instanceof Error ? error.message : 'Не удалось создать запись.', 'error')
      setStep(4)
      return
    }

    releaseSessionLocks(sessionId.current)
    setSelectedSlots([])
    setIsEditingProfile(false)
    setIsSubmitting(false)
    isFinalizingRef.current = false

    if (studentProfile) {
      showToast(
        createdBookingIds.length > 1
          ? `${pluralize(createdBookingIds.length, 'запись сохранена', 'записи сохранены', 'записей сохранено')}.`
          : 'Запись сохранена.',
        'success',
      )
      navigate(`/booking/${createdBookingIds[0]}`)
      return
    }

    setCreatedBookingId(createdBookingIds[0])
    setStep(7)
  }

  function startBookingFlow(): void {
    if (studentProfile && !isProfileComplete(studentProfile)) {
      setIsScheduleOpen(false)
      setIsProfileRequiredOpen(true)
      return
    }
    setCreatedBookingId(null)
    setIsScheduleOpen(false)
    setIsProfileSettingsOpen(false)
    setIsLoginOpen(false)
    if (school?.branchSelectionMode === 'fixed_first' && branches[0]) {
      setSelectedBranch(branches[0])
      setStep(2)
    } else {
      setStep(1)
    }
    setIsBookingStarted(true)
  }

  function returnFromBooking(): void {
    if (studentProfile) {
      setIsBookingStarted(false)
      return
    }
    setIsBookingStarted(false)
  }

  function continueToConfirmation(): void {
    if (!createdBookingId) return
    navigate(`/booking/${createdBookingId}`)
  }

  function logoutStudent(): void {
    if (!school) return
    removeStudentProfile(school.id)
    setStudentProfile(null)
    setForm({ name: '', phone: '', email: '', password: '', avatarUrl: '' })
    setLoginForm({ phone: '', password: '' })
    setIsProfileSettingsOpen(false)
    setIsProfileRequiredOpen(false)
    setIsScheduleOpen(false)
    setIsLoginOpen(false)
    setIsBookingStarted(true)
    setStep(1)
    showToast('Вы вышли из профиля.', 'success')
  }

  async function loginStudent(): Promise<void> {
    if (!school) return

    const nextErrors: Partial<LoginState> = {}
    if (!normalizePhone(loginForm.phone)) nextErrors.phone = 'Введите телефон'
    if (!loginForm.password.trim()) nextErrors.password = 'Введите пароль'
    setLoginErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const student = await loginStudentInSupabase({
        schoolId: school.id,
        phone: loginForm.phone,
        password: loginForm.password,
      })

      if (!student) {
        setLoginErrors({ password: 'Телефон или пароль не подошли' })
        return
      }

      const profile = saveStudentProfile(
        school.id,
        {
          name: student.name,
          phone: student.phone,
          email: student.email,
          password: '',
          avatarUrl: student.avatarUrl,
        },
        {
          passwordSet: true,
          assignedBranchId: student.assignedBranchId || undefined,
        },
      )

      setStudentProfile(profile)
      setForm({ name: profile.name, phone: profile.phone, email: profile.email, password: '', avatarUrl: profile.avatarUrl })
      setLoginForm({ phone: '', password: '' })
      setIsLoginOpen(false)
      setIsBookingStarted(false)
      setIsScheduleOpen(false)
      setIsProfileSettingsOpen(false)
      setStep(1)
      showToast('Профиль открыт.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось войти в профиль.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function validateProfileSettings(requirePassword: boolean): boolean {
    if (!form.name.trim()) {
      showToast('Введите ФИО.', 'error')
      return false
    }
    if (!isValidRussianPhone(form.phone)) {
      showToast('Введите корректный телефон.', 'error')
      return false
    }
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      showToast('Введите e-mail.', 'error')
      return false
    }
    if (requirePassword && form.password.trim().length < 6) {
      showToast('Пароль должен быть минимум 6 символов.', 'error')
      return false
    }
    return true
  }

  async function saveProfileSettings(options?: { continueToBooking?: boolean }): Promise<void> {
    if (!school) return
    const requirePassword = !studentProfile?.passwordSet || Boolean(options?.continueToBooking)
    if (!validateProfileSettings(requirePassword)) return

    try {
      await updateStudentProfileInSupabase({
        schoolId: school.id,
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password,
        avatarUrl: form.avatarUrl,
      })
      const profile = saveStudentProfile(school.id, form, {
        passwordSet: true,
        assignedBranchId: profileBranch?.id,
      })
      setStudentProfile(profile)
      setForm({ name: profile.name, phone: profile.phone, email: profile.email, password: '', avatarUrl: profile.avatarUrl })
      setIsProfileSettingsOpen(false)
      showToast('Профиль сохранён.', 'success')
      if (options?.continueToBooking && createdBookingId) {
        navigate(`/booking/${createdBookingId}`)
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить профиль.', 'error')
    }
  }

  async function copyCredentials(): Promise<void> {
    const login = normalizePhone(form.phone || studentProfile?.phone || '')
    const password = form.password.trim()
    if (!login || !password) {
      showToast('Введите телефон и пароль, чтобы скопировать доступ.', 'info')
      return
    }
    await navigator.clipboard.writeText(`Логин: ${formatPhone(login)}\nПароль: ${password}`)
    showToast('Логин и пароль скопированы.', 'success')
  }

  async function requestBranchChange(): Promise<void> {
    if (!school || !studentProfile) return
    try {
      await requestBranchChangeInSupabase({
        schoolId: school.id,
        phone: studentProfile.phone,
        note: 'Ученик запросил смену филиала из профиля.',
      })
      const profile = saveStudentProfile(school.id, form, {
        ...studentProfile,
        branchChangeRequestedAt: new Date().toISOString(),
      })
      setStudentProfile(profile)
      showToast('Запрос отправлен администратору.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось отправить запрос.', 'error')
    }
  }

  async function createProfileAndContinue(): Promise<void> {
    if (!school || !createdBookingId) return
    await saveProfileSettings({ continueToBooking: true })
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
            {school.logoUrl ? (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-soft">
                <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" />
              </div>
            ) : (
              <VirazhLogo color={brandColor} />
            )}
            <div className="text-left">
              <p className="text-base font-semibold text-stone-900 leading-tight">{school.name}</p>
              <p className="text-sm text-stone-400">
                {isBookingStarted ? 'Запись на занятие' : isScheduleOpen ? 'Расписание автошколы' : 'Профиль ученика'}
              </p>
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
          {!studentProfile && isLoginOpen ? (
            <StudentLoginPanel
              brandColor={brandColor}
              errors={loginErrors}
              isSubmitting={isSubmitting}
              login={loginForm}
              onBack={() => setIsLoginOpen(false)}
              onChange={(patch) => {
                setLoginForm((current) => ({ ...current, ...patch }))
                setLoginErrors({})
              }}
              onLogin={() => void loginStudent()}
            />
          ) : studentProfile && !isBookingStarted && !isScheduleOpen && !isProfileSettingsOpen ? (
            <StudentProfileCard
              brandColor={brandColor}
              branch={profileBranch}
              futureLessons={studentStats.futureLessons}
              isComplete={isProfileComplete(studentProfile)}
              nextLesson={studentStats.nextLesson}
              onLogout={logoutStudent}
              onOpenSettings={() => setIsProfileSettingsOpen(true)}
              profile={studentProfile}
            />
          ) : null}

          {studentProfile && isProfileSettingsOpen ? (
            <ProfileSettingsPanel
              branch={profileBranch}
              brandColor={brandColor}
              form={form}
              onBack={() => setIsProfileSettingsOpen(false)}
              onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
              onCopyCredentials={() => void copyCredentials()}
              onRequestBranchChange={() => void requestBranchChange()}
              onSave={() => void saveProfileSettings()}
              profile={studentProfile}
            />
          ) : studentProfile && isScheduleOpen ? (
            <ScheduleOverview
              brandColor={brandColor}
              onBack={() => setIsScheduleOpen(false)}
              school={school}
            />
          ) : !isBookingStarted && studentProfile ? (
            <StudentDashboard
              availableSlotsCount={schoolSummary.availableSlotsCount}
              brandColor={brandColor}
              futureLessons={studentStats.futureLessons}
              nextLesson={studentStats.nextLesson}
              onOpenSchedule={() => setIsScheduleOpen(true)}
              onStartBooking={startBookingFlow}
            />
          ) : !studentProfile && isScheduleOpen ? (
            <ScheduleOverview
              brandColor={brandColor}
              onBack={() => setIsScheduleOpen(false)}
              school={school}
            />
          ) : !isBookingStarted && !studentProfile ? (
            <PublicSchoolHome
              brandColor={brandColor}
              branches={branches}
              instructors={instructors}
              onLogin={() => {
                setIsLoginOpen(true)
                setLoginErrors({})
              }}
              onOpenSchedule={() => setIsScheduleOpen(true)}
              onStartBooking={startBookingFlow}
              school={school}
            />
          ) : !isLoginOpen ? (
          <>
          {/* Step card */}
          <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-[1.65rem] border border-stone-200 bg-white shadow-card sm:min-h-0">
            <StepProgress step={step} total={7} />

            <div className="px-6 pb-8 pt-4">
              <AnimatePresence mode="wait">
                {/* ── Step 1: Филиал ── */}
                {step === 1 ? (
                  <motion.div key="step1" {...fadeSlide}>
                    <div className="mb-6 flex items-center justify-between gap-3">
                      <button
                        onClick={returnFromBooking}
                        className="inline-flex items-center gap-2 text-base text-stone-500 transition-colors hover:text-stone-900"
                      >
                        <ArrowLeft size={18} />
                        {studentProfile ? 'Назад в профиль' : 'На главную'}
                      </button>
                      {!studentProfile ? (
                        <button
                          onClick={() => {
                            setIsLoginOpen(true)
                            setLoginErrors({})
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <LockKeyhole size={15} />
                          Войти
                        </button>
                      ) : null}
                    </div>
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
                          returnFromBooking()
                        } else {
                          setStep(1)
                        }
                      }}
                      label={school.branchSelectionMode === 'fixed_first' ? (studentProfile ? 'Назад в профиль' : 'На главную') : 'Назад к филиалам'}
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
                            <CircleUserRound size={20} className="mt-0.5 shrink-0 text-forest-700" />
                            <p className="text-sm leading-relaxed text-stone-500">
                              Эти данные нужны для записи. После сохранения спросим отдельно, создавать ли профиль.
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

                {step === 7 ? (
                  <motion.div key="step7" {...fadeSlide}>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-50">
                      <CircleUserRound size={30} className="text-forest-700" />
                    </div>
                    <h1 className="mt-6 text-center text-2xl font-semibold text-stone-900">
                      Создать профиль ученика?
                    </h1>
                    <p className="mx-auto mt-3 max-w-sm text-center text-base leading-relaxed text-stone-500">
                      Мы можем сохранить имя и телефон в этом браузере. Тогда при следующем входе вы сразу увидите
                      личный кабинет и сможете записаться быстрее.
                    </p>

                    <div className="mt-6 space-y-4">
                      <Input
                        label="ФИО"
                        placeholder="Анна Иванова"
                        value={form.name}
                        onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                      />
                      <Input
                        label="Телефон"
                        placeholder="+7 (999) 123-45-67"
                        value={form.phone}
                        onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
                      />
                      <Input
                        label="E-mail"
                        type="email"
                        placeholder="name@example.ru"
                        value={form.email}
                        onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                      />
                      <Input
                        label="Пароль"
                        type="password"
                        placeholder="Минимум 6 символов"
                        value={form.password}
                        onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                      />
                      <Input
                        label="Аватарка"
                        placeholder="Ссылка на фото, можно оставить пустой"
                        value={form.avatarUrl}
                        onChange={(e) => setForm((c) => ({ ...c, avatarUrl: e.target.value }))}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { icon: UserRound, text: 'ФИО' },
                          { icon: Mail, text: 'E-mail' },
                          { icon: LockKeyhole, text: 'Пароль' },
                        ].map((item) => {
                          const Icon = item.icon
                          return (
                            <div key={item.text} className="rounded-2xl bg-stone-50 px-3 py-3 text-center">
                              <Icon size={18} className="mx-auto text-stone-400" />
                              <p className="mt-1 text-xs font-medium text-stone-500">{item.text}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mt-8 space-y-3">
                      <Button
                        size="lg"
                        className="w-full min-h-14 text-lg"
                        style={{ backgroundColor: brandColor, borderColor: brandColor }}
                        onClick={() => void createProfileAndContinue()}
                      >
                        Создать профиль
                      </Button>
                      <Button
                        size="lg"
                        variant="secondary"
                        className="w-full min-h-14 text-lg"
                        onClick={() => void copyCredentials()}
                      >
                        <Copy size={18} />
                        Скопировать логин и пароль
                      </Button>
                      <Button
                        size="lg"
                        variant="secondary"
                        className="w-full min-h-14 text-lg"
                        onClick={continueToConfirmation}
                      >
                        Продолжить без профиля
                      </Button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
          </>
          ) : null}
        </motion.div>
      </main>

      <AnimatePresence>
        {isProfileRequiredOpen ? (
          <ProfileRequiredDialog
            onClose={() => setIsProfileRequiredOpen(false)}
            onOpenSettings={() => {
              setIsProfileRequiredOpen(false)
              setIsProfileSettingsOpen(true)
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
