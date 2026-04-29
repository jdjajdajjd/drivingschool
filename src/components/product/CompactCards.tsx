import { CalendarDays, Check, ChevronRight, LogOut, MapPin, Phone, Settings, UserRound } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { cn, formatDuration, formatInstructorName, formatPhone } from '../../lib/utils'
import { getInstructorPhoto } from '../../services/instructorPhotos'
import type { Branch, Booking, Instructor, School, Slot } from '../../types'
import {
  formatDate,
  formatDayOfWeek,
  formatHumanDate,
  formatTimeRange,
  getBookingUrgencyState,
  getRelativeLessonLabel,
  type BookingUrgencyState,
} from '../../utils/date'

function initialsFromText(value: string): string {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'И'
}

export function InstructorCompactCard({
  instructor,
  branch,
  nextSlot,
  selected = false,
  onSelect,
  cta = 'Выбрать',
}: {
  instructor: Instructor
  branch?: Branch | null
  nextSlot?: Slot | null
  selected?: boolean
  onSelect: () => void
  cta?: string
}) {
  const shortName = formatInstructorName(instructor.name)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex min-h-[100px] w-full items-center gap-3 rounded-[22px] border bg-white p-3 text-left shadow-soft transition active:scale-[0.99]',
        selected ? 'border-product-primary bg-product-primary-soft shadow-[inset_0_0_0_1px_rgba(102,88,245,0.22)]' : 'border-product-border hover:border-product-primary/35',
      )}
    >
      <Avatar
        initials={instructor.avatarInitials || initialsFromText(shortName)}
        color={instructor.avatarColor || '#F1EEFF'}
        src={getInstructorPhoto(instructor)}
        alt={instructor.name}
        size="lg"
        className="h-12 w-12 rounded-full border border-[#E8EAF4] text-product-primary"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-[22px] text-product-main">{shortName}</p>
        <p className="mt-0.5 truncate text-[13px] font-medium leading-[18px] text-product-secondary">
          {instructor.car ?? 'Учебный автомобиль'} · {instructor.transmission === 'auto' ? 'автомат' : 'механика'}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {(instructor.categories ?? []).slice(0, 3).map((category) => (
            <span key={category} className="rounded-lg bg-product-alt px-2 py-0.5 text-[12px] font-semibold text-product-secondary">{category}</span>
          ))}
          {branch ? <span className="max-w-[118px] truncate rounded-lg bg-product-alt px-2 py-0.5 text-[12px] font-semibold text-product-muted">{branch.name}</span> : null}
        </div>
      </div>
      <div className="flex w-[88px] shrink-0 flex-col items-end gap-2">
        {nextSlot ? (
          <div className="text-right">
            <p className="text-[13px] font-bold leading-[18px] text-product-main">{nextSlot.time}</p>
            <p className="text-[12px] font-medium leading-4 text-product-muted">{formatDate(nextSlot.date)}</p>
          </div>
        ) : (
          <p className="text-right text-[12px] font-medium leading-4 text-product-muted">Нет окон</p>
        )}
        <span className={cn('inline-flex min-h-8 items-center rounded-xl px-3 text-[13px] font-semibold', selected ? 'bg-product-primary text-white' : 'bg-product-primary-soft text-product-primary')}>
          {selected ? <Check size={14} /> : cta}
        </span>
      </div>
    </button>
  )
}

export function BranchCompactCard({ branch, onSelect }: { branch: Branch; onSelect?: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-[92px] w-full items-center gap-3 rounded-[22px] border border-product-border bg-white p-3 text-left shadow-soft transition hover:border-product-primary/35"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-product-primary-soft text-product-primary">
        <MapPin size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold leading-[22px] text-product-main">{branch.name}</span>
        <span className="mt-0.5 block truncate text-[13px] font-medium leading-[18px] text-product-secondary">{branch.address}</span>
        {branch.phone ? <span className="mt-0.5 block text-[13px] font-medium leading-[18px] text-product-muted">{formatPhone(branch.phone)}</span> : null}
      </span>
      <ChevronRight size={18} className="text-product-muted" />
    </button>
  )
}

