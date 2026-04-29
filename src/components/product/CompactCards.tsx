import { Check, ChevronRight, MapPin } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { cn, formatDuration, formatPhone } from '../../lib/utils'
import { getInstructorPhoto } from '../../services/instructorPhotos'
import type { Branch, Booking, Instructor, Slot } from '../../types'
import { formatDate, formatDayOfWeek } from '../../utils/date'

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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex min-h-[104px] w-full items-center gap-3 rounded-[20px] border bg-white p-3 text-left shadow-soft transition active:scale-[0.99]',
        selected ? 'border-product-primary bg-product-primary-soft' : 'border-product-border hover:border-product-primary/35',
      )}
    >
      <Avatar
        initials={instructor.avatarInitials}
        color={instructor.avatarColor}
        src={getInstructorPhoto(instructor)}
        alt={instructor.name}
        size="lg"
        className="h-14 w-14 rounded-2xl"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-[22px] text-product-main">{instructor.name}</p>
        <p className="mt-0.5 truncate text-[13px] font-medium leading-[18px] text-product-secondary">
          {instructor.car ?? 'Учебный автомобиль'} · {instructor.transmission === 'auto' ? 'автомат' : 'механика'}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {(instructor.categories ?? []).slice(0, 3).map((category) => (
            <span key={category} className="rounded-lg bg-product-alt px-2 py-0.5 text-[12px] font-semibold text-product-secondary">{category}</span>
          ))}
          {branch ? <span className="truncate rounded-lg bg-product-alt px-2 py-0.5 text-[12px] font-semibold text-product-muted">{branch.name}</span> : null}
        </div>
      </div>
      <div className="flex w-[92px] shrink-0 flex-col items-end gap-2">
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
      className="flex min-h-[92px] w-full items-center gap-3 rounded-[20px] border border-product-border bg-white p-3 text-left shadow-soft transition hover:border-product-primary/35"
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
                'min-h-[72px] w-[96px] rounded-2xl border px-3 py-2 text-left transition',
                active ? 'border-product-primary bg-product-primary-soft' : 'border-product-border bg-white',
              )}
            >
              <span className="block text-[13px] font-semibold leading-[18px] text-product-main">{index === 0 ? 'Сегодня' : index === 1 ? 'Завтра' : formatDayOfWeek(date)}</span>
              <span className="mt-0.5 block text-[12px] font-medium leading-4 text-product-secondary">{formatDate(date)}</span>
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

export function SummaryCard({
  slot,
  instructor,
  branch,
  student,
}: {
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
  student?: { name: string; phone: string; email?: string }
}) {
  return (
    <div className="rounded-[20px] border border-product-border bg-white p-4 shadow-soft">
      <p className="ui-section-title">Детали записи</p>
      <div className="mt-3 grid gap-3">
        <div className="rounded-2xl bg-product-alt px-4 py-3">
          <p className="text-[13px] font-medium text-product-secondary">Дата и время</p>
          <p className="mt-1 text-base font-semibold text-product-main">
            {slot ? `${formatDate(slot.date)}, ${slot.time} · ${formatDuration(slot.duration)}` : 'Не выбрано'}
          </p>
        </div>
        <div className="rounded-2xl bg-product-alt px-4 py-3">
          <p className="text-[13px] font-medium text-product-secondary">Инструктор</p>
          <p className="mt-1 text-base font-semibold text-product-main">{instructor?.name ?? 'Не выбран'}</p>
          <p className="text-[13px] font-medium text-product-secondary">{instructor?.car ?? 'Учебный автомобиль'}</p>
        </div>
        <div className="rounded-2xl bg-product-alt px-4 py-3">
          <p className="text-[13px] font-medium text-product-secondary">Филиал</p>
          <p className="mt-1 text-base font-semibold text-product-main">{branch?.name ?? 'Не выбран'}</p>
          <p className="text-[13px] font-medium text-product-secondary">{branch?.address ?? ''}</p>
        </div>
        {student ? (
          <div className="rounded-2xl bg-product-alt px-4 py-3">
            <p className="text-[13px] font-medium text-product-secondary">Ваши данные</p>
            <p className="mt-1 text-base font-semibold text-product-main">{student.name}</p>
            <p className="text-[13px] font-medium text-product-secondary">{student.phone}{student.email ? ` · ${student.email}` : ''}</p>
          </div>
        ) : null}
      </div>
    </div>
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
  return (
    <div className="flex min-h-[88px] items-center gap-3 rounded-[20px] border border-product-border bg-white p-3 shadow-soft">
      <Avatar
        initials={instructor?.avatarInitials ?? 'И'}
        color={instructor?.avatarColor}
        src={instructor ? getInstructorPhoto(instructor) : undefined}
        alt={instructor?.name ?? 'Инструктор'}
        size="md"
        className="h-12 w-12 rounded-2xl"
      />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold leading-[22px] text-product-main">{slot ? `${formatDate(slot.date)}, ${slot.time}` : 'Время не найдено'}</p>
        <p className="truncate text-[13px] font-medium leading-[18px] text-product-secondary">{instructor?.name ?? 'Инструктор'} · {branch?.name ?? 'Филиал'}</p>
      </div>
      <Badge variant={booking.status === 'active' ? 'success' : booking.status === 'cancelled' ? 'error' : 'muted'}>
        {booking.status === 'active' ? 'Записан' : booking.status === 'cancelled' ? 'Отменена' : 'Проведена'}
      </Badge>
    </div>
  )
}
