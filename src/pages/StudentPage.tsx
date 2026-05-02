import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  CarFront,
  ChevronRight,
  Clock3,
  CreditCard,
  GraduationCap,
  Home,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { BottomNav } from '../components/ui/BottomNav'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { db } from '../services/storage'
import { generateIcs, normalizePhone } from '../services/bookingService'
import {
  findAnyStudentProfile,
  loadStudentProfile,
  loadStudentProgress,
  removeStudentProfile,
  saveStudentProfile,
  type StudentProfile,
} from '../services/studentProfile'
import { getInstructorPhoto } from '../services/instructorPhotos'
import type { Booking, Branch, Instructor, School, Slot, StudentProgress } from '../types'
import { cn, formatInstructorName, formatPhone } from '../lib/utils'

void React

type View = 'home' | 'schedule' | 'progress' | 'profile'

interface ResolvedStudentBooking {
  booking: Booking
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
}

const money = new Intl.NumberFormat('ru-RU')

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'У'
}

function lessonDateTime(slot: Slot | null) {
  if (!slot) return 'Дата не выбрана'

  const date = parseISO(slot.date)
  const [hours = 0, minutes = 0] = slot.time.split(':').map(Number)
  const end = new Date(date)
  end.setHours(hours, minutes + slot.duration, 0, 0)

  const label = isToday(date)
    ? 'Сегодня'
    : isTomorrow(date)
      ? 'Завтра'
      : format(date, 'd MMMM', { locale: ru })

  return `${label}, ${slot.time}–${format(end, 'HH:mm')}`
}

function shortDate(date?: string | null) {
  if (!date) return 'не назначен'
  return format(parseISO(date), 'd MMMM', { locale: ru })
}

function resolveBookings(schoolId: string, profile: StudentProfile): ResolvedStudentBooking[] {
  const phone = normalizePhone(profile.phone)

  return db.bookings.bySchool(schoolId)
    .filter((booking) => booking.studentPhone === phone)
    .map((booking) => ({
      booking,
      slot: db.slots.byId(booking.slotId),
      instructor: db.instructors.byId(booking.instructorId),
      branch: db.branches.byId(booking.branchId),
    }))
    .sort((left, right) => {
      const l = left.slot ? new Date(`${left.slot.date}T${left.slot.time}:00`).getTime() : 0
      const r = right.slot ? new Date(`${right.slot.date}T${right.slot.time}:00`).getTime() : 0
      return l - r
    })
}

function downloadBookingCalendar(bookingId: string): void {
  const content = generateIcs(bookingId)
  if (!content) return

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${bookingId}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function StudentAvatar({ name, src }: { name: string; src?: string }) {
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#DDE6FF] text-[18px] font-black text-[#2436D9]">
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </div>
  )
}

function SchoolLogo({ school }: { school: School }) {
  return (
    <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white text-[#2436D9] shadow-[0_10px_26px_rgba(18,24,38,0.08)]">
      {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : <Building2 size={19} />}
    </div>
  )
}

function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать фото.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Не удалось открыть фото.'))
      image.onload = () => {
        const size = Math.min(image.width, image.height)
        const sourceX = Math.max(0, (image.width - size) / 2)
        const sourceY = Math.max(0, (image.height - size) / 2)
        const canvas = document.createElement('canvas')
        canvas.width = 360
        canvas.height = 360
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Не удалось обработать фото.'))
          return
        }
        ctx.drawImage(image, sourceX, sourceY, size, size, 0, 0, 360, 360)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

function StatusPill({
  children,
  tone = 'neutral',
}: {
  children: string
  tone?: 'neutral' | 'green' | 'orange' | 'red' | 'blue'
}) {
  const styles = {
    neutral: 'bg-[#F1F2F5] text-[#6D7480]',
    green: 'bg-[#EAF8F0] text-[#14995B]',
    orange: 'bg-[#FFF2E6] text-[#F06B19]',
    red: 'bg-[#FEECEE] text-[#E53945]',
    blue: 'bg-[#EFF2FF] text-[#2436D9]',
  }

  return (
    <span className={cn('inline-flex h-7 items-center rounded-full px-3 text-[12px] font-extrabold', styles[tone])}>
      {children}
    </span>
  )
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof Wallet
  tone: 'green' | 'orange' | 'blue'
}) {
  const colors = {
    green: 'bg-[#EAF8F0] text-[#14995B]',
    orange: 'bg-[#FFF2E6] text-[#F06B19]',
    blue: 'bg-[#EFF2FF] text-[#2436D9]',
  }

  return (
    <div className="rounded-[22px] bg-white p-4 shadow-[0_12px_34px_rgba(18,24,38,0.07)]">
      <div className={cn('mb-3 grid h-9 w-9 place-items-center rounded-full', colors[tone])}>
        <Icon size={18} />
      </div>
      <p className="text-[20px] font-black leading-6 text-[#101216]">{value}</p>
      <p className="mt-1 text-[12px] font-bold leading-4 text-[#8B929C]">{label}</p>
    </div>
  )
}

