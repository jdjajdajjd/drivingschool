import { format, addDays, differenceInCalendarDays, isToday, isTomorrow, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Booking, Slot } from '../types'

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Сегодня'
  if (isTomorrow(date)) return 'Завтра'
  return format(date, 'd MMMM', { locale: ru })
}

export function formatDateFull(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMMM yyyy', { locale: ru })
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM', { locale: ru })
}

export function formatDayOfWeek(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE', { locale: ru })
}

export function formatDateTime(dateStr: string, time: string): string {
  return `${formatDate(dateStr)}, ${time}`
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [hours = 0, mins = 0] = time.split(':').map(Number)
  const total = hours * 60 + mins + Math.max(0, minutes)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function formatHumanDate(dateStr?: string | null, withYear = true): string {
  if (!dateStr) return 'Дата не выбрана'
  return format(parseISO(dateStr), withYear ? 'd MMMM yyyy' : 'd MMMM', { locale: ru })
}

export function formatTimeRange(slot?: Pick<Slot, 'time' | 'duration'> | null): string {
  if (!slot) return 'Время не выбрано'
  return `${slot.time}–${addMinutesToTime(slot.time, slot.duration)}`
}

export function getRelativeLessonLabel(slot?: Pick<Slot, 'date'> | null, now = new Date()): string {
  if (!slot) return 'Запись'
  const diff = differenceInCalendarDays(parseISO(slot.date), now)
  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Завтра'
  if (diff > 1) return `Через ${diff} ${diff % 10 === 1 && diff % 100 !== 11 ? 'день' : diff % 10 >= 2 && diff % 10 <= 4 && (diff % 100 < 10 || diff % 100 >= 20) ? 'дня' : 'дней'}`
  return 'Прошло'
}

export type BookingUrgencyState = 'today' | 'tomorrow' | 'soon-2-days' | 'future-muted' | 'completed' | 'cancelled'

export function getBookingUrgencyState(booking: Pick<Booking, 'status'>, slot?: Pick<Slot, 'date'> | null, now = new Date()): BookingUrgencyState {
  if (booking.status === 'cancelled') return 'cancelled'
  if (booking.status === 'completed') return 'completed'
  if (!slot) return 'future-muted'
  const diff = differenceInCalendarDays(parseISO(slot.date), now)
  if (diff <= 0 && isToday(parseISO(slot.date))) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === 2) return 'soon-2-days'
  return 'future-muted'
}

export function getNext7Days(fromDate = new Date()): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(fromDate, i), 'yyyy-MM-dd'),
  )
}

export function getNext14Days(fromDate = new Date()): string[] {
  return Array.from({ length: 14 }, (_, i) =>
    format(addDays(fromDate, i + 1), 'yyyy-MM-dd'),
  )
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { locale: ru })
  const end = endOfWeek(date, { locale: ru })
  const days: Date[] = []
  let current = start
  while (current <= end) {
    days.push(current)
    current = addDays(current, 1)
  }
  return days
}

export function isoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export { addDays, format, parseISO, isToday, differenceInCalendarDays }
