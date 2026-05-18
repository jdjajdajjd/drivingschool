import { ArrowRight01Icon, Calendar03Icon, CheckmarkCircle02Icon, Location01Icon, Logout03Icon, MapsIcon, Settings02Icon, SmartPhone01Icon, User03Icon } from '@hugeicons/core-free-icons'
import React from 'react'
import { motion } from 'framer-motion'
import { Avatar } from '../ui/Avatar'
import { cn, formatDuration, formatInstructorName, formatPhone } from '../../lib/utils'
import { getInstructorPhoto } from '../../services/instructorPhotos'
import { loadLessonDescription } from '../../services/studentProfile'
import { useToast } from '../ui/Toast'
import { createHugeIcon } from '../ui/HugeIcon'
import type { Branch, Booking, Instructor, School, Slot } from '../../types'
import { lessonTypeLabel } from '../../pages/student/studentUtils'
import {
  formatDate,
  formatDayOfWeek,
  formatHumanDate,
  formatTimeRange,
  getBookingUrgencyState,
  getRelativeLessonLabel,
  type BookingUrgencyState,
} from '../../utils/date'

void React

const CalendarDays = createHugeIcon(Calendar03Icon)
const Check = createHugeIcon(CheckmarkCircle02Icon)
const ChevronRight = createHugeIcon(ArrowRight01Icon)
const Location = createHugeIcon(Location01Icon)
const LogOut = createHugeIcon(Logout03Icon)
const Maps = createHugeIcon(MapsIcon)
const Phone = createHugeIcon(SmartPhone01Icon)
const Settings = createHugeIcon(Settings02Icon)
const UserRound = createHugeIcon(User03Icon)

const ui = {
  surface: 'var(--surface)',
  surfaceSoft: 'var(--surface-soft)',
  surfaceMuted: 'var(--surface-muted)',
  text: 'var(--text)',
  textMuted: 'var(--text-muted)',
  textSoft: 'var(--text-soft)',
  border: 'var(--border)',
  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  green: 'var(--green)',
  greenSoft: 'var(--green-soft)',
  red: 'var(--red)',
  redSoft: 'var(--red-soft)',
  blueSoft: 'var(--blue-soft)',
  shadowCard: 'var(--shadow-card)',
} as const

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
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'flex w-full items-center gap-3.5 p-4 text-left transition-all duration-150',
        'bg-[var(--surface)]',
        selected
          ? 'border-2 shadow-[0_0_0_3px_rgba(17,19,21,0.10),0_18px_45px_rgba(15,20,25,0.10)]'
          : 'border border-[var(--border)] shadow-[var(--shadow-card)] hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]',
      )}
      style={{ borderRadius: '24px' }}
    >
      <Avatar
        initials={instructor.avatarInitials || initialsFromText(shortName)}
        color={instructor.avatarColor || '#EEF3F5'}
        src={getInstructorPhoto(instructor)}
        alt={instructor.name}
        size="lg"
        className="rounded-full text-[var(--accent)]"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold" style={{ color: ui.text }}>{shortName}</p>
        <p className="mt-1 text-[13px] font-medium" style={{ color: ui.textMuted }}>
          {instructor.car ?? 'Учебный автомобиль'} · {instructor.transmission === 'auto' ? 'автомат' : 'механика'}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {(instructor.categories ?? []).slice(0, 3).map((category) => (
            <span
              key={category}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ background: ui.surfaceMuted, color: ui.textMuted }}
            >
              {category}
            </span>
          ))}
          {branch ? (
            <span
              className="max-w-[110px] truncate rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ background: ui.surfaceMuted, color: ui.textSoft }}
            >
              {branch.name}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex w-[80px] shrink-0 flex-col items-end gap-2">
        {nextSlot ? (
          <div className="text-right">
            <p className="text-[13px] font-semibold" style={{ color: ui.text }}>{nextSlot.time}</p>
            <p className="text-[12px] font-medium" style={{ color: ui.textSoft }}>{formatDate(nextSlot.date)}</p>
          </div>
        ) : (
          <p className="text-right text-[12px] font-medium" style={{ color: ui.textSoft }}>Нет окон</p>
        )}
        <span
          className="inline-flex min-h-8 items-center rounded-full px-3 text-[12px] font-semibold transition-all duration-150"
          style={
            selected
              ? { background: ui.accent, color: 'white', boxShadow: '0 12px 28px rgba(17,19,21,0.18)' }
              : { background: ui.accentSoft, color: ui.accent }
          }
        >
          {selected ? <Check size={12} /> : cta}
        </span>
      </div>
    </motion.button>
  )
}