function EmptyInfoCard({
  title,
  text,
  icon: Icon,
  tone = 'blue',
}: {
  title: string
  text: string
  icon: typeof Wallet
  tone?: 'green' | 'orange' | 'blue'
}) {
  const colors = {
    green: 'bg-[#EAF8F0] text-[#14995B]',
    orange: 'bg-[#FFF2E6] text-[#F06B19]',
    blue: 'bg-[#EFF2FF] text-[#2436D9]',
  }

  return (
    <section className="rounded-[24px] bg-white p-4 shadow-[0_12px_34px_rgba(18,24,38,0.07)]">
      <div className={cn('mb-3 grid h-9 w-9 place-items-center rounded-full', colors[tone])}>
        <Icon size={18} />
      </div>
      <p className="text-[15px] font-black leading-5 text-[#101216]">{title}</p>
      <p className="mt-1 text-[12px] font-bold leading-4 text-[#8B929C]">{text}</p>
    </section>
  )
}

function LessonCard({
  item,
  onBook,
}: {
  item: ResolvedStudentBooking | null
  onBook: () => void
}) {
  if (!item?.slot) {
    return (
      <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(18,24,38,0.09)]">
        <StatusPill tone="blue">Записей нет</StatusPill>
        <h2 className="mt-4 text-[24px] font-black leading-7 tracking-[-0.03em] text-[#101216]">Выберите первое занятие</h2>
        <p className="mt-2 text-[14px] font-semibold leading-5 text-[#727985]">Покажем ближайшие свободные окна на неделю, без огромного календаря.</p>
        <Button className="mt-5 h-12 w-full rounded-[16px] bg-[#2436D9]" onClick={onBook}>
          Записаться
        </Button>
      </section>
    )
  }

  return (
    <section className="rounded-[28px] bg-[#101216] p-5 text-white shadow-[0_22px_60px_rgba(16,18,22,0.20)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.05em] text-[#AEB5C1]">Ближайшее занятие</p>
          <h2 className="mt-3 text-[26px] font-black leading-8 tracking-[-0.03em] text-white">{lessonDateTime(item.slot)}</h2>
        </div>
        <StatusPill tone={isToday(parseISO(item.slot.date)) ? 'orange' : 'green'}>
          {isToday(parseISO(item.slot.date)) ? 'сегодня' : 'активно'}
        </StatusPill>
      </div>

      <div className="mt-5 rounded-[22px] bg-white/10 p-4">
        <div className="flex items-center gap-3">
          <StudentAvatar name={item.instructor?.name ?? 'Инструктор'} src={item.instructor ? getInstructorPhoto(item.instructor) : undefined} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold text-white">{item.instructor ? formatInstructorName(item.instructor.name) : 'Инструктор'}</p>
            <p className="mt-1 truncate text-[13px] font-semibold text-[#C8CDD6]">{item.instructor?.car ?? 'Учебный автомобиль'}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-[#C8CDD6]">
          <MapPin size={15} className="shrink-0 text-[#6E7DFF]" />
          <span className="truncate">{item.branch?.name ?? 'Филиал'} · {item.branch?.address ?? 'адрес уточняется'}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button className="rounded-[15px] bg-white px-3 py-3 text-[13px] font-black text-[#101216] active:scale-[0.97]" onClick={() => downloadBookingCalendar(item.booking.id)}>
          В календарь
        </button>
        <button className="rounded-[15px] bg-[#2436D9] px-3 py-3 text-[13px] font-black text-white active:scale-[0.97]" onClick={onBook}>
          Ещё запись
        </button>
      </div>
    </section>
  )
}

