import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  CarFront,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Filter,
  Gift,
  GraduationCap,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  UserRound,
  Wallet,
} from 'lucide-react'
import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, isTomorrow, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { BottomNav } from '../components/ui/BottomNav'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { db } from '../services/storage'
import { normalizePhone } from '../services/bookingService'
import { updateStudentProfileInSupabase } from '../services/supabasePublicService'
import {
  findAnyStudentProfile,
  loadStudentProfile,
  loadStudentProgress,
  removeStudentProfile,
  saveStudentProfile,
  type StudentProfile,
} from '../services/studentProfile'
import { getInstructorPhoto } from '../services/instructorPhotos'
import type { Booking, Branch, Instructor, School, Slot } from '../types'
import { cn, formatInstructorName } from '../lib/utils'

void React

type View = 'home' | 'schedule' | 'theory' | 'chat' | 'profile'
type LessonFilter = 'all' | 'main' | 'extra'

interface ResolvedStudentBooking {
  booking: Booking
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
}

const card = 'rounded-[24px] bg-white border border-[#EBECF0]'
const pageTitle = 'text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#050609]'
const sectionTitle = 'text-[22px] font-bold leading-tight tracking-[-0.02em] text-[#050609]'

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'У'
}

function compactStudentName(name: string) {
  const [lastName = '', firstName = '', middleName = ''] = name.trim().split(/\s+/)
  const initialsText = [firstName, middleName].filter(Boolean).map((part) => `${part[0]?.toUpperCase()}.`).join('')
  return [lastName, initialsText].filter(Boolean).join(' ') || name
}

function weekdayShort(date: Date) {
  if (date.getDay() === 6) return 'СБ'
  return format(date, 'EE', { locale: ru }).slice(0, 2).toUpperCase()
}

function lessonType(slot: Slot): LessonFilter {
  const hour = Number(slot.time.split(':')[0] ?? 0)
  return slot.duration > 90 || hour >= 15 ? 'extra' : 'main'
}

function filterSlots(slots: Slot[], instructorId: string, filter: LessonFilter) {
  return slots.filter((slot) => {
    if (instructorId && slot.instructorId !== instructorId) return false
    if (filter !== 'all' && lessonType(slot) !== filter) return false
    return true
  })
}

function slotTimeRange(slot: Slot | null) {
  if (!slot) return 'Время не выбрано'
  const date = parseISO(slot.date)
  const [hours = 0, minutes = 0] = slot.time.split(':').map(Number)
  const end = new Date(date)
  end.setHours(hours, minutes + slot.duration, 0, 0)
  return `${slot.time} – ${format(end, 'HH:mm')}`
}

function lessonTime(slot: Slot | null) {
  if (!slot) return 'Время не выбрано'
  const date = parseISO(slot.date)
  const day = isToday(date) ? 'Сегодня' : isTomorrow(date) ? 'Завтра' : format(date, 'EEE d', { locale: ru })
  return `${day}, ${slotTimeRange(slot)}`
}

