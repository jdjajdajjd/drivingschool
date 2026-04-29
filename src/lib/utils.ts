import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  if (price === 0) return 'Бесплатно'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`
  }
  return phone
}

export function formatInstructorName(fullName: string): string {
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
  if (parts.length === 0) return 'Инструктор'
  if (parts.length === 1) return parts[0]
  const [lastName, ...rest] = parts
  const initials = rest
    .slice(0, 2)
    .map((part) => `${part[0]?.toUpperCase()}.`)
    .filter(Boolean)
    .join(' ')
  return initials ? `${lastName} ${initials}` : lastName
}

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`
  return `${n} ${many}`
}

export function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const mins = safeMinutes % 60
  const parts: string[] = []

  if (hours > 0) {
    parts.push(pluralize(hours, 'час', 'часа', 'часов'))
  }

  if (mins > 0 || parts.length === 0) {
    parts.push(pluralize(mins, 'минута', 'минуты', 'минут'))
  }

  return parts.join(' ')
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) {
    return `rgba(31,91,67,${alpha})`
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