function BookingRow({ item }: { item: ResolvedStudentBooking }) {
  const isPast = item.booking.status !== 'active' || (item.slot ? new Date(`${item.slot.date}T${item.slot.time}:00`).getTime() < Date.now() : false)
  const tone = item.booking.status === 'cancelled' ? 'red' : isPast ? 'neutral' : 'green'

  return (
    <article className="rounded-[24px] bg-white p-4 shadow-[0_12px_34px_rgba(18,24,38,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-black leading-6 text-[#101216]">{lessonDateTime(item.slot)}</p>
          <p className="mt-1 truncate text-[13px] font-bold text-[#727985]">{item.instructor ? formatInstructorName(item.instructor.name) : 'Инструктор'}</p>
        </div>
        <StatusPill tone={tone}>{item.booking.status === 'cancelled' ? 'отменено' : isPast ? 'завершено' : 'активно'}</StatusPill>
      </div>
      <p className="mt-3 flex items-center gap-2 truncate text-[13px] font-semibold text-[#8B929C]">
        <MapPin size={14} className="text-[#2436D9]" />
        {item.branch?.name ?? 'Филиал'}
      </p>
    </article>
  )
}

function ProgressCard({ progress }: { progress: StudentProgress | null }) {
  if (!progress) {
    return (
      <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(18,24,38,0.09)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#101216]">Прогресс обучения</h2>
          <StatusPill tone="neutral">пока пусто</StatusPill>
        </div>
        <p className="text-[14px] font-semibold leading-5 text-[#727985]">
          Часы, темы и экзамены появятся здесь, когда автошкола начнёт вести прогресс ученика.
        </p>
      </section>
    )
  }

  const theoryTotal = progress.theoryTopicsTotal
  const theoryDone = progress.theoryTopicsCompleted
  const drivingTotal = progress.drivingHoursTotal
  const drivingDone = progress.drivingHoursCompleted
  const theoryPct = Math.round((theoryDone / theoryTotal) * 100)
  const drivingPct = Math.round((drivingDone / drivingTotal) * 100)

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(18,24,38,0.09)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#101216]">Прогресс обучения</h2>
        <StatusPill tone="blue">{`${drivingPct}%`}</StatusPill>
      </div>

      {[
        { label: 'Вождение', value: `${drivingDone} из ${drivingTotal} ч`, pct: drivingPct, color: '#2436D9' },
        { label: 'Теория', value: `${theoryDone} из ${theoryTotal} тем`, pct: theoryPct, color: '#14995B' },
      ].map((row) => (
        <div key={row.label} className="mb-4 last:mb-0">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[14px] font-extrabold text-[#101216]">{row.label}</p>
            <p className="text-[13px] font-bold text-[#727985]">{row.value}</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#EDF0F5]">
            <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
          </div>
        </div>
      ))}
    </section>
  )
}