export function DayChipsScroller({
  days,
  selectedDate,
  onSelect,
  getCount,
}: {
  days: string[]
  selectedDate: string
  onSelect: (date: string) => void
  getCount: (date: string) => number
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max gap-2">
        {days.map((date, index) => {
          const active = date === selectedDate
          const count = getCount(date)
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                'min-h-[72px] w-[96px] rounded-[18px] border px-3 py-2 text-left transition',
                active ? 'border-product-primary bg-product-primary-soft' : 'border-product-border bg-white',
              )}
            >
              <span className="block text-[13px] font-semibold leading-[18px] text-product-main">{index === 0 ? 'Сегодня' : index === 1 ? 'Завтра' : formatDayOfWeek(date)}</span>
              <span className="mt-0.5 block text-[12px] font-medium leading-4 text-product-secondary">{formatHumanDate(date, false)}</span>
              <span className="mt-1 block text-[12px] font-semibold leading-4 text-product-primary">{count} слотов</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TimeSlotGrid({
  slots,
  selectedSlotId,
  onSelect,
}: {
  slots: Slot[]
  selectedSlotId: string
  onSelect: (slot: Slot) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {slots.map((slot) => {
        const active = slot.id === selectedSlotId
        return (
          <button
            key={slot.id}
            type="button"
            onClick={() => onSelect(slot)}
            className={cn(
              'min-h-[82px] rounded-[20px] border bg-white px-3 py-3 text-left transition active:scale-[0.99]',
              active ? 'border-product-primary bg-product-primary-soft' : 'border-product-border hover:border-product-primary/35',
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-[22px] font-bold leading-7 text-product-main">{slot.time}</span>
              {active ? <Check size={18} className="text-product-primary" /> : null}
            </span>
            <span className="mt-1 block text-[13px] font-medium leading-[18px] text-product-secondary">{formatDuration(slot.duration)}</span>
            <span className="mt-1 block text-[12px] font-semibold leading-4 text-product-success">свободно</span>
          </button>
        )
      })}
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  subvalue,
}: {
  icon: typeof CalendarDays
  label: string
  value: string
  subvalue?: string
}) {
  return (
    <div className="flex items-start gap-3 border-b border-product-border/70 py-3 last:border-b-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-product-primary-soft text-product-primary">
        <Icon size={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold uppercase leading-4 tracking-[0.08em] text-product-muted">{label}</span>
        <span className="mt-0.5 block text-base font-semibold leading-[22px] text-product-main">{value}</span>
        {subvalue ? <span className="mt-0.5 block text-[13px] font-medium leading-[18px] text-product-secondary">{subvalue}</span> : null}
      </span>
    </div>
  )
}

export function BookingDetailsCard({
  slot,
  instructor,
  branch,
  student,
  compactInstructor = false,
}: {
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
  student?: { name: string; phone: string; email?: string }
  compactInstructor?: boolean
}) {
  return (
    <div className="rounded-[24px] border border-product-border bg-white px-4 py-4 shadow-soft">
      <p className="ui-section-title">Детали записи</p>
      <div className="mt-2">
        <DetailRow
          icon={CalendarDays}
          label="Дата и время"
          value={slot ? formatHumanDate(slot.date) : 'Не выбрано'}
          subvalue={slot ? `${formatTimeRange(slot)} · ${formatDuration(slot.duration)}` : undefined}
        />
        <DetailRow
          icon={UserRound}
          label="Инструктор"
          value={instructor ? (compactInstructor ? formatInstructorName(instructor.name) : instructor.name) : 'Не выбран'}
          subvalue={instructor?.car ?? 'Учебный автомобиль'}
        />
        <DetailRow
          icon={MapPin}
          label="Филиал"
          value={branch?.name ?? 'Не выбран'}
          subvalue={branch?.address}
        />
        {student ? (
          <DetailRow
            icon={Phone}
            label="Ученик"
            value={student.name}
            subvalue={`${formatPhone(student.phone)}${student.email ? ` · ${student.email}` : ''}`}
          />
        ) : null}
      </div>
    </div>
  )
}

export function SummaryCard(props: Parameters<typeof BookingDetailsCard>[0]) {
  return <BookingDetailsCard {...props} />
}

export function SuccessHeader({
  title = 'Запись подтверждена',
  subtitle = 'Мы сохранили вашу запись. Детали занятия ниже.',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <div className="rounded-[24px] border border-product-border bg-white p-6 shadow-soft">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-product-success-border bg-product-success-soft text-product-success">
        <Check size={28} strokeWidth={2.5} />
      </div>
      <h1 className="mt-5 ui-h1">{title}</h1>
      <p className="mt-2 text-[17px] font-medium leading-6 text-product-secondary">{subtitle}</p>
    </div>
  )
}

function bookingCardClasses(state: BookingUrgencyState): string {
  return {
    'future-muted': 'border-product-border bg-[#F3F4F8] shadow-none',
    'soon-2-days': 'border-[#DDD6FF] bg-product-purple shadow-none',
    tomorrow: 'border-[#CFC7FF] bg-white shadow-[0_10px_28px_rgba(86,72,232,0.08)]',
    today: 'border-[#B8AEFF] bg-white shadow-today',
    completed: 'border-[#E8EBF3] bg-[#F7F8FB] shadow-none opacity-90',
    cancelled: 'border-[#E5E7EF] bg-[#F8F8FA] shadow-none opacity-90',
  }[state]
}

export function BookingStatusChip({ state, slot }: { state: BookingUrgencyState; slot: Slot | null }) {
  const label = state === 'completed'
    ? 'Завершено'
    : state === 'cancelled'
      ? 'Отменено'
      : state === 'soon-2-days'
        ? 'Через 2 дня'
        : state === 'future-muted'
          ? getRelativeLessonLabel(slot)
          : getRelativeLessonLabel(slot)

  const classes = {
    today: 'border-product-primary-border bg-product-primary-soft text-product-primary-dark',
    tomorrow: 'border-[#CFC7FF] bg-white text-product-primary-dark',
    'soon-2-days': 'border-transparent bg-product-purple text-product-primary',
    'future-muted': 'border-transparent bg-[#EEF1F7] text-product-secondary',
    completed: 'border-transparent bg-product-success-soft text-product-success',
    cancelled: 'border-transparent bg-product-error-soft text-product-error',
  }[state]

  return (
    <span className={cn('inline-flex h-8 shrink-0 items-center rounded-full border px-2.5 text-[13px] font-semibold leading-none', classes)}>
      {label === 'Прошло' && state === 'future-muted' ? 'Записан' : label}
    </span>
  )
}

export function StudentBookingCard({
  booking,
  slot,
  instructor,
  branch,
}: {
  booking: Booking
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
}) {
  const state = getBookingUrgencyState(booking, slot)
  const shortName = instructor ? formatInstructorName(instructor.name) : 'Инструктор'
  const muted = state === 'completed' || state === 'cancelled'
  return (
    <div className={cn('relative flex min-h-[92px] items-center gap-3 rounded-[22px] border p-3 transition', bookingCardClasses(state))}>
      {state === 'today' ? <span className="absolute left-0 top-5 h-10 w-1 rounded-r-full bg-product-primary" /> : null}
      <Avatar
        initials={instructor?.avatarInitials ?? initialsFromText(shortName)}
        color={instructor?.avatarColor || '#F1EEFF'}
        src={instructor ? getInstructorPhoto(instructor) : undefined}
        alt={instructor?.name ?? 'Инструктор'}
        size="md"
        className="h-11 w-11 rounded-full border border-[#E8EAF4] text-product-primary"
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-base font-semibold leading-[22px]', muted ? 'text-product-secondary' : 'text-product-main')}>{shortName}</p>
        <p className="truncate text-[13px] font-medium leading-[18px] text-product-secondary">{instructor?.car ?? 'Учебный автомобиль'} · {branch?.name ?? 'Филиал'}</p>
        <p className="mt-1 truncate text-[13px] font-semibold leading-[18px] text-product-main">
          {slot ? `${getRelativeLessonLabel(slot)} · ${formatTimeRange(slot)}` : 'Время не найдено'}
        </p>
      </div>
      <BookingStatusChip state={state} slot={slot} />
    </div>
  )
}

export function StudentProfileHeader({
  profile,
  school,
  branch,
  onSettings,
  onLogout,
}: {
  profile: { name: string; avatarUrl?: string }
  school: School
  branch: Branch | null
  onSettings: () => void
  onLogout: () => void
}) {
  return (
    <div className="flex min-h-[96px] items-center gap-3 rounded-[24px] border border-product-border bg-white p-4 shadow-soft">
      <Avatar initials={initialsFromText(profile.name)} src={profile.avatarUrl} alt={profile.name} size="lg" className="h-14 w-14 rounded-full border border-[#E8EAF4]" />
      <div className="min-w-0 flex-1">
        <p className="ui-kicker">Кабинет ученика</p>
        <h1 className="truncate text-[22px] font-bold leading-7 text-product-main" title={profile.name}>{profile.name}</h1>
        <p className="truncate text-[13px] font-medium text-product-secondary" title={`${school.name}${branch ? ` · ${branch.name}` : ''}`}>{school.name}{branch ? ` · ${branch.name}` : ''}</p>
      </div>
      <button aria-label="Настройки" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-product-alt text-product-secondary transition hover:bg-product-primary-soft hover:text-product-primary" onClick={onSettings}>
        <Settings size={18} />
      </button>
      <button aria-label="Выйти" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-product-alt text-product-secondary transition hover:bg-product-error-soft hover:text-product-error" onClick={onLogout}>
        <LogOut size={18} />
      </button>
    </div>
  )
}

export function NearestLessonCard({
  booking,
  slot,
  instructor,
  branch,
  onBook,
  onAll,
}: {
  booking: Booking | null
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
  onBook: () => void
  onAll: () => void
}) {
  if (!booking || !slot) {
    return (
      <div className="rounded-[24px] border border-product-border bg-white p-5 shadow-soft">
        <p className="ui-kicker">Ближайшее занятие</p>
        <h2 className="mt-3 ui-h2">Активных записей нет</h2>
        <p className="mt-2 text-base leading-[22px] text-product-secondary">Выберите удобное время и инструктор появится здесь.</p>
        <Button className="mt-4 w-full" onClick={onBook}>Записаться ещё</Button>
      </div>
    )
  }

  const state = getBookingUrgencyState(booking, slot)
  return (
    <div className={cn('rounded-[24px] border p-5', bookingCardClasses(state))}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-kicker">Ближайшее занятие</p>
          <h2 className="mt-3 font-display text-[28px] font-bold leading-[34px] text-product-main">{formatHumanDate(slot.date, false)}</h2>
          <p className="mt-1 font-display text-[22px] font-bold leading-7 text-product-main">{formatTimeRange(slot)}</p>
        </div>
        <BookingStatusChip state={state} slot={slot} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Avatar initials={instructor?.avatarInitials ?? 'И'} color={instructor?.avatarColor || '#F1EEFF'} src={instructor ? getInstructorPhoto(instructor) : undefined} alt={instructor?.name ?? 'Инструктор'} size="lg" className="h-14 w-14 rounded-full border border-[#E8EAF4] text-product-primary" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-[22px] text-product-main">{instructor ? formatInstructorName(instructor.name) : 'Инструктор'}</p>
          <p className="truncate text-[13px] font-medium leading-[18px] text-product-secondary">{instructor?.car ?? 'Учебный автомобиль'} · {branch?.name ?? 'Филиал'}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={onBook}>Записаться ещё</Button>
        <Button variant="secondary" onClick={onAll}>Все записи</Button>
      </div>
    </div>
  )
}
