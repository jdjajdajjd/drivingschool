import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BellDotIcon,
  Calendar03Icon,
  Camera02Icon,
  CheckmarkCircle02Icon,
  Car04Icon,
  Comment01Icon,
  File02Icon,
  FilterHorizontalIcon,
  Home07Icon,
  Logout03Icon,
  PencilEdit02Icon,
  School01Icon,
  SmartPhone01Icon,
  SparklesIcon,
  Settings02Icon,
  User03Icon,
  ZapIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons'
import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { BottomNav } from '../components/ui/BottomNav'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { db, findSchoolByIdAcrossNamespaces, findSchoolNamespaceById, setDataNamespace } from '../services/storage'
import { cancelBooking, createBooking, isValidRussianPhone, normalizePhone } from '../services/bookingService'
import { useToast } from '../components/ui/Toast'
import { createSupabaseBooking, updateStudentProfileInSupabase } from '../services/supabasePublicService'
import { DEMO_SCHOOL_SLUG } from '../services/schoolRoutes'
import {
  findAnyStudentProfile,
  loadStudentDocuments,
  loadStudentProfile,
  loadStudentProgress,
  loadLessonDescription,
  removeStudentProfile,
  saveStudentProfile,
  createStudentRequest,
  studentDocumentLabels,
  studentDocumentStatusLabels,
  type StudentProfile,
} from '../services/studentProfile'
import { getInstructorPhoto } from '../services/instructorPhotos'
import type { Booking, Instructor, School, Slot } from '../types'
import { cn, formatInstructorName } from '../lib/utils'
import { normalizePersonName } from '../lib/nameFormat'
import type { InfoSheet, LessonFilter, ProfileField, ResolvedStudentBooking, StudentView } from './student/studentTypes'
import { compactStudentName, filterSlots, formatDateValue, imageFileToDataUrl, lessonTime, resolveBookings, safePercent, selectedDayTitle, selectedInstructorStorageKey, weekdayShort } from './student/studentUtils'
import { AvailableSlotCard, BookingLessonCard, LessonDetailsCard, SchoolLogo, StatusPill, StudentAvatar } from './student/components/CoreCards'
import { InfoSheetPanel } from './student/components/InfoSheetPanel'

void React

const Bell = createHugeIcon(BellDotIcon)
const Building2 = createHugeIcon(School01Icon)
const CalendarDays = createHugeIcon(Calendar03Icon)
const Camera = createHugeIcon(Camera02Icon)
const CarFront = createHugeIcon(Car04Icon)
const CheckCircle = createHugeIcon(CheckmarkCircle02Icon)
const ChevronLeft = createHugeIcon(ArrowLeft01Icon)
const ChevronRight = createHugeIcon(ArrowRight01Icon)
const FileText = createHugeIcon(File02Icon)
const Filter = createHugeIcon(FilterHorizontalIcon)
const Gift = createHugeIcon(SparklesIcon)
const Home = createHugeIcon(Home07Icon)
const LogOut = createHugeIcon(Logout03Icon)
const MessageCircle = createHugeIcon(Comment01Icon)
const Pencil = createHugeIcon(PencilEdit02Icon)
const Phone = createHugeIcon(SmartPhone01Icon)
const Settings = createHugeIcon(Settings02Icon)
const UserRound = createHugeIcon(User03Icon)
const Zap = createHugeIcon(ZapIcon)

const fallbackSchool: School = {
  id: 'school-virazh',
  name: 'Автошкола «Вираж»',
  slug: DEMO_SCHOOL_SLUG,
  description: '',
  phone: '',
  email: '',
  address: '',
  createdAt: '',
  isActive: true,
}

const card = 'rounded-[24px] border border-white/70 bg-[rgba(255,255,255,0.72)] shadow-[var(--shadow-card)] backdrop-blur-2xl'
const pageTitle = 'text-[24px] font-medium leading-tight text-[var(--text)]'
const sectionTitle = 'text-[19px] font-medium leading-tight text-[var(--text)]'