export function StudentPage() {
  const navigate = useNavigate()
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [view, setView] = useState<View>('home')
  const [form, setForm] = useState({ name: '', phone: '', note: '' })

  useEffect(() => {
    const found = findAnyStudentProfile()
    const nextSchool = found ? db.schools.byId(found.schoolId) : db.schools.bySlug('virazh')
    const nextProfile = found?.profile ?? (nextSchool ? loadStudentProfile(nextSchool.id) : null)

    setSchool(nextSchool)
    setProfile(nextProfile)

    if (nextProfile) {
      setForm({ name: nextProfile.name, phone: normalizePhone(nextProfile.phone).replace(/^7/, '').slice(0, 10), note: '' })
    } else {
      navigate('/student/register', { replace: true })
    }
  }, [navigate])

  const normalizedPhone = profile ? normalizePhone(profile.phone) : ''
  const student = school && normalizedPhone ? db.students.byNormalizedPhone(school.id, normalizedPhone) : null
  const progress = student ? loadStudentProgress(student.id) : null
  const bookings = useMemo(() => school && profile ? resolveBookings(school.id, profile) : [], [school, profile])
  const upcoming = bookings.filter((item) => item.booking.status === 'active' && item.slot && new Date(`${item.slot.date}T${item.slot.time}:00`).getTime() >= Date.now())
  const history = bookings.filter((item) => !upcoming.some((next) => next.booking.id === item.booking.id))
  const next = upcoming[0] ?? null

  const hasPaymentData = false

  if (!school || !profile) {
    return <div className="min-h-dvh bg-[#F2F3F7]" />
  }

  function saveProfile() {
    if (!school || !profile) return
    const saved = saveStudentProfile(school.id, { name: form.name, phone: form.phone }, profile)
    setProfile(saved)
    setView('home')
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file || !school || !profile) return
    const avatarUrl = await imageFileToDataUrl(file)
    const saved = saveStudentProfile(school.id, { name: profile.name, phone: profile.phone, avatarUrl }, { ...profile, avatarUrl })
    setProfile(saved)
  }

  function logout() {
    if (school) removeStudentProfile(school.id)
    setProfile(null)
    navigate('/student/register', { replace: true })
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#F2F3F7] text-[#101216]">
      <main className="mx-auto w-full max-w-[430px] px-4 pb-28 pt-4">
        {view === 'home' ? (
          <section className="space-y-4">
            <header className="flex items-center justify-between gap-3">
              <button className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] text-left active:scale-[0.98]" onClick={() => setView('profile')}>
                <StudentAvatar name={profile.name} src={profile.avatarUrl} />
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-black leading-5 text-[#101216]">{profile.name}</p>
                  <p className="mt-1 truncate text-[12px] font-bold text-[#8B929C]">{school.name}</p>
                </div>
                <ChevronRight className="ml-auto shrink-0 text-[#A6ADB8]" size={20} />
              </button>
              <button className="grid min-h-11 min-w-11 place-items-center active:scale-[0.97]" style={{ minHeight: 44, minWidth: 44 }} onClick={() => navigate(`/school/${school.slug}`)} aria-label="Страница автошколы">
                <SchoolLogo school={school} />
              </button>
            </header>

            <div className="grid grid-cols-3 gap-2.5">
              <MetricTile label="активных" value={`${upcoming.length}`} icon={CalendarDays} tone="blue" />
              {progress ? (
                <MetricTile label="часов" value={`${progress.drivingHoursCompleted}/${progress.drivingHoursTotal}`} icon={CarFront} tone="blue" />
              ) : (
                <MetricTile label="прогресс" value="—" icon={CarFront} tone="green" />
              )}
              <MetricTile label="оплата" value={hasPaymentData ? money.format(0) : '—'} icon={Wallet} tone="orange" />
            </div>

            <LessonCard item={next} onBook={() => navigate('/student/book')} />

            <ProgressCard progress={progress} />

            {progress ? (
              <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(18,24,38,0.09)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#101216]">Экзамены</h2>
                  <GraduationCap className="text-[#2436D9]" size={22} />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-[18px] bg-[#F6F7FA] p-3">
                    <div>
                      <p className="text-[14px] font-extrabold text-[#101216]">Внутренний экзамен</p>
                      <p className="mt-1 text-[12px] font-bold text-[#8B929C]">{shortDate(progress.internalExamDate)}</p>
                    </div>
                    <StatusPill tone={progress.internalExamPassed ? 'green' : 'orange'}>{progress.internalExamPassed ? 'сдан' : 'готовиться'}</StatusPill>
                  </div>
                  <div className="flex items-center justify-between rounded-[18px] bg-[#F6F7FA] p-3">
                    <div>
                      <p className="text-[14px] font-extrabold text-[#101216]">ГИБДД</p>
                      <p className="mt-1 text-[12px] font-bold text-[#8B929C]">{shortDate(progress.gaidExamDate)}</p>
                    </div>
                    <StatusPill tone={progress.gaidExamDate ? 'blue' : 'neutral'}>{progress.gaidExamDate ? 'назначен' : 'нет даты'}</StatusPill>
                  </div>
                </div>
              </section>
            ) : (
              <EmptyInfoCard title="Экзамены" text="Даты появятся после назначения в автошколе." icon={GraduationCap} tone="blue" />
            )}
          </section>
        ) : null}

        {view === 'schedule' ? (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-[28px] font-black tracking-[-0.03em] text-[#101216]">Мои записи</h1>
                <p className="mt-1 text-[14px] font-semibold text-[#727985]">Ближайшие занятия и история.</p>
              </div>
              <Button className="h-11 rounded-[15px] bg-[#2436D9] px-4" onClick={() => navigate('/student/book')}>
                <Plus size={17} />
              </Button>
            </div>
            <div className="space-y-3">
              {upcoming.map((item) => <BookingRow key={item.booking.id} item={item} />)}
              {history.slice(0, 5).map((item) => <BookingRow key={item.booking.id} item={item} />)}
              {bookings.length === 0 ? <LessonCard item={null} onBook={() => navigate('/student/book')} /> : null}
            </div>
          </section>
        ) : null}

        {view === 'progress' ? (
          <section className="space-y-4">
            <h1 className="text-[28px] font-black tracking-[-0.03em] text-[#101216]">Обучение</h1>
            <ProgressCard progress={progress} />
            <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(18,24,38,0.09)]">
              <h2 className="text-[20px] font-black text-[#101216]">Оплата</h2>
              <p className="mt-3 text-[13px] font-bold leading-5 text-[#727985]">Оплаты пока не подключены. Когда автошкола добавит договор и платежи, здесь появится сумма и история.</p>
              <Button className="mt-5 h-12 w-full rounded-[16px] bg-[#2436D9]" disabled>
                <CreditCard size={17} />
                Оплата скоро
              </Button>
            </section>
          </section>
        ) : null}

        {view === 'profile' ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[28px] font-black tracking-[-0.03em] text-[#101216]">Профиль</h1>
                <p className="mt-1 text-[14px] font-semibold text-[#727985]">Основные данные для автошколы.</p>
              </div>
              <button className="grid h-11 w-11 place-items-center rounded-full bg-[#FEECEE] text-[#E53945] active:scale-[0.97]" onClick={logout} aria-label="Выйти">
                <LogOut size={18} />
              </button>
            </div>
            <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(18,24,38,0.09)]">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void uploadPhoto(event.target.files?.[0])}
              />
              <div className="mb-5 flex items-center gap-3">
                <button className="relative active:scale-[0.97]" onClick={() => photoInputRef.current?.click()} aria-label="Загрузить фото">
                  <StudentAvatar name={profile.name} src={profile.avatarUrl} />
                  <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-[#2436D9] text-white shadow-[0_8px_18px_rgba(36,54,217,0.28)]">
                    <Camera size={14} />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-black text-[#101216]">{profile.name}</p>
                  <p className="mt-1 truncate text-[13px] font-bold text-[#8B929C]">{formatPhone(profile.phone)}</p>
                </div>
                <StatusPill tone="blue">ученик</StatusPill>
              </div>
              <div className="space-y-4">
                <Input label="ФИО" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                <PhoneInput label="Телефон" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
                <Input label="Комментарий для автошколы" value={form.note} placeholder="Например: хочу заниматься на автомате" onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
                <Button className="h-12 w-full rounded-[16px] bg-[#2436D9]" onClick={saveProfile}>
                  Сохранить
                </Button>
              </div>
            </section>

            <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(18,24,38,0.09)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#101216]">История</h2>
                  <p className="mt-1 text-[13px] font-bold text-[#8B929C]">Занятия и статусы записей</p>
                </div>
                <Clock3 className="text-[#2436D9]" size={22} />
              </div>
              <div className="space-y-3">
                {bookings.length === 0 ? (
                  <div className="rounded-[20px] bg-[#F6F7FA] p-4">
                    <p className="text-[14px] font-black text-[#101216]">История пока пустая</p>
                    <p className="mt-1 text-[13px] font-semibold leading-5 text-[#727985]">После первой записи здесь появятся занятия, отмены и завершённые уроки.</p>
                  </div>
                ) : bookings.slice(0, 6).map((item) => <BookingRow key={item.booking.id} item={item} />)}
              </div>
            </section>

            <section className="rounded-[28px] bg-[#101216] p-5 text-white shadow-[0_18px_50px_rgba(18,24,38,0.12)]">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-[#8FA0FF]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[16px] font-black">Данные хранятся на устройстве</p>
                  <p className="mt-1 text-[13px] font-semibold leading-5 text-[#C8CDD6]">Фото и профиль нужны только для быстрого входа и записи без повторного ввода.</p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-3 gap-2.5">
              <a href={`tel:${school.phone}`} className="grid min-h-20 place-items-center rounded-[22px] bg-white text-center text-[12px] font-black text-[#101216] shadow-[0_10px_28px_rgba(18,24,38,0.06)]">
                <Phone className="mb-1 text-[#2436D9]" size={19} />
                Позвонить
              </a>
              <button className="grid min-h-20 place-items-center rounded-[22px] bg-white text-center text-[12px] font-black text-[#101216] shadow-[0_10px_28px_rgba(18,24,38,0.06)]">
                <MessageCircle className="mb-1 text-[#14995B]" size={19} />
                Чат
              </button>
              <button className="grid min-h-20 place-items-center rounded-[22px] bg-white text-center text-[12px] font-black text-[#101216] shadow-[0_10px_28px_rgba(18,24,38,0.06)]" onClick={() => navigate(`/school/${school.slug}`)}>
                <Sparkles className="mb-1 text-[#2436D9]" size={19} />
                Автошкола
              </button>
            </div>
          </section>
        ) : null}
      </main>

      <BottomNav
        items={[
          { key: 'home', label: 'Главная', icon: <Home size={20} />, active: view === 'home', onClick: () => setView('home') },
          { key: 'schedule', label: 'Расписание', icon: <CalendarDays size={20} />, active: view === 'schedule', onClick: () => setView('schedule') },
          { key: 'progress', label: 'Обучение', icon: <BookOpen size={20} />, active: view === 'progress', onClick: () => setView('progress') },
          { key: 'profile', label: 'Профиль', icon: <UserRound size={20} />, active: view === 'profile', onClick: () => setView('profile') },
        ]}
      />
    </div>
  )
}
