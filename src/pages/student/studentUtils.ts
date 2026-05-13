import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { normalizePhone } from '../../services/bookingService'
import { db } from '../../services/storage'
import type { StudentProfile } from '../../services/studentProfile'
import type { LessonType, Slot, TrainingStage } from '../../types'
import type { LessonFilter, ResolvedStudentBooking } from './studentTypes'

export const selectedInstructorStorageKey = (schoolId: string) => `vroom:student_selected_instructor:${schoolId}`

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'У'
}

export function compactStudentName(name: string) {
  const [lastName = '', firstName = '', middleName = ''] = name.trim().split(/\s+/)
  const initialsText = [firstName, middleName].filter(Boolean).map((part) => `${part[0]?.toUpperCase()}.`).join('')
  return [lastName, initialsText].filter(Boolean).join(' ') || name
}

const weekdayShortLabels = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']

export function weekdayShort(date: Date) {
  return weekdayShortLabels[date.getDay()] ?? ''
}

export function lessonType(slot: Slot): LessonFilter {
  if (slot.lessonType === 'extra') return 'extra'
  if (slot.lessonType) return 'main'
  const hour = Number(slot.time.split(':')[0] ?? 0)
  return slot.duration > 90 || hour >= 15 ? 'extra' : 'main'
}

export const lessonTypeLabels: Record<LessonType, string> = {
  driving: 'Вождение',
  main: 'Основное вождение',
  extra: 'Дополнительное вождение',
  practice_ground: 'Площадка',
  city: 'Город',
  exam_route: 'Экзаменационный маршрут',
  internal_exam: 'Внутренний экзамен',
  retake: 'Пересдача',
  mistakes: 'Отработка ошибок',
}

export const trainingStageLabels: Record<TrainingStage, string> = {
  theory: 'Теория',
  practice_ground: 'Площадка',
  city: 'Город',
  exam_prep: 'Подготовка к экзамену',
  exam: 'Экзамен',
  completed: 'Завершено',
  new_request: 'Новая заявка',
  awaiting_contract: 'Ждет договор',
  contract_signed: 'Договор подписан',
  training_active: 'Обучение идет',
  no_bookings: 'Нет занятий',
  has_debt: 'Есть долг',
  missing_documents: 'Не хватает документов',
  theory_completed: 'Теория завершена',
  practice_active: 'Практика идет',
  practice_completed: 'Практика завершена',
  ready_for_internal_exam: 'Готов к внутреннему экзамену',
  internal_exam_passed: 'Внутренний экзамен сдан',
  ready_for_gibdd: 'Готов к ГИБДД',
  training_completed: 'Обучение завершено',
  archived: 'В архиве',
  refused: 'Отказ',
  frozen: 'Пауза',
}

export function lessonTypeLabel(slot: Slot | null) {
  if (!slot) return 'Тип занятия не выбран'
  if (slot.lessonType) return lessonTypeLabels[slot.lessonType]
  return 'Вождение'
}

export function filterSlots(slots: Slot[], instructorId: string, filter: LessonFilter) {
  return slots.filter((slot) => {
    if (instructorId && slot.instructorId !== instructorId) return false
    if (filter !== 'all' && lessonType(slot) !== filter) return false
    return true
  })
}

export function slotTimeRange(slot: Slot | null) {
  if (!slot) return 'Время не выбрано'
  const date = parseISO(slot.date)
  const [hours = 0, minutes = 0] = slot.time.split(':').map(Number)
  const end = new Date(date)
  end.setHours(hours, minutes + slot.duration, 0, 0)
  return `${slot.time} – ${format(end, 'HH:mm')}`
}

export function lessonTime(slot: Slot | null) {
  if (!slot) return 'Время не выбрано'
  const date = parseISO(slot.date)
  const day = isToday(date) ? 'Сегодня' : isTomorrow(date) ? 'Завтра' : format(date, 'EEEE, d MMMM', { locale: ru })
  return `${day}, ${slotTimeRange(slot)}`
}

export function selectedDayTitle(date: Date) {
  if (isToday(date)) return `Сегодня, ${format(date, 'd MMMM', { locale: ru })}`
  if (isTomorrow(date)) return `Завтра, ${format(date, 'd MMMM', { locale: ru })}`
  return format(date, 'EEEE, d MMMM', { locale: ru })
}

export function safePercent(completed = 0, total = 0) {
  if (!total) return 0
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)))
}

export function formatDateValue(value: string | null | undefined) {
  if (!value) return 'Пока не назначено'
  return format(parseISO(value), 'dd.MM.yyyy', { locale: ru })
}

export function resolveBookings(schoolId: string, profile: StudentProfile): ResolvedStudentBooking[] {
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

export function imageFileToDataUrl(file: File): Promise<string> {
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
