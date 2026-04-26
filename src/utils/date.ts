import { format, addDays, isToday, isTomorrow, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'

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

export function getNext7Days(fromDate = new Date()): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(fromDate, i + 1), 'yyyy-MM-dd'),
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

export { addDays, format, parseISO, isToday }