function HorizontalScroller({ children, className, contentClassName, step = 280 }: { children: React.ReactNode; className?: string; contentClassName?: string; step?: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function updateScrollState() {
    const element = ref.current
    if (!element) return
    setCanScrollLeft(element.scrollLeft > 4)
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 4)
  }

  useEffect(() => {
    updateScrollState()
    const element = ref.current
    if (!element) return
    element.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)
    return () => {
      element.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [children])

  function scrollByDirection(direction: -1 | 1) {
    ref.current?.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  return (
    <div className={cn('relative', className)}>
      {canScrollLeft ? (
        <button type="button" className="absolute left-1 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-[rgba(255,255,255,0.76)] text-[var(--text)] shadow-[0_8px_24px_rgba(15,20,25,0.06)] backdrop-blur-xl active:scale-[0.96]" onClick={() => scrollByDirection(-1)} aria-label="Прокрутить влево">
          <ChevronLeft size={17} />
        </button>
      ) : null}
      <div ref={ref} className={cn('no-scrollbar overflow-x-auto scroll-smooth', contentClassName)}>
        {children}
      </div>
      {canScrollRight ? (
        <button type="button" className="absolute right-1 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-[rgba(255,255,255,0.76)] text-[var(--text)] shadow-[0_8px_24px_rgba(15,20,25,0.06)] backdrop-blur-xl active:scale-[0.96]" onClick={() => scrollByDirection(1)} aria-label="Прокрутить вправо">
          <ChevronRight size={17} />
        </button>
      ) : null}
    </div>
  )
}

function FilterChips({ value, onChange }: { value: LessonFilter; onChange: (value: LessonFilter) => void }) {
  const items: Array<{ value: LessonFilter; label: string }> = [
    { value: 'all', label: 'Все' },
    { value: 'main', label: 'Основное' },
    { value: 'extra', label: 'Дополнительное' },
  ]
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {items.map((item, index) => (
        <button key={item.value} className="inline-flex min-h-9 shrink-0 items-center rounded-full border px-4 text-[14px] font-semibold text-[#111315] active:scale-[0.98]" style={{ borderColor: value === item.value ? '#111315' : '#E1E2DE' }} onClick={() => onChange(item.value)}>
          {index > 0 ? <span className={cn('mr-2 h-2 w-2 rounded-full', index === 1 ? 'bg-[#247A4B]' : 'bg-[#C4935A]')} /> : null}
          {item.label}
        </button>
      ))}
    </div>
  )
}

function InstructorChips({ instructors, selectedId, assignedId, onChange }: { instructors: Instructor[]; selectedId: string; assignedId?: string; onChange: (id: string) => void }) {
  const ordered = [...instructors].sort((left, right) => Number(right.id === selectedId) - Number(left.id === selectedId))
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {ordered.map((instructor) => {
        const active = instructor.id === selectedId
        const assigned = instructor.id === assignedId
        return (
          <button key={instructor.id} className={cn('inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-medium active:scale-[0.98]', active ? 'border-[rgba(17,19,21,0.08)] bg-[rgba(255,255,255,0.86)] text-[var(--text)] shadow-[0_8px_24px_rgba(15,20,25,0.06)]' : 'border-white/60 bg-[rgba(255,255,255,0.52)] text-[var(--text)]')} onClick={() => onChange(instructor.id)}>
            <StudentAvatar name={instructor.name} src={getInstructorPhoto(instructor)} size={24} fallback="male" />
            {formatInstructorName(instructor.name)}
            {assigned ? <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-[var(--text)]">Ваш</span> : null}
          </button>
        )
      })}
    </div>
  )
}

function ScheduleEmptyState({ onShowAll, onChangeInstructor }: { onShowAll: () => void; onChangeInstructor: () => void }) {
  return (
    <section className={cn(card, 'p-4')}>
      <div className="mb-3 h-1 w-10 rounded-full bg-[var(--text)]/80" />
      <h3 className="text-[18px] font-semibold text-[var(--text)]">На этот день окон нет</h3>
      <p className="mt-2 text-[14px] font-medium leading-5 text-[var(--text-muted)]">Можно показать все типы занятий или быстро сменить инструктора.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="min-h-11 rounded-[16px] border border-white/60 bg-[rgba(255,255,255,0.64)] text-[14px] font-medium text-[var(--text)] shadow-[0_6px_20px_rgba(20,24,32,0.03)] active:scale-[0.98]" onClick={onShowAll}>Показать все</button>
        <button className="min-h-11 rounded-[16px] border border-white/60 bg-[rgba(255,255,255,0.5)] text-[14px] font-medium text-[var(--text)] shadow-[0_6px_20px_rgba(20,24,32,0.03)] active:scale-[0.98]" onClick={onChangeInstructor}>Инструктор</button>
      </div>
    </section>
  )
}

function InstructorSheet({ open, instructors, selectedId, assignedId, onSelect, onClose }: { open: boolean; instructors: Instructor[]; selectedId: string; assignedId?: string; onSelect: (id: string) => void; onClose: () => void }) {
  if (!open) return null
  const ordered = [...instructors].sort((left, right) => Number(right.id === selectedId) - Number(left.id === selectedId) || Number(right.id === assignedId) - Number(left.id === assignedId))
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 px-3 py-5" onClick={onClose}>
      <section className="mx-auto max-h-[82vh] w-full max-w-[430px] overflow-y-auto rounded-[28px] border border-white/60 bg-[rgba(255,255,255,0.84)] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)] backdrop-blur-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[19px] font-semibold text-[var(--text)]">Выберите инструктора</h2>
          <button className="rounded-full px-3 py-2 text-[14px] font-medium text-[var(--text-muted)]" onClick={onClose}>Закрыть</button>
        </div>
        <div className="max-h-[55vh] space-y-2 overflow-y-auto">
          {ordered.map((instructor) => {
            const active = instructor.id === selectedId
            const assigned = instructor.id === assignedId
            return (
              <button key={instructor.id} className={cn('flex min-h-[58px] w-full items-center gap-3 rounded-[18px] border border-white/60 px-3 text-left shadow-[0_6px_20px_rgba(20,24,32,0.03)] active:scale-[0.99]', active ? 'bg-[rgba(255,255,255,0.82)]' : 'bg-[rgba(255,255,255,0.54)]')} onClick={() => { onSelect(instructor.id); onClose() }}>
                <StudentAvatar name={instructor.name} src={getInstructorPhoto(instructor)} size={38} fallback="male" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-[var(--text)]">{formatInstructorName(instructor.name)}</span>
                  <span className="mt-0.5 block truncate text-[13px] font-medium text-[#74787D]">{assigned ? 'Закреплен за вами' : instructor.car ?? 'Учебный автомобиль'}</span>
                </span>
                {active ? <StatusPill tone="blue">{assigned ? 'Ваш' : 'Выбран'}</StatusPill> : null}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function MiniCalendar({ selectedDate, onSelect, slots, selectedInstructor, lessonFilter, onLessonFilterChange, onInstructorClick, onOpen, onBook }: { selectedDate: Date; onSelect: (date: Date) => void; slots: Slot[]; selectedInstructor: Instructor | null; lessonFilter: LessonFilter; onLessonFilterChange: (filter: LessonFilter) => void; onInstructorClick: () => void; onOpen?: () => void; onBook: (slot: Slot) => void }) {
  const days = Array.from({ length: 21 }, (_, index) => addDays(new Date(), index))
  const daySlots = filterSlots(slots.filter((slot) => slot.status === 'available' && isSameDay(parseISO(slot.date), selectedDate)), selectedInstructor?.id ?? '', lessonFilter).slice(0, 12)
  return (
    <div className={cn(card, 'p-4')}>
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-[22px] font-bold tracking-[-0.02em] text-[#111315]">Расписание автошколы</h3>
        <button className="grid h-9 w-9 place-items-center rounded-full text-[#A0A5A8] active:scale-[0.97]" onClick={onOpen} aria-label="Открыть расписание"><ChevronRight size={22} /></button>
      </div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button className="inline-flex min-h-9 min-w-0 items-center gap-2 rounded-full bg-[#ECEFF1] px-3 text-[13px] font-semibold text-[#111315] active:scale-[0.98]" onClick={onInstructorClick}>
          <StudentAvatar name={selectedInstructor?.name ?? 'Инструктор'} src={selectedInstructor ? getInstructorPhoto(selectedInstructor) : undefined} size={24} fallback="male" />
          <span className="truncate">{selectedInstructor ? formatInstructorName(selectedInstructor.name) : 'Выбрать инструктора'}</span>
        </button>
        <button className="shrink-0 text-[13px] font-semibold text-[#74787D]" onClick={onInstructorClick}>Сменить</button>
      </div>
      <div className="mb-3"><FilterChips value={lessonFilter} onChange={onLessonFilterChange} /></div>
      <div className="mb-3 flex items-center justify-between px-1">
        <button onClick={() => onSelect(addDays(selectedDate, -7))} aria-label="Предыдущая неделя"><ChevronLeft size={22} /></button>
        <p className="text-[21px] font-bold capitalize tracking-[-0.02em] text-[#111315]">{format(startOfMonth(selectedDate), 'LLLL yyyy', { locale: ru })}</p>
        <button onClick={() => onSelect(addDays(selectedDate, 7))} aria-label="Следующая неделя"><ChevronRight size={22} /></button>
      </div>
      <HorizontalScroller className="-mx-4" contentClassName="px-4 pb-1" step={336}>
        <div className="flex gap-1">
          {days.map((date) => {
            const active = isSameDay(date, selectedDate)
            const hasSlots = slots.some((slot) => isSameDay(parseISO(slot.date), date))
            return (
              <button key={date.toISOString()} className={cn('grid shrink-0 place-items-center rounded-[18px] text-center active:scale-[0.98]', active ? 'bg-[#111315] text-white' : 'text-[#111315]')} style={{ flexBasis: 'calc((100% - 24px) / 7)', minHeight: 68, minWidth: 44 }} onClick={() => onSelect(date)}>
                <span className="text-[12px] font-semibold uppercase">{weekdayShort(date)}</span>
                <span className="text-[20px] font-bold leading-6">{format(date, 'd')}</span>
                <span className={cn('h-1.5 w-1.5 rounded-full', hasSlots ? active ? 'bg-white' : 'bg-[#247A4B]' : 'bg-transparent')} />
              </button>
            )
          })}
        </div>
      </HorizontalScroller>
      <HorizontalScroller className="-mx-4 mt-3" contentClassName="px-4 pb-1" step={272}>
        <div className="flex gap-2">
          {daySlots.length > 0 ? daySlots.map((slot) => <AvailableSlotCard key={slot.id} slot={slot} instructor={selectedInstructor} onBook={() => onBook(slot)} compact />) : <div className="min-w-[260px] rounded-[20px] bg-[#F7FAFD] p-4 text-[14px] font-medium text-[#6D7A88]">Нет окон по фильтру. Попробуйте другой тип занятия или инструктора.</div>}
        </div>
      </HorizontalScroller>
    </div>
  )
}

function MonthCalendar({ selectedDate, onSelect, slots }: { selectedDate: Date; onSelect: (date: Date) => void; slots: Slot[] }) {
  const monthStart = startOfMonth(selectedDate)
  const previousMonth = addDays(monthStart, -1)
  const nextMonth = addDays(endOfMonth(monthStart), 1)
  const hasPreviousMonthSlots = slots.some((slot) => isSameMonth(parseISO(slot.date), previousMonth))
  const hasNextMonthSlots = slots.some((slot) => isSameMonth(parseISO(slot.date), nextMonth))
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
  })
  const weekdays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-bold capitalize tracking-[-0.02em] text-[#111315]">{format(monthStart, 'LLLL yyyy', { locale: ru })}</h2>
        <div className="flex gap-5">
          <button className={cn('active:scale-[0.97]', hasPreviousMonthSlots ? 'text-[#111315]' : 'text-[#C8CDC9]')} disabled={!hasPreviousMonthSlots} onClick={() => onSelect(previousMonth)} aria-label="Предыдущий месяц"><ChevronLeft size={24} /></button>
          <button className={cn('active:scale-[0.97]', hasNextMonthSlots ? 'text-[#111315]' : 'text-[#C8CDC9]')} disabled={!hasNextMonthSlots} onClick={() => onSelect(nextMonth)} aria-label="Следующий месяц"><ChevronRight size={24} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-2 rounded-[22px] bg-white px-3 py-4">
        {weekdays.map((day, index) => <div key={day} className={cn('text-center text-[13px] font-bold', index > 4 ? 'text-[#111315]' : 'text-[#74787D]')}>{day}</div>)}
        {days.map((date) => {
          const active = isSameDay(date, selectedDate)
          const currentMonth = isSameMonth(date, selectedDate)
          const hasSlots = slots.some((slot) => isSameDay(parseISO(slot.date), date) && slot.status === 'available')
          const weekend = [0, 6].includes(date.getDay())
          return (
            <button key={date.toISOString()} className="grid min-h-[38px] place-items-center text-center active:scale-[0.96]" onClick={() => onSelect(date)}>
              <span className={cn('grid h-8 w-8 place-items-center rounded-full text-[17px] font-bold', active ? 'bg-[#111315] text-white' : currentMonth ? weekend ? 'text-[#111315]' : 'text-[#111315]' : 'text-[#C8CDC9]')}>{format(date, 'd')}</span>
              <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', hasSlots ? 'bg-[#247A4B]' : 'bg-transparent')} />
            </button>
          )
        })}
      </div>
    </section>
  )
}

function EditableTextField({ label, value, type = 'text', locked, onEdit, onChange }: { label: string; value: string; type?: string; locked: boolean; onEdit: () => void; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <Input label={label} type={type} value={value} disabled={locked} onChange={(event) => onChange(event.target.value)} className={cn(locked && 'pr-12 text-[#6F747A]')} />
      {locked ? (
        <button type="button" className="absolute right-2 top-[30px] grid h-9 w-9 place-items-center rounded-full text-[#74787D]/70 active:scale-[0.94]" onClick={onEdit} aria-label={`Изменить ${label}`}>
          <Pencil size={16} />
        </button>
      ) : null}
    </div>
  )
}

function EditablePhoneField({ label, value, locked, onEdit, onChange }: { label: string; value: string; locked: boolean; onEdit: () => void; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <PhoneInput label={label} value={value} disabled={locked} onChange={onChange} />
      {locked ? (
        <button type="button" className="absolute right-2 top-[30px] grid h-9 w-9 place-items-center rounded-full text-[#74787D]/70 active:scale-[0.94]" onClick={onEdit} aria-label={`Изменить ${label}`}>
          <Pencil size={16} />
        </button>
      ) : null}
    </div>
  )
}

function ProgressBar({ value, tone = '#111315' }: { value: number; tone?: string }) {
  return <div className="h-2 overflow-hidden rounded-full bg-[#EEF0F2]"><div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${value}%`, background: tone }} /></div>
}

function StatCard({ title, value, subtitle, tone = 'blue' }: { title: string; value: string; subtitle: string; tone?: 'blue' | 'green' }) {
  return (
    <article className={cn(card, 'min-h-[128px] p-4')}>
      <p className="text-[15px] font-bold leading-5 text-[#111315]">{title}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <span className={cn('grid h-12 w-12 place-items-center rounded-full text-[18px] font-bold text-white', tone === 'green' ? 'bg-[#247A4B]' : 'bg-[#111315]')}>{value}</span>
        <p className="text-right text-[13px] font-semibold leading-4 text-[#74787D]">{subtitle}</p>
      </div>
    </article>
  )
}

function RoadmapStep({ title, text, done, active }: { title: string; text: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={cn('grid h-8 w-8 place-items-center rounded-full border text-[13px] font-bold', done ? 'border-[#247A4B] bg-[#247A4B] text-white' : active ? 'border-[#111315] bg-[#ECEFF1] text-[#111315]' : 'border-[#E1E2DE] bg-white text-[#A0A5A8]')}>{done ? '✓' : active ? '•' : ''}</span>
        <span className="mt-1 h-8 w-px bg-[#E1E2DE] last:hidden" />
      </div>
      <div className="min-w-0 pb-4">
        <p className="text-[16px] font-bold leading-5 text-[#111315]">{title}</p>
        <p className="mt-1 text-[13px] font-semibold leading-4 text-[#74787D]">{text}</p>
      </div>
    </div>
  )
}


function JustBookedBanner({ item }: { item: ResolvedStudentBooking }) {
  return (
    <section className="animate-[booking-banner-hide_5s_ease-in-out_forwards] overflow-hidden rounded-[24px] border border-[rgba(21,128,61,0.18)] bg-[var(--green-soft)] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[var(--green)] text-white"><CheckCircle size={22} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text)]">Вы записаны</h3>
          <p className="mt-1 text-[15px] font-semibold leading-5 text-[var(--text)]">{lessonTime(item.slot)}</p>
          <p className="mt-1 truncate text-[14px] font-medium text-[var(--text-muted)]">{item.instructor ? formatInstructorName(item.instructor.name) : 'Инструктор'} · {item.branch?.name ?? 'Филиал'}</p>
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/60">
        <div className="h-full w-full origin-left animate-[booking-banner-timer_5s_linear_forwards] rounded-full bg-[var(--green)]" />
      </div>
    </section>
  )
}

export function StudentPage() {
  const navigate = useNavigate()
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [view, setView] = useState<StudentView>('home')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedInstructorId, setSelectedInstructorId] = useState('')
  const [lessonFilter, setLessonFilter] = useState<LessonFilter>('all')
  const [instructorSheetOpen, setInstructorSheetOpen] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [profileError, setProfileError] = useState('')
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState('')
  const [editingFields, setEditingFields] = useState<Record<ProfileField, boolean>>({ name: false, phone: false, email: false })
  const [infoSheet, setInfoSheet] = useState<InfoSheet>(null)
  const [phoneConfirmOpen, setPhoneConfirmOpen] = useState(false)
  const [requestSheetOpen, setRequestSheetOpen] = useState(false)
  const [requestReason, setRequestReason] = useState('')
  const [requestPreferredTime, setRequestPreferredTime] = useState('')
  const [requestComment, setRequestComment] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [bookingSlotId, setBookingSlotId] = useState('')
  const [bookingsVersion, setBookingsVersion] = useState(0)
  const [justBooked, setJustBooked] = useState<ResolvedStudentBooking | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    const found = findAnyStudentProfile()
    const foundNamespace = found ? findSchoolNamespaceById(found.schoolId) : null
    if (foundNamespace) setDataNamespace(foundNamespace)
    else setDataNamespace('demo')

    const nextSchool = found
      ? findSchoolByIdAcrossNamespaces(found.schoolId) ?? (found.schoolId === fallbackSchool.id ? fallbackSchool : null)
      : db.schools.bySlug('virazh') ?? fallbackSchool
    const nextProfile = found?.profile ?? (nextSchool ? loadStudentProfile(nextSchool.id) : null)
    setSchool(nextSchool)
    setProfile(nextProfile)
    if (nextSchool && nextProfile) {
      setForm({ name: nextProfile.name, phone: normalizePhone(nextProfile.phone).replace(/^7/, '').slice(0, 10), email: nextProfile.email ?? '' })
      setPendingAvatarUrl('')
      setEditingFields({ name: false, phone: false, email: false })
    } else {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const normalizedPhone = profile ? normalizePhone(profile.phone) : ''
  const student = school && normalizedPhone ? db.students.byNormalizedPhone(school.id, normalizedPhone) : null
  const progress = student ? loadStudentProgress(student.id) : null
  const documents = student ? loadStudentDocuments(student.id) : []
  const bookings = useMemo(() => school && profile ? resolveBookings(school.id, profile) : [], [school, profile, justBooked?.booking.id, bookingsVersion])
  const upcoming = useMemo(() => {
    const active = bookings.filter((item) => item.booking.status === 'active' && item.slot && new Date(`${item.slot.date}T${item.slot.time}:00`).getTime() >= Date.now())
    if (!justBooked) return active
    return [justBooked, ...active.filter((item) => item.booking.id !== justBooked.booking.id)]
  }, [bookings, justBooked])
  useEffect(() => {
    if (!justBooked) return undefined
    const timer = window.setTimeout(() => setJustBooked(null), 5000)
    return () => window.clearTimeout(timer)
  }, [justBooked?.booking.id])

  const completedLessons = bookings.filter((item) => item.booking.status === 'completed' && item.slot).slice(-3).reverse()
  const futureSlots = useMemo(() => school ? db.slots.bySchool(school.id).filter((slot) => new Date(`${slot.date}T${slot.time}:00`).getTime() > Date.now()) : [], [school, bookings.length, bookingSlotId, bookingsVersion])
  const instructors = useMemo(() => school ? db.instructors.bySchool(school.id).filter((instructor) => instructor.isActive) : [], [school])
  const assignedInstructorId = [student?.assignedInstructorId, profile?.assignedInstructorId].find((id) => id && instructors.some((instructor) => instructor.id === id)) ?? ''
  const selectedInstructor = instructors.find((instructor) => instructor.id === selectedInstructorId) ?? null
  const slotsForDate = futureSlots.filter((slot) => isSameDay(parseISO(slot.date), selectedDate))
  const availableSlotsForDate = filterSlots(slotsForDate.filter((slot) => slot.status === 'available'), selectedInstructor?.id ?? '', lessonFilter)
  const firstAvailableDate = futureSlots[0]?.date ?? ''
  const profileDirty = Boolean(profile && (form.name.trim() !== profile.name || normalizePhone(form.phone) !== normalizePhone(profile.phone) || form.email.trim() !== (profile.email ?? '') || pendingAvatarUrl))
  const drivingTotal = progress?.drivingHoursTotal ?? 0
  const drivingCompleted = progress?.drivingHoursCompleted ?? 0
  const drivingRemaining = Math.max(0, drivingTotal - drivingCompleted)
  const drivingPercent = safePercent(drivingCompleted, drivingTotal)
  const nextLesson = upcoming[0] ?? null

  useEffect(() => {
    if (firstAvailableDate && !isSameDay(parseISO(firstAvailableDate), selectedDate) && slotsForDate.length === 0) {
      setSelectedDate(parseISO(firstAvailableDate))
    }
  }, [firstAvailableDate, selectedDate, slotsForDate.length])

  useEffect(() => {
    if (!school || selectedInstructorId) return
    if (assignedInstructorId) {
      setSelectedInstructorId(assignedInstructorId)
      return
    }
    const storedInstructorId = localStorage.getItem(selectedInstructorStorageKey(school.id)) ?? ''
    if (storedInstructorId && instructors.some((instructor) => instructor.id === storedInstructorId)) {
      setSelectedInstructorId(storedInstructorId)
      return
    }
    if (selectedInstructorId) return
    const instructorWithSlot = slotsForDate.find((slot) => slot.status === 'available')?.instructorId ?? futureSlots.find((slot) => slot.status === 'available')?.instructorId
    if (instructorWithSlot) setSelectedInstructorId(instructorWithSlot)
    else if (instructors[0]) setSelectedInstructorId(instructors[0].id)
  }, [assignedInstructorId, futureSlots, instructors, school, selectedInstructorId, slotsForDate])

  useEffect(() => {
    if (!school || !selectedInstructorId) return
    localStorage.setItem(selectedInstructorStorageKey(school.id), selectedInstructorId)
  }, [school, selectedInstructorId])

  if (!school || !profile) return <div className="min-h-dvh bg-[#F3F7FB]" />


  function cancelStudentBooking(item: ResolvedStudentBooking) {
    if (!school) return
    if (!item.booking.id) return

    const latest = db.bookings.byId(item.booking.id)
    if (latest?.status === 'cancelled') {
      setJustBooked((current) => current?.booking.id === item.booking.id ? null : current)
      setBookingsVersion((current) => current + 1)
      return
    }

    const isDemoSchool = findSchoolNamespaceById(school.id) === 'demo'
    const result = cancelBooking(item.booking.id, { skipRemote: isDemoSchool })
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось отменить занятие.', 'error')
      return
    }
    setJustBooked((current) => current?.booking.id === item.booking.id ? null : current)
    setBookingsVersion((current) => current + 1)
    setBookingSlotId('')
  }

  async function bookSlotNow(slot: Slot) {
    if (!school || !profile || bookingSlotId) return
    setBookingSlotId(slot.id)

    let bookingId = ''
    try {
      if (findSchoolNamespaceById(school.id) === 'demo') throw new Error('Demo uses local booking')
      const remote = await createSupabaseBooking({
        schoolId: school.id,
        studentName: profile.name,
        studentPhone: profile.phone,
        slotIds: [slot.id],
      })
      bookingId = remote.bookingIds[0] ?? ''
    } catch {
      const result = createBooking({
        schoolId: school.id,
        branchId: slot.branchId,
        instructorId: slot.instructorId,
        slotId: slot.id,
        studentName: profile.name,
        studentPhone: profile.phone,
        sessionId: `student-${profile.phone}`,
      })
      if (!result.ok) {
        showToast(result.error ?? 'Не удалось записаться на это время.', 'error')
        setBookingSlotId('')
        return
      }
      bookingId = result.booking?.id ?? ''
    }

    const normalized = normalizePhone(profile.phone)
    const student = db.students.byNormalizedPhone(school.id, normalized)
    const booking: Booking = {
      id: bookingId || `booking-${Date.now()}`,
      schoolId: school.id,
      slotId: slot.id,
      branchId: slot.branchId,
      instructorId: slot.instructorId,
      studentId: student?.id,
      studentName: profile.name,
      studentPhone: normalized,
      studentEmail: profile.email ?? '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    db.bookings.upsert(booking)
    db.slots.upsert({ ...slot, status: 'booked', bookingId: booking.id })
    setBookingsVersion((current) => current + 1)
    setJustBooked({
      booking,
      slot: { ...slot, status: 'booked', bookingId: booking.id },
      instructor: db.instructors.byId(slot.instructorId),
      branch: db.branches.byId(slot.branchId),
    })
    setView('home')
    setBookingSlotId('')
  }

  async function saveProfileData() {
    if (!school || !profile) return
    const email = form.email.trim()
    const phoneChanged = normalizePhone(form.phone) !== normalizePhone(profile.phone)

    const normalizedName = normalizePersonName(form.name)
    if (!normalizedName) {
      setProfileError('Введите ФИО ученика.')
      return
    }

    if (!isValidRussianPhone(form.phone)) {
      setProfileError('Введите корректный номер телефона.')
      return
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setProfileError('Введите корректный email или оставьте поле пустым.')
      return
    }

    if (phoneChanged && !phoneConfirmOpen) {
      setPhoneConfirmOpen(true)
      return
    }

    const nextAvatarUrl = pendingAvatarUrl || profile.avatarUrl || ''
    const saved = saveStudentProfile(school.id, { name: normalizedName, phone: form.phone, email, avatarUrl: nextAvatarUrl }, { ...profile, avatarUrl: nextAvatarUrl, email })
    setProfile(saved)
    setForm({ name: saved.name, phone: normalizePhone(saved.phone).replace(/^7/, '').slice(0, 10), email: saved.email ?? '' })
    setProfileError('')
    setPhoneConfirmOpen(false)
    setPendingAvatarUrl('')
    setEditingFields({ name: false, phone: false, email: false })
    db.students.upsert({
      id: student?.id ?? `stu-${normalizePhone(form.phone)}`,
      schoolId: school.id,
      name: saved.name,
      phone: saved.phone,
      normalizedPhone: saved.phone,
      email: saved.email,
      avatarUrl: saved.avatarUrl,
      assignedBranchId: student?.assignedBranchId ?? saved.assignedBranchId,
      assignedInstructorId: student?.assignedInstructorId ?? saved.assignedInstructorId,
      createdAt: student?.createdAt ?? new Date().toISOString(),
    })
    void updateStudentProfileInSupabase({
      schoolId: school.id,
      name: saved.name,
      phone: saved.phone,
      email: saved.email,
      password: '',
      avatarUrl: saved.avatarUrl,
      categoryCodes: student?.categoryCodes,
      trainingStage: student?.trainingStage,
      groupName: student?.groupName,
      trainingStartDate: student?.trainingStartDate,
      drivingStartDate: student?.drivingStartDate,
      trainingEndDate: student?.trainingEndDate,
      drivingEndDate: student?.drivingEndDate,
    }).catch(() => undefined)
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file) return
    const avatarUrl = await imageFileToDataUrl(file)
    setPendingAvatarUrl(avatarUrl)
  }

  function logout() {
    if (!school) return
    removeStudentProfile(school.id)
    setProfile(null)
    navigate('/login', { replace: true })
  }

  function submitRescheduleRequest() {
    if (!school || !student || !nextLesson?.booking) return
    if (!requestReason.trim()) {
      setRequestMessage('Укажите причину, чтобы администратор понял контекст.')
      return
    }
    createStudentRequest({
      schoolId: school.id,
      studentId: student.id,
      bookingId: nextLesson.booking.id,
      type: 'reschedule',
      reason: requestReason.trim(),
      preferredTime: requestPreferredTime.trim() || undefined,
      comment: requestComment.trim() || undefined,
    })
    setRequestReason('')
    setRequestPreferredTime('')
    setRequestComment('')
    setRequestMessage('Запрос отправлен администратору.')
    setRequestSheetOpen(false)
  }

  return (
    <div className="student-animated student-lite vroom-student-shell min-h-dvh overflow-x-hidden bg-[#F3F7FB] text-[#111315]">
      <main className="vroom-student-main mx-auto w-full max-w-[430px] px-4 pb-[180px] pt-5">
        {view === 'home' ? (
          <section className="space-y-6">
            <header className="vroom-student-header flex items-center justify-between gap-3 pt-1">
              <button className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] text-left active:scale-[0.98]" onClick={() => setView('profile')}>
                <StudentAvatar name={profile.name} src={pendingAvatarUrl || profile.avatarUrl} size={48} />
                <div className="min-w-0">
                  <p className="truncate text-[18px] font-bold leading-5 text-[#111315]">{compactStudentName(profile.name)}</p>
                  <p className="mt-1 text-[14px] font-medium leading-5 text-[#74787D]">Категория B</p>
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                    <button className="grid place-items-center active:scale-[0.97]" style={{ minHeight: 48, minWidth: 48 }} onClick={() => navigate(`/school/${school.slug}`)} aria-label="Автошкола">
                  <SchoolLogo school={school} />
                </button>
              </div>
            </header>

            {justBooked ? <JustBookedBanner item={justBooked} /> : null}

            <section className="vroom-student-section">
              <div className="mb-4 flex items-center justify-between">
                <h2 className={sectionTitle}>Мои записи</h2>
                <button className="grid h-10 w-10 place-items-center rounded-full text-[#A0A5A8]" onClick={() => setView('schedule')}><ChevronRight size={24} /></button>
              </div>
              <HorizontalScroller className="-mx-4" contentClassName="px-4 pb-1" step={312}>
                <div className="flex gap-3">
                  {upcoming.length > 0 ? upcoming.map((item) => <BookingLessonCard key={item.booking.id} item={item} onBook={() => setView('schedule')} onCancel={item.booking.status === 'active' ? () => cancelStudentBooking(item) : undefined} />) : <div className="w-full min-w-[300px] shrink-0"><BookingLessonCard item={null} onBook={() => setView('schedule')} /></div>}
                </div>
              </HorizontalScroller>
            </section>

            <div className="vroom-student-calendar-wrap">
              <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} slots={futureSlots} selectedInstructor={selectedInstructor} lessonFilter={lessonFilter} onLessonFilterChange={setLessonFilter} onInstructorClick={() => setInstructorSheetOpen(true)} onOpen={() => setView('schedule')} onBook={(slot) => void bookSlotNow(slot)} />
            </div>
          </section>
        ) : null}

        {view === 'schedule' ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between pt-2">
              <h1 className={pageTitle}>Расписание</h1>
              <div className="flex items-center gap-2">
                    <button className="grid h-11 w-11 place-items-center rounded-full bg-white active:scale-[0.96]" onClick={() => setInstructorSheetOpen(true)}><Filter size={22} /></button>
              </div>
            </div>
            <section className={cn(card, 'p-4')}>
              <div className="flex items-center gap-3">
                <StudentAvatar name={selectedInstructor?.name ?? 'Инструктор'} src={selectedInstructor ? getInstructorPhoto(selectedInstructor) : undefined} size={44} fallback="male" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-bold text-[#111315]">{selectedInstructor ? formatInstructorName(selectedInstructor.name) : 'Инструктор не выбран'}</p>
                  <p className="mt-1 truncate text-[13px] font-semibold text-[#74787D]">{selectedInstructor?.id === assignedInstructorId ? 'Закреплен за вами' : selectedInstructor?.car ?? 'Выбранный инструктор сохранится'}</p>
                </div>
                <button className="rounded-full bg-[#ECEFF1] px-3 py-2 text-[13px] font-bold text-[#111315] active:scale-[0.98]" onClick={() => setInstructorSheetOpen(true)}>Сменить</button>
              </div>
            </section>
            <div className="space-y-3">
              <InstructorChips instructors={instructors} selectedId={selectedInstructor?.id ?? ''} assignedId={assignedInstructorId} onChange={setSelectedInstructorId} />
              <FilterChips value={lessonFilter} onChange={setLessonFilter} />
            </div>
            <MonthCalendar selectedDate={selectedDate} onSelect={setSelectedDate} slots={filterSlots(futureSlots, selectedInstructor?.id ?? '', lessonFilter)} />
            <div>
              <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#111315]">{selectedDayTitle(selectedDate)}</h2>
              <div className="mt-4 space-y-3">
                {availableSlotsForDate.slice(0, 8).map((slot) => <AvailableSlotCard key={slot.id} slot={slot} instructor={db.instructors.byId(slot.instructorId)} onBook={() => void bookSlotNow(slot)} />)}
                {availableSlotsForDate.length === 0 ? <ScheduleEmptyState onShowAll={() => setLessonFilter('all')} onChangeInstructor={() => setInstructorSheetOpen(true)} /> : null}
              </div>
            </div>
          </section>
        ) : null}

        {view === 'driving' ? (
          <section className="space-y-5 pt-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#111315] active:scale-[0.96]" onClick={() => setView('profile')} aria-label="Назад"><ChevronLeft size={23} /></button>
                <h1 className={pageTitle}>Вождение</h1>
              </div>
              </div>

            <div className="grid grid-cols-2 gap-2.5">
              <StatCard title={'Остаток учебных\nчасов'} value={String(drivingRemaining)} subtitle={`${drivingCompleted} из ${drivingTotal} часов пройдено`} tone="green" />
              <StatCard title={'Пройдено\nзанятий'} value={String(bookings.filter((item) => item.booking.status === 'completed').length)} subtitle="По отметкам автошколы" />
            </div>

            <section className={cn(card, 'p-4')}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] bg-[#ECEFF1] text-[#111315]"><Zap size={21} /></span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[18px] font-bold tracking-[-0.02em] text-[#111315]">Прогресс навыков</h2>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#74787D]">{drivingCompleted} из {drivingTotal} часов освоено</p>
                  </div>
                </div>
                <span className="text-[18px] font-bold text-[#111315]">{drivingPercent}%</span>
              </div>
              <div className="mt-4"><ProgressBar value={drivingPercent} tone="#247A4B" /></div>
            </section>

            <section className={cn(card, 'overflow-hidden p-4')}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-bold tracking-[-0.02em] text-[#111315]">Маршрут обучения</h2>
                  <p className="mt-1 text-[13px] font-semibold text-[#74787D]">Что уже пройдено и что дальше</p>
                </div>
                <span className="rounded-full bg-[#ECEFF1] px-3 py-1.5 text-[13px] font-bold text-[#111315]">{drivingPercent}%</span>
              </div>
              <div className="mt-4">
                <RoadmapStep title="Теория" text="Модуль появится позже" active={false} />
                <RoadmapStep title="Вождение" text={`${drivingRemaining} часов осталось до завершения`} done={drivingPercent >= 100} active={drivingPercent > 0} />
                <RoadmapStep title="Внутренний экзамен" text={progress?.internalExamPassed ? 'Сдан' : formatDateValue(progress?.internalExamDate)} done={progress?.internalExamPassed} active={!progress?.internalExamPassed && drivingPercent >= 70} />
                <RoadmapStep title="Экзамен ГИБДД" text={formatDateValue(progress?.gaidExamDate)} active={Boolean(progress?.internalExamPassed)} />
              </div>
            </section>

            <button className={cn(card, 'flex w-full items-center gap-3 p-4 text-left active:scale-[0.99]')} onClick={() => setView('schedule')}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#EAF4FF] text-[#35485A]"><CalendarDays size={23} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[18px] font-bold text-[#111315]">Мои записи</span>
                <span className="mt-1 block truncate text-[14px] font-semibold text-[#74787D]">{nextLesson?.slot ? `Ближайшая: ${lessonTime(nextLesson.slot)}` : 'Выберите удобное окно в расписании'}</span>
              </span>
              <ChevronRight className="text-[#A0A5A8]" size={22} />
            </button>

            <LessonDetailsCard title="Ближайшее занятие" item={nextLesson} />
            {nextLesson?.booking ? (
              <button className={cn(card, 'flex w-full items-center justify-between gap-3 p-4 text-left active:scale-[0.99]')} onClick={() => setRequestSheetOpen(true)}>
                <span className="min-w-0">
                  <span className="block text-[16px] font-bold text-[#111315]">Нужно перенести?</span>
                  <span className="mt-1 block text-[13px] font-semibold text-[#74787D]">Отправьте запрос администратору, запись не отменится автоматически.</span>
                </span>
                <ChevronRight className="text-[#A0A5A8]" size={22} />
              </button>
            ) : null}
            {requestMessage ? <p className="rounded-[16px] bg-[#ECEFF1] px-3 py-2 text-[13px] font-semibold text-[#111315]">{requestMessage}</p> : null}

            <section>
              <h2 className={sectionTitle}>История занятий</h2>
              <div className="mt-3 space-y-2">
                {completedLessons.length > 0 ? completedLessons.map((item) => {
                  const description = item.slot ? loadLessonDescription(item.slot.id) : null
                  return (
                    <article key={item.booking.id} className={cn(card, 'p-4')}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[16px] font-bold text-[#111315]">{description?.theme ?? 'Занятие по вождению'}</p>
                          <p className="mt-1 truncate text-[13px] font-semibold text-[#74787D]">{item.slot ? lessonTime(item.slot) : 'Время не найдено'}</p>
                        </div>
                        <StatusPill>Пройдено</StatusPill>
                      </div>
                    </article>
                  )
                }) : <article className={cn(card, 'p-4 text-[14px] font-semibold leading-5 text-[#74787D]')}>Пройденные занятия появятся после отметки автошколы.</article>}
              </div>
            </section>

            <section>
              <h2 className={sectionTitle}>Документы</h2>
              <div className="mt-3 space-y-2">
                {documents.map((document) => (
                  <article key={document.type} className={cn(card, 'flex items-center justify-between gap-3 p-4')}>
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-bold text-[#111315]">{studentDocumentLabels[document.type]}</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#74787D]">{studentDocumentStatusLabels[document.status]}</p>
                    </div>
                    <StatusPill tone={document.status === 'approved' ? 'green' : document.status === 'rejected' ? 'red' : 'blue'}>{document.status === 'approved' ? 'Ок' : 'Статус'}</StatusPill>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2 className={sectionTitle}>Учебное авто</h2>
              <article className={cn(card, 'mt-3 flex items-center gap-3 p-4')}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#ECEFF1] text-[#111315]"><CarFront size={24} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] font-bold text-[#111315]">{selectedInstructor?.car ?? 'Автомобиль назначит автошкола'}</p>
                  <p className="mt-1 truncate text-[14px] font-semibold text-[#74787D]">Категория B</p>
                </div>
              </article>
            </section>

            <section>
              <h2 className={sectionTitle}>Ваш инструктор</h2>
              <article className={cn(card, 'mt-3 p-4')}>
                <div className="flex items-center gap-3">
                  <StudentAvatar name={selectedInstructor?.name ?? 'Инструктор'} src={selectedInstructor ? getInstructorPhoto(selectedInstructor) : undefined} size={52} fallback="male" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[18px] font-bold text-[#111315]">{selectedInstructor ? formatInstructorName(selectedInstructor.name) : 'Инструктор не выбран'}</p>
                    <p className="mt-1 truncate text-[14px] font-semibold text-[#74787D]">Закреплён для расписания</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button className="min-h-11 rounded-[16px] bg-[#ECEFF1] text-[14px] font-bold text-[#111315] active:scale-[0.98]" onClick={() => setInstructorSheetOpen(true)}>Сменить</button>
                  <button className="min-h-11 rounded-[16px] bg-[#F7FAFD] text-[14px] font-bold text-[#111315] active:scale-[0.98]" onClick={() => setView('chat')}>Написать</button>
                </div>
              </article>
            </section>
          </section>
        ) : null}

        {view === 'chat' ? (
          <section className="space-y-5 pt-2">
            <div className="flex items-center justify-between gap-3">
              <h1 className={pageTitle}>Связь</h1>
              </div>
            {[
              { title: school.name, text: school.phone ? `Позвонить: ${school.phone}` : 'Телефон автошколы пока не указан', icon: Building2, action: school.phone ? `tel:${school.phone}` : '' },
              { title: selectedInstructor ? formatInstructorName(selectedInstructor.name) : 'Инструктор', text: selectedInstructor?.phone ? `Позвонить: ${selectedInstructor.phone}` : 'Появится после назначения', icon: CarFront, action: selectedInstructor?.phone ? `tel:${selectedInstructor.phone}` : '' },
              { title: 'Документы и помощь', text: 'По вопросам документов обратитесь в автошколу', icon: FileText, action: school.phone ? `tel:${school.phone}` : '' },
              { title: 'Уведомления', text: 'Напоминания пока не подключены', icon: Bell, action: '' },
            ].map((contact) => (
              <button key={contact.title} className="flex min-h-[78px] w-full items-center gap-3 border-b border-[#DDE0E5] text-left" onClick={() => { if (contact.action) window.location.href = contact.action }}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[#111315]"><contact.icon size={24} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[20px] font-bold text-[#111315]">{contact.title}</span>
                  <span className="mt-1 block truncate text-[15px] font-medium text-[#74787D]">{contact.text}</span>
                </span>
                {contact.action ? <Phone size={18} className="text-[#A0A5A8]" /> : null}
              </button>
            ))}
          </section>
        ) : null}

        {view === 'profile' ? (
          <section className="space-y-4 pt-0">
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadPhoto(event.target.files?.[0])} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className={pageTitle}>Профиль</h1>
                <p className="mt-1 text-[13px] font-semibold text-[#74787D]">Личные данные и обучение</p>
              </div>
              <div className="flex items-center gap-2">
                    <button className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#111315] active:scale-[0.96]" onClick={() => setInfoSheet('settings')} aria-label="Настройки"><Settings size={20} /></button>
              </div>
            </div>
            <div className={cn(card, 'p-4 text-center')}>
              <button className="relative mx-auto block" onClick={() => photoInputRef.current?.click()}>
                <StudentAvatar name={profile.name} src={pendingAvatarUrl || profile.avatarUrl} size={76} />
                <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-[#111315] text-white"><Camera size={15} /></span>
              </button>
              {pendingAvatarUrl ? <p className="mt-2 text-[13px] font-semibold text-[#111315]">Новое фото применится после сохранения</p> : null}
              <h2 className="mt-3 text-[24px] font-bold tracking-[-0.03em] text-[#111315]">{compactStudentName(profile.name)}</h2>
              <p className="mt-1 text-[14px] font-semibold text-[#74787D]">Категория {(student?.categoryCodes?.join(', ') || 'B')}</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Вождение', icon: CarFront, onClick: () => setView('driving') },
                { label: 'Запись', icon: CalendarDays, onClick: () => setView('schedule') },
                { label: 'Инфо', icon: Building2, onClick: () => setInfoSheet('student') },
              ].map((item) => <button key={item.label} className={cn(card, 'grid place-items-center gap-2 p-3 text-[15px] font-bold text-[#111315] active:scale-[0.98]')} style={{ minHeight: 82 }} onClick={item.onClick}><span className="grid h-10 w-10 place-items-center rounded-full bg-[#ECEFF1] text-[#111315]"><item.icon size={21} /></span>{item.label}</button>)}
            </div>
            <section className={cn(card, 'space-y-3.5 p-4')}>
              <EditableTextField label="ФИО" value={form.name} locked={Boolean(profile.name) && !editingFields.name} onEdit={() => setEditingFields((current) => ({ ...current, name: true }))} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
              <EditablePhoneField label="Телефон" value={form.phone} locked={Boolean(profile.phone) && !editingFields.phone} onEdit={() => setEditingFields((current) => ({ ...current, phone: true }))} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
              <EditableTextField label="Email, если понадобится" type="email" value={form.email} locked={Boolean(profile.email) && !editingFields.email} onEdit={() => setEditingFields((current) => ({ ...current, email: true }))} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
              {profileError ? <p className="rounded-[16px] bg-[#FEF2F2] px-3 py-2 text-[13px] font-semibold text-[#E5534B]">{profileError}</p> : null}
              {profileDirty ? <p className="rounded-[16px] bg-[#ECEFF1] px-3 py-2 text-[13px] font-semibold text-[#111315]">Есть несохранённые изменения</p> : null}
              <Button size="lg" className="w-full rounded-[18px] text-[16px]" disabled={!profileDirty} onClick={() => void saveProfileData()}>Сохранить</Button>
            </section>
            <section className="space-y-2.5">
              {[
                { label: 'Автошкола', icon: Building2, onClick: () => navigate(`/school/${school.slug}`) },
                { label: 'Данные ученика', icon: FileText, onClick: () => setInfoSheet('profileData') },
                { label: 'Советы', icon: Gift, onClick: () => setInfoSheet('tips') },
                { label: 'Настройки', icon: Settings, onClick: () => setInfoSheet('settings') },
              ].map((item) => <button key={item.label} className={cn(card, 'flex w-full items-center gap-3 px-4 text-left')} style={{ minHeight: 64 }} onClick={item.onClick}><item.icon className="text-[#111315]" size={22} /><span className="min-w-0 flex-1 text-[18px] font-semibold text-[#111315]">{item.label}</span><ChevronRight className="text-[#A0A5A8]" size={21} /></button>)}
            </section>
            <button className="flex items-center gap-3 px-2 text-[16px] font-semibold text-[#74787D]" style={{ minHeight: 48 }} onClick={logout}><LogOut size={20} />Выйти из профиля</button>
          </section>
        ) : null}
      </main>

      <BottomNav items={[
        { key: 'home', label: 'Главная', icon: <Home size={25} />, active: view === 'home', onClick: () => setView('home') },
        { key: 'schedule', label: 'Расписание', icon: <CalendarDays size={25} />, active: view === 'schedule', onClick: () => setView('schedule') },
        { key: 'chat', label: 'Связь', icon: <MessageCircle size={25} />, active: view === 'chat', onClick: () => setView('chat') },
        { key: 'profile', label: 'Профиль', icon: <UserRound size={25} />, active: view === 'profile', onClick: () => setView('profile') },
      ]} />
      <InstructorSheet open={instructorSheetOpen} instructors={instructors} selectedId={selectedInstructor?.id ?? ''} assignedId={assignedInstructorId} onSelect={setSelectedInstructorId} onClose={() => setInstructorSheetOpen(false)} />
      <InfoSheetPanel type={infoSheet} school={school} profile={profile} progress={progress} student={student} selectedInstructor={selectedInstructor} onClose={() => setInfoSheet(null)} />
      {requestSheetOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 px-3 py-5" onClick={() => setRequestSheetOpen(false)}>
          <section className="mx-auto max-h-[82vh] w-full max-w-[430px] overflow-y-auto rounded-[28px] bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#111315]">Запросить перенос</h2>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-[#74787D]">Администратор увидит запрос и подберёт новое время.</p>
            <div className="mt-4 space-y-3">
              <Input label="Причина" value={requestReason} onChange={(event) => setRequestReason(event.target.value)} placeholder="Например, не успеваю после работы" />
              <Input label="Желаемое время" value={requestPreferredTime} onChange={(event) => setRequestPreferredTime(event.target.value)} placeholder="Завтра после 18:00" />
              <Input label="Комментарий" value={requestComment} onChange={(event) => setRequestComment(event.target.value)} placeholder="Необязательно" />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setRequestSheetOpen(false)}>Назад</Button>
                <Button onClick={submitRescheduleRequest}>Отправить</Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      <ConfirmDialog
        open={phoneConfirmOpen}
        title="Сохранить новый телефон?"
        description="Телефон используется для поиска ваших записей. После изменения старые записи могут остаться привязаны к прежнему номеру."
        confirmLabel="Сохранить"
        cancelLabel="Назад"
        onConfirm={() => void saveProfileData()}
        onClose={() => setPhoneConfirmOpen(false)}
      />
    </div>
  )
}