export function BranchCompactCard({ branch, onSelect }: { branch: Branch; onSelect?: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className="flex w-full items-center gap-3.5 p-4 text-left transition-all duration-150 hover:-translate-y-1"
      style={{
        background: ui.surface,
        border: `1px solid ${ui.border}`,
        borderRadius: '24px',
        boxShadow: ui.shadowCard,
      }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: ui.accentSoft, color: ui.accent }}
      >
        <Location size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold" style={{ color: ui.text }}>{branch.name}</span>
        <span className="mt-1 block truncate text-[13px] font-medium" style={{ color: ui.textMuted }}>{branch.address}</span>
        {branch.phone ? (
          <span className="mt-0.5 block text-[13px] font-medium" style={{ color: ui.textSoft }}>{formatPhone(branch.phone)}</span>
        ) : null}
      </span>
      <ChevronRight size={16} style={{ color: ui.textSoft }} />
    </motion.button>
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
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max gap-2">
        {days.map((date, index) => {
          const active = date === selectedDate
          const count = getCount(date)
          return (
            <motion.button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              whileTap={{ scale: 0.97 }}
              className="relative flex w-[88px] flex-col items-start justify-start p-3 text-left transition-all duration-100"
              style={{
                background: active ? ui.accentSoft : ui.surface,
                border: `2px solid ${active ? ui.accent : ui.border}`,
                borderRadius: '18px',
                boxShadow: active ? '0 0 0 3px rgba(17,19,21,0.10)' : '0 18px 45px rgba(15,20,25,0.10)',
                minHeight: '68px',
              }}
            >
              {active && (
                <Check size={12} className="absolute right-2 top-2" style={{ color: ui.accent }} />
              )}
              <span className="text-[12px] font-semibold" style={{ color: ui.text }}>
                {index === 0 ? 'Сегодня' : index === 1 ? 'Завтра' : formatDayOfWeek(date).slice(0, 2)}
              </span>
              <span className="mt-0.5 text-[11px] font-medium" style={{ color: ui.textMuted }}>
                {formatHumanDate(date, false)}
              </span>
              <span
                className="mt-1 text-[11px] font-medium"
                style={{ color: active ? ui.accent : ui.textSoft }}
              >
                {count} окон
              </span>
            </motion.button>
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
    <div className="grid grid-cols-2 gap-2.5">
      {slots.map((slot) => {
        const active = slot.id === selectedSlotId
        return (
          <motion.button
            key={slot.id}
            type="button"
            onClick={() => onSelect(slot)}
            whileTap={{ scale: 0.97 }}
            className="p-4 text-left transition-all duration-100"
            style={{
              background: active ? ui.accentSoft : ui.surface,
              border: `2px solid ${active ? ui.accent : ui.border}`,
              borderRadius: '18px',
              boxShadow: active ? '0 0 0 3px rgba(17,19,21,0.10)' : '0 18px 45px rgba(15,20,25,0.10)',
              minHeight: '80px',
            }}
          >
            <span className="flex items-center justify-between gap-2">
              <span
                className="font-extrabold tracking-tight"
                style={{ fontSize: '18px', color: ui.text }}
              >
                {formatTimeRange(slot)}
              </span>
              {active && <Check size={16} style={{ color: ui.accent }} />}
            </span>
            <span
              className="mt-0.5 block text-[12px] font-medium"
              style={{ color: ui.textMuted }}
            >
              {lessonTypeLabel(slot)} · {formatDuration(slot.duration)}
            </span>
          </motion.button>
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
    <div
      className="flex items-start gap-3.5 py-4 last:pb-0"
      style={{ borderBottom: `1px solid ${ui.border}` }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: ui.accentSoft, color: ui.accent }}
      >
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold" style={{ color: ui.textSoft }}>
          {label}
        </span>
        <span
          className="mt-1 block text-[15px] font-extrabold tracking-tight"
          style={{ color: ui.text }}
        >
          {value}
        </span>
        {subvalue ? (
          <span className="mt-0.5 block text-[13px] font-medium" style={{ color: ui.textMuted }}>
            {subvalue}
          </span>
        ) : null}
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
    <div
      className="p-5"
      style={{
        background: ui.surface,
        border: `1px solid ${ui.border}`,
        borderRadius: '24px',
        boxShadow: ui.shadowCard,
      }}
    >
      <p className="text-[15px] font-extrabold tracking-tight" style={{ color: ui.text }}>Детали записи</p>
      <div className="mt-2">
        <DetailRow
          icon={CalendarDays}
          label="Дата и время"
          value={slot ? formatHumanDate(slot.date) : 'Не выбрано'}
          subvalue={slot ? `${formatTimeRange(slot)} · ${lessonTypeLabel(slot)} · ${formatDuration(slot.duration)}` : undefined}
        />
        <DetailRow
          icon={UserRound}
          label="Инструктор"
          value={instructor ? (compactInstructor ? formatInstructorName(instructor.name) : instructor.name) : 'Не выбран'}
          subvalue={instructor?.car ?? 'Учебный автомобиль'}
        />
        <DetailRow
          icon={Location}
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
  subtitle = 'Мы сохранили вашу запись. Если нужно, автошкола свяжется с вами.',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="p-5"
      style={{
        background: ui.greenSoft,
        border: '1px solid rgba(21,128,61,0.15)',
        borderRadius: '24px',
      }}
    >
      <motion.div
        initial={{ scale: 0.65, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{
          background: ui.surface,
          border: '1px solid rgba(21,128,61,0.15)',
          color: ui.green,
          boxShadow: ui.shadowCard,
        }}
      >
        <Check size={24} strokeWidth={2.5} />
      </motion.div>
      <h1
        className="mt-4 font-extrabold tracking-tight"
        style={{ fontSize: '22px', lineHeight: '1.2', color: ui.text }}
      >
        {title}
      </h1>
      <p className="body-lg mt-2" style={{ color: ui.textMuted }}>
        {subtitle}
      </p>
    </motion.div>
  )
}

function bookingCardStyles(state: BookingUrgencyState): React.CSSProperties {
  return {
    'future-muted': { background: ui.surfaceSoft, border: `1px solid ${ui.border}` },
    'soon-2-days': { background: ui.accentSoft, border: '1px solid rgba(17,19,21,0.12)' },
    tomorrow: { background: ui.surface, border: '1px solid rgba(17,19,21,0.12)' },
    today: { background: ui.accentSoft, border: '1px solid rgba(17,19,21,0.18)' },
    completed: { background: ui.surfaceMuted, border: `1px solid ${ui.border}`, opacity: 0.9 },
    cancelled: { background: ui.surfaceMuted, border: `1px solid ${ui.border}`, opacity: 0.8 },
  }[state] as React.CSSProperties
}

export function BookingStatusChip({ state, slot }: { state: BookingUrgencyState; slot: Slot | null }) {
  const label =
    state === 'completed'
      ? 'Завершено'
      : state === 'cancelled'
        ? 'Отменено'
        : state === 'soon-2-days'
          ? 'Через 2 дня'
          : getRelativeLessonLabel(slot)

  const chipStyles: Record<BookingUrgencyState, React.CSSProperties> = {
    today: { background: ui.accentSoft, color: ui.accent, border: '1px solid rgba(17,19,21,0.12)' },
    tomorrow: { background: ui.accentSoft, color: ui.accent, border: '1px solid rgba(17,19,21,0.12)' },
    'soon-2-days': { background: ui.accentSoft, color: ui.accent, border: '1px solid rgba(17,19,21,0.12)' },
    'future-muted': { background: ui.surfaceMuted, color: ui.textMuted, border: `1px solid ${ui.border}` },
    completed: { background: ui.greenSoft, color: ui.green, border: '1px solid rgba(21,128,61,0.15)' },
    cancelled: { background: ui.redSoft, color: ui.red, border: '1px solid rgba(229,83,75,0.15)' },
  }
  const s = chipStyles[state]

  return (
    <span
      className="inline-flex h-7 shrink-0 items-center rounded-sm px-2.5 text-[12px] font-semibold"
      style={s}
    >
      {label === 'Прошло' && state === 'future-muted' ? 'Записан' : label}
    </span>
  )
}

export function StudentBookingCard({
  booking,
  slot,
  instructor,
  branch,
  compact = false,
}: {
  booking: Booking
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
  compact?: boolean
}) {
  const { showToast } = useToast()
  const state = getBookingUrgencyState(booking, slot)
  const shortName = instructor ? formatInstructorName(instructor.name) : 'Инструктор'
  const muted = state === 'completed' || state === 'cancelled'
  const lessonLabel = slot ? getRelativeLessonLabel(slot) : 'Запись'
  const lessonTime = slot ? formatTimeRange(slot) : ''
  const styles = bookingCardStyles(state)

  const lessonDesc = slot ? loadLessonDescription(slot.id) : null

  const mapUrl = branch?.address
    ? `https://yandex.ru/maps/?text=${encodeURIComponent(branch.address)}`
    : null

  function handleCancel() {
    if (booking.status !== 'active') return
    showToast('Для отмены позвоните в автошколу или используйте кабинет.', 'info')
  }

  function handleReschedule() {
    if (booking.status !== 'active') return
    showToast('Для переноса позвоните в автошколу.', 'info')
  }

  function downloadCalendar() {
    import('../../services/bookingService').then(({ generateIcs }) => {
      const content = generateIcs(booking.id)
      if (!content) return
      const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${booking.id}.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showToast('Файл календаря готов.', 'success')
    })
  }

  if (compact) {
    return (
      <div
        className="relative flex items-center gap-3 p-3.5 transition-all"
        style={{ ...styles, borderRadius: '18px' }}
      >
        <Avatar
          initials={instructor?.avatarInitials ?? initialsFromText(shortName)}
          color={instructor?.avatarColor || '#EEF3F5'}
          src={instructor ? getInstructorPhoto(instructor) : undefined}
          alt={instructor?.name ?? 'Инструктор'}
          size="sm"
          className="rounded-full shrink-0 text-[var(--accent)]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold tracking-tight" style={{ color: muted ? ui.textSoft : ui.text }}>
            {shortName}
          </p>
          <p className="truncate text-[12px] font-medium" style={{ color: ui.textMuted }}>
            {slot ? `${lessonLabel}, ${lessonTime}` : ''}
          </p>
        </div>
        <BookingStatusChip state={state} slot={slot} />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden transition-all"
      style={{ ...styles, borderRadius: '24px' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <Avatar
          initials={instructor?.avatarInitials ?? initialsFromText(shortName)}
          color={instructor?.avatarColor || '#EEF3F5'}
          src={instructor ? getInstructorPhoto(instructor) : undefined}
          alt={instructor?.name ?? 'Инструктор'}
          size="lg"
          className="rounded-full shrink-0 text-[var(--accent)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[15px] font-extrabold tracking-tight" style={{ color: muted ? ui.textSoft : ui.text }}>
                {shortName}
              </p>
              <p className="mt-0.5 text-[13px] font-medium" style={{ color: ui.textMuted }}>
                {instructor?.car ?? 'Учебный автомобиль'} · {instructor?.transmission === 'auto' ? 'Автомат' : 'Механика'}
              </p>
            </div>
            <BookingStatusChip state={state} slot={slot} />
          </div>
        </div>
      </div>

      {/* Date/Time */}
      {slot && (
        <div className="px-4 pb-2">
          <div
            className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5"
            style={{ background: ui.accentSoft }}
          >
            <CalendarDays size={15} style={{ color: ui.accent }} />
            <p className="text-[14px] font-semibold" style={{ color: ui.text }}>
              {lessonLabel}, {lessonTime}
            </p>
          </div>
        </div>
      )}

      {/* Branch address */}
      {branch && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2">
            <Location size={14} style={{ color: ui.textSoft }} />
            <p className="flex-1 truncate text-[13px] font-medium" style={{ color: ui.textMuted }}>
              {branch.name}, {branch.address}
            </p>
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 text-[12px] font-bold transition-colors"
                style={{ color: ui.accent }}
                onClick={(e) => e.stopPropagation()}
              >
                Карта <Maps size={12} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Instructor phone */}
      {instructor?.phone && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2">
            <Phone size={14} style={{ color: ui.textSoft }} />
            <a href={`tel:${instructor.phone}`} className="text-[13px] font-medium" style={{ color: ui.textMuted }}>
              {formatPhone(instructor.phone)}
            </a>
          </div>
        </div>
      )}

      {/* Lesson description */}
      {lessonDesc && lessonDesc.theme && (
        <div className="px-4 pb-2">
          <div className="rounded-2xl px-3.5 py-2.5" style={{ background: ui.surfaceSoft }}>
            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: ui.textSoft }}>Тема урока</p>
            <p className="mt-1 text-[14px] font-semibold" style={{ color: ui.text }}>{lessonDesc.theme}</p>
            {lessonDesc.whatToBring?.length > 0 && (
              <p className="mt-1 text-[12px] font-medium" style={{ color: ui.textMuted }}>
                Взять: {lessonDesc.whatToBring.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {booking.status === 'active' && (
        <div className="flex items-center gap-2 border-t px-4 py-3" style={{ borderColor: ui.border }}>
          <button
            className="flex-1 rounded-full py-2.5 text-[13px] font-extrabold transition-all"
            style={{ background: ui.surfaceMuted, color: ui.textMuted }}
            onClick={downloadCalendar}
          >
            Календарь
          </button>
          <button
            className="flex-1 rounded-full py-2.5 text-[13px] font-extrabold transition-all"
            style={{ background: ui.redSoft, color: ui.red }}
            onClick={handleCancel}
          >
            Отменить
          </button>
          <button
            className="flex-1 rounded-full py-2.5 text-[13px] font-extrabold transition-all"
            style={{ background: ui.accentSoft, color: ui.accent }}
            onClick={handleReschedule}
          >
            Перенести
          </button>
        </div>
      )}
    </motion.div>
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
    <div
      className="flex items-center gap-3.5 p-4"
      style={{
        background: ui.surface,
        border: `1px solid ${ui.border}`,
        borderRadius: '24px',
        boxShadow: ui.shadowCard,
        minHeight: '88px',
      }}
    >
      <Avatar
        initials={initialsFromText(profile.name)}
        src={profile.avatarUrl}
        alt={profile.name}
        size="lg"
        className="rounded-full text-[var(--accent)]"
      />
      <div className="min-w-0 flex-1">
        <p className="t-micro" style={{ fontWeight: 700 }}>Кабинет ученика</p>
        <h1
          className="truncate font-extrabold tracking-tight"
          style={{ fontSize: '20px', lineHeight: '1.2', color: ui.text }}
          title={profile.name}
        >
          {profile.name}
        </h1>
        <p
          className="truncate text-[13px] font-medium"
          style={{ color: ui.textMuted }}
          title={`${school.name}${branch ? ` · ${branch.name}` : ''}`}
        >
          {school.name}
          {branch ? ` · ${branch.name}` : ''}
        </p>
      </div>
      <button
        aria-label="Настройки"
        className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:-translate-y-0.5"
        style={{ background: ui.surfaceMuted, color: ui.textMuted }}
        onClick={onSettings}
      >
        <Settings size={16} />
      </button>
      <button
        aria-label="Выйти"
        className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:-translate-y-0.5"
        style={{ background: ui.redSoft, color: ui.red }}
        onClick={onLogout}
      >
        <LogOut size={16} />
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
      <div
        className="p-5"
        style={{
          background: ui.surface,
          border: `1px solid ${ui.border}`,
          borderRadius: '24px',
          boxShadow: ui.shadowCard,
        }}
      >
        <p className="t-micro" style={{ fontWeight: 700 }}>Ближайшее занятие</p>
        <h2 className="mt-3 display-sm" style={{ fontSize: '22px' }}>Активных записей нет</h2>
        <p className="body mt-2" style={{ color: ui.textMuted }}>
          Выберите удобное время и инструктор появится здесь.
        </p>
        <button
          className="btn-primary mt-4 w-full py-3 text-[15px]"
          onClick={onBook}
        >
          Записаться ещё
        </button>
      </div>
    )
  }

  const state = getBookingUrgencyState(booking, slot)
  const relativeLabel = getRelativeLessonLabel(slot)
  const isImmediate = relativeLabel === 'Сегодня' || relativeLabel === 'Завтра'
  const cardStyle = bookingCardStyles(state)

  return (
    <div
      className="p-5"
      style={{ ...cardStyle, borderRadius: '24px', ...(cardStyle.border ? {} : { border: `1px solid ${ui.border}` }) }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="t-micro" style={{ fontWeight: 700 }}>Ближайшее занятие</p>
          <h2
            className="mt-3 font-extrabold tracking-tight"
            style={{ fontSize: '24px', lineHeight: '1.2', color: ui.text }}
          >
            {isImmediate
              ? `${relativeLabel}, ${formatTimeRange(slot)}`
              : `${formatHumanDate(slot.date, false)}, ${formatTimeRange(slot)}`}
          </h2>
        </div>
        <BookingStatusChip state={state} slot={slot} />
      </div>
      <div className="mt-4 flex items-center gap-3.5">
        <Avatar
          initials={instructor?.avatarInitials ?? 'И'}
          color={instructor?.avatarColor || '#EEF3F5'}
          src={instructor ? getInstructorPhoto(instructor) : undefined}
          alt={instructor?.name ?? 'Инструктор'}
          size="lg"
          className="rounded-full text-[var(--accent)]"
        />
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold tracking-tight" style={{ color: ui.text }}>
            {instructor ? formatInstructorName(instructor.name) : 'Инструктор'}
          </p>
          <p className="mt-1 text-[13px] font-medium" style={{ color: ui.textMuted }}>
            {instructor?.car ?? 'Учебный автомобиль'} · {branch?.name ?? 'Филиал'}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button className="btn-primary py-3 text-[15px]" onClick={onBook}>
          Записаться ещё
        </button>
        <button className="btn-secondary py-3 text-[15px]" onClick={onAll}>
          Все записи
        </button>
      </div>
    </div>
  )
}