function selectedDayTitle(date: Date) {
  if (isToday(date)) return `Сегодня, ${format(date, 'd MMMM', { locale: ru })}`
  if (isTomorrow(date)) return `Завтра, ${format(date, 'd MMMM', { locale: ru })}`
  return format(date, 'd MMMM', { locale: ru })
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

function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать фото.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Не удалось открыть фото.'))
      image.onload = () => {
        const size = Math.min(image.width, image.height)
        const canvas = document.createElement('canvas')
        canvas.width = 360
        canvas.height = 360
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Не удалось обработать фото.'))
        ctx.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 360, 360)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

function StudentAvatar({ name, src, size = 48 }: { name: string; src?: string; size?: number }) {
  return (
    <div className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[15px] font-bold text-[#1F2BD8]" style={{ width: size, height: size, border: '1px solid #E4E6EC' }}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" style={{ width: '100%', height: '100%', maxWidth: '100%', objectFit: 'cover' }} /> : initials(name)}
    </div>
  )
}

function SchoolLogo({ school }: { school: School }) {
  return (
    <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white text-[#1F2BD8]" style={{ border: '1px solid #E4E6EC' }}>
      {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" style={{ width: '100%', height: '100%', maxWidth: '100%', objectFit: 'cover' }} /> : <Building2 size={20} />}
    </div>
  )
}

function StatusPill({ children, tone = 'green' }: { children: string; tone?: 'green' | 'blue' | 'gray' | 'red' }) {
  const styles = {
    green: 'bg-[#EEF9F2] text-[#14934A]',
    blue: 'bg-[#EEF0FA] text-[#1F2BD8]',
    gray: 'bg-[#F1F2F5] text-[#8B8D94]',
    red: 'bg-[#FFEDEF] text-[#FF3155]',
  }
  return <span className={cn('inline-flex min-h-7 items-center rounded-[14px] px-3 text-[12px] font-semibold', styles[tone])}>{children}</span>
}

function BookingLessonCard({ item, onBook }: { item: ResolvedStudentBooking | null; onBook: () => void }) {
  if (!item?.slot) {
    return (
      <section className={cn(card, 'p-4')}>
        <div className="mb-3 h-1 w-12 rounded-full bg-[#35C45A]" />
        <h3 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-[#050609]">Запишитесь на первое занятие</h3>
        <p className="mt-2 text-[15px] font-medium leading-5 text-[#8B8D94]">Свободные окна уже в расписании</p>
        <Button size="lg" className="mt-4 w-full rounded-[18px] text-[16px]" onClick={onBook}>Записаться</Button>
      </section>
    )
  }

  return (
    <article className={cn(card, 'min-w-[300px] p-4')}>
      <div className="flex gap-3">
        <div className="w-1 self-stretch rounded-full bg-[#35C45A]" />
        <div className="min-w-0 flex-1">
          <p className="text-[22px] font-bold leading-7 tracking-[-0.02em] text-[#050609]">{lessonTime(item.slot)}</p>
          <p className="mt-1 text-[17px] font-semibold leading-6 text-[#050609]">Основное вождение</p>
          <div className="mt-3 flex items-center gap-3">
            <StudentAvatar name={item.instructor?.name ?? 'Инструктор'} src={item.instructor ? getInstructorPhoto(item.instructor) : undefined} size={38} />
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#050609]">{item.instructor ? formatInstructorName(item.instructor.name) : 'Инструктор'}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

function AvailableSlotCard({ slot, instructor, onBook, compact = false }: { slot: Slot; instructor: Instructor | null; onBook: () => void; compact?: boolean }) {
  return (
    <article className={cn(card, compact ? 'min-w-[260px] p-3' : 'p-3.5')}>
      <div className="flex gap-3">
        <div className="w-1 self-stretch rounded-full bg-[#35C45A]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[19px] font-bold leading-6 tracking-[-0.02em] text-[#050609]">{slotTimeRange(slot)}</p>
              <p className="mt-0.5 truncate text-[14px] font-semibold text-[#050609]">{lessonType(slot) === 'extra' ? 'Дополнительное' : 'Основное'} вождение</p>
            </div>
            <StatusPill>Свободно</StatusPill>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <StudentAvatar name={instructor?.name ?? 'Инструктор'} src={instructor ? getInstructorPhoto(instructor) : undefined} size={34} />
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#050609]">{instructor ? formatInstructorName(instructor.name) : 'Инструктор'}</p>
            <Button size="sm" className="rounded-full px-3 text-[13px]" onClick={onBook}>Записаться</Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function FilterChips({ value, onChange }: { value: LessonFilter; onChange: (value: LessonFilter) => void }) {
  const items: Array<{ value: LessonFilter; label: string }> = [
    { value: 'all', label: 'Все' },
    { value: 'main', label: 'Основное' },
    { value: 'extra', label: 'Дополнительное' },
  ]
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item, index) => (
        <button key={item.value} className="inline-flex min-h-9 shrink-0 items-center rounded-full border px-4 text-[14px] font-semibold text-[#050609] active:scale-[0.98]" style={{ borderColor: value === item.value ? '#050609' : '#E1E3EB' }} onClick={() => onChange(item.value)}>
          {index > 0 ? <span className={cn('mr-2 h-2 w-2 rounded-full', index === 1 ? 'bg-[#35C45A]' : 'bg-[#7259C7]')} /> : null}
          {item.label}
        </button>
      ))}
    </div>
  )
}

function InstructorChips({ instructors, selectedId, onChange }: { instructors: Instructor[]; selectedId: string; onChange: (id: string) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {instructors.map((instructor) => {
        const active = instructor.id === selectedId
        return (
          <button key={instructor.id} className={cn('inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold active:scale-[0.98]', active ? 'border-[#1F2BD8] bg-[#EEF0FA] text-[#1F2BD8]' : 'border-[#E1E3EB] bg-white text-[#050609]')} onClick={() => onChange(instructor.id)}>
            <StudentAvatar name={instructor.name} src={getInstructorPhoto(instructor)} size={24} />
            {formatInstructorName(instructor.name)}
          </button>
        )
      })}
    </div>
  )
}

function MiniCalendar({ selectedDate, onSelect, slots, selectedInstructor, instructors, lessonFilter, onLessonFilterChange, onInstructorChange, onOpen, onBook }: { selectedDate: Date; onSelect: (date: Date) => void; slots: Slot[]; selectedInstructor: Instructor | null; instructors: Instructor[]; lessonFilter: LessonFilter; onLessonFilterChange: (filter: LessonFilter) => void; onInstructorChange: (id: string) => void; onOpen?: () => void; onBook: (slot: Slot) => void }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(new Date(), index))
  const daySlots = filterSlots(slots.filter((slot) => slot.status === 'available' && isSameDay(parseISO(slot.date), selectedDate)), selectedInstructor?.id ?? '', lessonFilter).slice(0, 12)
  return (
    <div className={cn(card, 'p-4')}>
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-[22px] font-bold tracking-[-0.02em] text-[#050609]">Расписание автошколы</h3>
        <button className="grid h-9 w-9 place-items-center rounded-full text-[#B8BABF] active:scale-[0.97]" onClick={onOpen} aria-label="Открыть расписание"><ChevronRight size={22} /></button>
      </div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button className="inline-flex min-h-9 min-w-0 items-center gap-2 rounded-full bg-[#EEF0FA] px-3 text-[13px] font-semibold text-[#1F2BD8] active:scale-[0.98]" onClick={onOpen}>
          <StudentAvatar name={selectedInstructor?.name ?? 'Инструктор'} src={selectedInstructor ? getInstructorPhoto(selectedInstructor) : undefined} size={24} />
          <span className="truncate">{selectedInstructor ? formatInstructorName(selectedInstructor.name) : 'Выбрать инструктора'}</span>
        </button>
        <button className="shrink-0 text-[13px] font-semibold text-[#8B8D94]" onClick={onOpen}>Сменить</button>
      </div>
      <div className="mb-3"><FilterChips value={lessonFilter} onChange={onLessonFilterChange} /></div>
      <div className="mb-3 flex items-center justify-between px-1">
        <button onClick={() => onSelect(addDays(selectedDate, -7))} aria-label="Предыдущая неделя"><ChevronLeft size={22} /></button>
        <p className="text-[21px] font-bold capitalize tracking-[-0.02em] text-[#050609]">{format(startOfMonth(selectedDate), 'LLLL yyyy', { locale: ru })}</p>
        <button onClick={() => onSelect(addDays(selectedDate, 7))} aria-label="Следующая неделя"><ChevronRight size={22} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const active = isSameDay(date, selectedDate)
          const hasSlots = slots.some((slot) => isSameDay(parseISO(slot.date), date))
          return (
            <button key={date.toISOString()} className={cn('grid place-items-center rounded-[18px] text-center active:scale-[0.98]', active ? 'bg-[#1F2BD8] text-white' : 'text-[#050609]')} style={{ minHeight: 68, minWidth: 42 }} onClick={() => { onSelect(date); onOpen?.() }}>
              <span className="text-[12px] font-semibold uppercase">{weekdayShort(date)}</span>
              <span className="text-[20px] font-bold leading-6">{format(date, 'd')}</span>
              <span className={cn('h-1.5 w-1.5 rounded-full', hasSlots ? active ? 'bg-white' : 'bg-[#35C45A]' : 'bg-transparent')} />
            </button>
          )
        })}
      </div>
      <InstructorChips instructors={instructors} selectedId={selectedInstructor?.id ?? ''} onChange={onInstructorChange} />
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {daySlots.length > 0 ? daySlots.map((slot) => <AvailableSlotCard key={slot.id} slot={slot} instructor={selectedInstructor} onBook={() => onBook(slot)} compact />) : <div className="min-w-[240px] rounded-[20px] bg-[#F7F8FA] p-4 text-[14px] font-semibold text-[#8B8D94]">Нет окон по выбранному фильтру</div>}
      </div>
    </div>
  )
}

function MonthCalendar({ selectedDate, onSelect, slots }: { selectedDate: Date; onSelect: (date: Date) => void; slots: Slot[] }) {
  const monthStart = startOfMonth(selectedDate)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
  })
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-bold capitalize tracking-[-0.02em] text-[#050609]">{format(monthStart, 'LLLL yyyy', { locale: ru })}</h2>
        <div className="flex gap-5">
          <button className="active:scale-[0.97]" onClick={() => onSelect(addDays(monthStart, -1))} aria-label="Предыдущий месяц"><ChevronLeft size={24} /></button>
          <button className="active:scale-[0.97]" onClick={() => onSelect(addDays(endOfMonth(monthStart), 1))} aria-label="Следующий месяц"><ChevronRight size={24} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-2 rounded-[22px] bg-white px-3 py-4">
        {weekdays.map((day, index) => <div key={day} className={cn('text-center text-[13px] font-bold', index > 4 ? 'text-[#1F2BD8]' : 'text-[#8F9197]')}>{day}</div>)}
        {days.map((date) => {
          const active = isSameDay(date, selectedDate)
          const currentMonth = isSameMonth(date, selectedDate)
          const hasSlots = slots.some((slot) => isSameDay(parseISO(slot.date), date) && slot.status === 'available')
          const weekend = [0, 6].includes(date.getDay())
          return (
            <button key={date.toISOString()} className="grid min-h-[38px] place-items-center text-center active:scale-[0.96]" onClick={() => onSelect(date)}>
              <span className={cn('grid h-8 w-8 place-items-center rounded-full text-[17px] font-bold', active ? 'bg-[#050609] text-white' : currentMonth ? weekend ? 'text-[#1F2BD8]' : 'text-[#050609]' : 'text-[#D6D8DD]')}>{format(date, 'd')}</span>
              <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', hasSlots ? 'bg-[#35C45A]' : 'bg-transparent')} />
            </button>
          )
        })}
      </div>
    </section>
  )
}

function TheoryCard({ title, text, tone, icon: Icon }: { title: string; text: string; tone: string; icon: typeof BookOpen }) {
  return (
    <article className="relative min-h-[154px] overflow-hidden rounded-[22px] p-4" style={{ background: tone }}>
      <h3 className="text-[21px] font-bold leading-tight tracking-[-0.02em] text-[#050609]">{title}</h3>
      <p className="mt-2 whitespace-pre-line text-[15px] font-medium leading-5 text-[#8B8D94]">{text}</p>
      <div className="absolute bottom-3 right-3 grid h-12 w-12 place-items-center rounded-[18px] bg-white/70 text-[#1F2BD8]">
        <Icon size={25} />
      </div>
    </article>
  )
}

export function StudentPage() {
  const navigate = useNavigate()
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [view, setView] = useState<View>('home')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedInstructorId, setSelectedInstructorId] = useState('')
  const [lessonFilter, setLessonFilter] = useState<LessonFilter>('all')
  const [form, setForm] = useState({ name: '', phone: '', email: '' })

  useEffect(() => {
    const found = findAnyStudentProfile()
    const nextSchool = found ? db.schools.byId(found.schoolId) : db.schools.bySlug('virazh')
    const nextProfile = found?.profile ?? (nextSchool ? loadStudentProfile(nextSchool.id) : null)
    setSchool(nextSchool)
    setProfile(nextProfile)
    if (nextProfile) {
      setForm({ name: nextProfile.name, phone: normalizePhone(nextProfile.phone).replace(/^7/, '').slice(0, 10), email: nextProfile.email ?? '' })
    } else {
      navigate('/student/register', { replace: true })
    }
  }, [navigate])

  const normalizedPhone = profile ? normalizePhone(profile.phone) : ''
  const student = school && normalizedPhone ? db.students.byNormalizedPhone(school.id, normalizedPhone) : null
  const progress = student ? loadStudentProgress(student.id) : null
  const bookings = useMemo(() => school && profile ? resolveBookings(school.id, profile) : [], [school, profile])
  const upcoming = bookings.filter((item) => item.booking.status === 'active' && item.slot && new Date(`${item.slot.date}T${item.slot.time}:00`).getTime() >= Date.now())
  const futureSlots = useMemo(() => school ? db.slots.bySchool(school.id).filter((slot) => new Date(`${slot.date}T${slot.time}:00`).getTime() > Date.now()) : [], [school])
  const instructors = useMemo(() => school ? db.instructors.bySchool(school.id).filter((instructor) => instructor.isActive) : [], [school])
  const selectedInstructor = instructors.find((instructor) => instructor.id === selectedInstructorId) ?? instructors[0] ?? null
  const slotsForDate = futureSlots.filter((slot) => isSameDay(parseISO(slot.date), selectedDate))
  const availableSlotsForDate = filterSlots(slotsForDate.filter((slot) => slot.status === 'available'), selectedInstructor?.id ?? '', lessonFilter)

  useEffect(() => {
    const firstAvailable = futureSlots.find((slot) => slot.status === 'available')
    if (firstAvailable && slotsForDate.filter((slot) => slot.status === 'available').length === 0) setSelectedDate(parseISO(firstAvailable.date))
  }, [futureSlots, slotsForDate])

  useEffect(() => {
    if (selectedInstructorId) return
    const instructorWithSlot = slotsForDate.find((slot) => slot.status === 'available')?.instructorId ?? futureSlots.find((slot) => slot.status === 'available')?.instructorId
    if (instructorWithSlot) setSelectedInstructorId(instructorWithSlot)
    else if (instructors[0]) setSelectedInstructorId(instructors[0].id)
  }, [futureSlots, instructors, selectedInstructorId, slotsForDate])

  if (!school || !profile) return <div className="min-h-dvh bg-[#F5F6F8]" />

  async function saveProfileData(nextAvatarUrl = profile?.avatarUrl ?? '') {
    if (!school || !profile) return
    const saved = saveStudentProfile(school.id, { name: form.name, phone: form.phone, email: form.email, avatarUrl: nextAvatarUrl }, { ...profile, avatarUrl: nextAvatarUrl, email: form.email })
    setProfile(saved)
    db.students.upsert({
      id: student?.id ?? `stu-${normalizePhone(form.phone)}`,
      schoolId: school.id,
      name: saved.name,
      phone: saved.phone,
      normalizedPhone: saved.phone,
      email: saved.email,
      avatarUrl: saved.avatarUrl,
      createdAt: student?.createdAt ?? new Date().toISOString(),
    })
    void updateStudentProfileInSupabase({ schoolId: school.id, name: saved.name, phone: saved.phone, email: saved.email, password: '', avatarUrl: saved.avatarUrl }).catch(() => undefined)
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file) return
    const avatarUrl = await imageFileToDataUrl(file)
    await saveProfileData(avatarUrl)
  }

  function logout() {
    if (!school) return
    removeStudentProfile(school.id)
    setProfile(null)
    navigate('/student/register', { replace: true })
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#F5F6F8] text-[#050609]">
      <main className="mx-auto w-full max-w-[430px] px-4 pb-32 pt-5">
        {view === 'home' ? (
          <section className="space-y-6">
            <header className="flex items-center justify-between gap-3 pt-1">
              <button className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] text-left active:scale-[0.98]" onClick={() => setView('profile')}>
                <StudentAvatar name={profile.name} src={profile.avatarUrl} size={48} />
                <div className="min-w-0">
                  <p className="truncate text-[18px] font-bold leading-5 text-[#050609]">{compactStudentName(profile.name)}</p>
                  <p className="mt-1 text-[14px] font-medium leading-5 text-[#8B8D94]">Категория B</p>
                </div>
              </button>
              <button className="grid place-items-center active:scale-[0.97]" style={{ minHeight: 48, minWidth: 48 }} onClick={() => navigate(`/school/${school.slug}`)} aria-label="Автошкола">
                <SchoolLogo school={school} />
              </button>
            </header>

            <section className="rounded-[24px] p-5" style={{ background: 'linear-gradient(110deg, #F7C8E5, #FFE4DD)' }}>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-[#050609]">Расчёты пока не подключены</h2>
                <Wallet size={44} className="shrink-0 text-[#F3AFC0]" />
              </div>
              <p className="mt-3 text-[15px] font-medium leading-5 text-[#050609]/70">Когда автошкола добавит платежи, здесь появится баланс</p>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className={sectionTitle}>Мои записи</h2>
                <button className="grid h-10 w-10 place-items-center rounded-full text-[#B8BABF]" onClick={() => setView('schedule')}><ChevronRight size={24} /></button>
              </div>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {upcoming.length > 0 ? upcoming.map((item) => <BookingLessonCard key={item.booking.id} item={item} onBook={() => navigate('/student/book')} />) : <div className="w-full shrink-0"><BookingLessonCard item={null} onBook={() => navigate('/student/book')} /></div>}
              </div>
            </section>

            <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} slots={futureSlots} selectedInstructor={selectedInstructor} instructors={instructors} lessonFilter={lessonFilter} onLessonFilterChange={setLessonFilter} onInstructorChange={setSelectedInstructorId} onOpen={() => setView('schedule')} onBook={(slot) => navigate(`/student/book?slot=${slot.id}`)} />
          </section>
        ) : null}

        {view === 'schedule' ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between pt-2">
              <h1 className={pageTitle}>Расписание</h1>
              <button className="grid h-11 w-11 place-items-center rounded-full bg-white"><Filter size={22} /></button>
            </div>
            <div className="space-y-3">
              <InstructorChips instructors={instructors} selectedId={selectedInstructor?.id ?? ''} onChange={setSelectedInstructorId} />
              <FilterChips value={lessonFilter} onChange={setLessonFilter} />
            </div>
            <MonthCalendar selectedDate={selectedDate} onSelect={setSelectedDate} slots={filterSlots(futureSlots, selectedInstructor?.id ?? '', lessonFilter)} />
            <div>
              <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#050609]">{selectedDayTitle(selectedDate)}</h2>
              <div className="mt-4 space-y-3">
                {availableSlotsForDate.slice(0, 8).map((slot) => <AvailableSlotCard key={slot.id} slot={slot} instructor={db.instructors.byId(slot.instructorId)} onBook={() => navigate(`/student/book?slot=${slot.id}`)} />)}
                {availableSlotsForDate.length === 0 ? <BookingLessonCard item={null} onBook={() => navigate('/student/book')} /> : null}
              </div>
            </div>
          </section>
        ) : null}

        {view === 'theory' ? (
          <section className="space-y-4 pt-2">
            <h1 className={pageTitle}>Теория</h1>
            <section className="relative overflow-hidden rounded-[24px] bg-[#CFE7FA] p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#050609]">Теоретический курс</h2>
                <span className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-[#1F2BD8]">Прогресс {progress ? Math.round((progress.theoryTopicsCompleted / progress.theoryTopicsTotal) * 100) : 0}%</span>
              </div>
              <p className="mt-8 text-[18px] font-bold text-[#050609]">{progress ? `${progress.theoryTopicsCompleted} из ${progress.theoryTopicsTotal} тем изучено` : '0 из 0 тем изучено'}</p>
              <div className="mt-3 h-2 rounded-full bg-white/80"><div className="h-full rounded-full bg-[#1F2BD8]" style={{ width: progress ? `${Math.round((progress.theoryTopicsCompleted / progress.theoryTopicsTotal) * 100)}%` : '0%' }} /></div>
            </section>
            <div className="grid grid-cols-2 gap-2.5">
              <TheoryCard title="Тестирование" text={'Промежуточные\nзачёты и экзамены'} tone="#F3E9D8" icon={GraduationCap} />
              <TheoryCard title="Тренировки" text={'Подготовка\nпо билетам'} tone="#F5D8DF" icon={BookOpen} />
              <TheoryCard title="ПДД" text={'Официальный\nтекст правил'} tone="#E3F0EC" icon={FileText} />
              <TheoryCard title="Материалы" text={'Полезные\nматериалы'} tone="#E3E4F4" icon={Gift} />
            </div>
          </section>
        ) : null}

        {view === 'chat' ? (
          <section className="space-y-5 pt-2">
            <h1 className={pageTitle}>Чаты</h1>
            {[
              { title: school.name, text: 'Вопросы по обучению и расписанию', icon: Building2, pinned: true },
              { title: upcoming[0]?.instructor ? formatInstructorName(upcoming[0].instructor.name) : 'Инструктор', text: upcoming[0]?.instructor ? 'Связь по занятию' : 'Появится после назначения', icon: CarFront, pinned: true },
              { title: 'Автошкола-Контроль', text: 'Уведомления и статусы', icon: Bell, badge: 0 },
            ].map((chat) => (
              <button key={chat.title} className="flex min-h-[78px] w-full items-center gap-3 border-b border-[#DDE0E5] text-left">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[#1F2BD8]"><chat.icon size={24} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[20px] font-bold text-[#050609]">{chat.title}</span>
                  <span className="mt-1 block truncate text-[15px] font-medium text-[#8B8D94]">{chat.text}</span>
                </span>
                {chat.badge ? <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1F2BD8] text-[12px] font-bold text-white">{chat.badge}</span> : null}
              </button>
            ))}
          </section>
        ) : null}

        {view === 'profile' ? (
          <section className="space-y-5 pt-2">
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadPhoto(event.target.files?.[0])} />
            <div className="flex justify-end"><button className="grid h-11 w-11 place-items-center rounded-full bg-white"><UserRound size={22} /></button></div>
            <div className="text-center">
              <button className="relative mx-auto block" onClick={() => photoInputRef.current?.click()}>
                <StudentAvatar name={profile.name} src={profile.avatarUrl} size={88} />
                <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-[#1F2BD8] text-white"><Camera size={15} /></span>
              </button>
              <h1 className="mt-4 text-[28px] font-bold tracking-[-0.02em] text-[#050609]">{compactStudentName(profile.name)}</h1>
              <p className="mt-1 text-[15px] font-medium text-[#8B8D94]">Логин: {normalizePhone(profile.phone).slice(-9)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Расчеты', icon: CreditCard, onClick: () => setView('theory') },
                { label: 'Вождение', icon: CarFront, onClick: () => setView('schedule') },
                { label: 'Инфо', icon: Building2, onClick: () => navigate(`/school/${school.slug}`) },
              ].map((item) => <button key={item.label} className={cn(card, 'grid place-items-center p-3 text-[16px] font-semibold text-[#050609]')} style={{ minHeight: 88 }} onClick={item.onClick}><span className="grid h-10 w-10 place-items-center rounded-full bg-[#F0F1FB] text-[#1F2BD8]"><item.icon size={21} /></span>{item.label}</button>)}
            </div>
            <section className={cn(card, 'space-y-4 p-5')}>
              <Input label="ФИО" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <PhoneInput label="Телефон" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
              <Input label="Email, если понадобится" type="email" value={form.email} placeholder="mail@example.com" onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <Button size="lg" className="w-full rounded-[18px] text-[16px]" onClick={() => void saveProfileData()}>Сохранить</Button>
            </section>
            <section className="space-y-2.5">
              {[
                { label: 'Автошкола', icon: Building2, onClick: () => navigate(`/school/${school.slug}`) },
                { label: 'Данные для Госуслуг', icon: FileText, onClick: () => undefined },
                { label: 'Акции и предложения', icon: Gift, onClick: () => undefined },
                { label: 'Настройки', icon: Settings, onClick: () => undefined },
              ].map((item) => <button key={item.label} className={cn(card, 'flex w-full items-center gap-3 px-4 text-left')} style={{ minHeight: 64 }} onClick={item.onClick}><item.icon className="text-[#1F2BD8]" size={22} /><span className="min-w-0 flex-1 text-[18px] font-semibold text-[#050609]">{item.label}</span><ChevronRight className="text-[#B8BABF]" size={21} /></button>)}
            </section>
            <button className="flex items-center gap-3 px-2 text-[16px] font-semibold text-[#8B8D94]" style={{ minHeight: 48 }} onClick={logout}><LogOut size={20} />Выйти из профиля</button>
          </section>
        ) : null}
      </main>

      <BottomNav items={[
        { key: 'home', label: 'Главная', icon: <Home size={25} />, active: view === 'home', onClick: () => setView('home') },
        { key: 'schedule', label: 'Расписание', icon: <CalendarDays size={25} />, active: view === 'schedule', onClick: () => setView('schedule') },
        { key: 'theory', label: 'Теория', icon: <BookOpen size={25} />, active: view === 'theory', onClick: () => setView('theory') },
        { key: 'chat', label: 'Чат', icon: <MessageCircle size={25} />, active: view === 'chat', onClick: () => setView('chat') },
        { key: 'profile', label: 'Профиль', icon: <UserRound size={25} />, active: view === 'profile', onClick: () => setView('profile') },
      ]} />
    </div>
  )
}
