import { generateId } from '../lib/utils'
import type { Instructor, Transmission } from '../types'
import { db } from './storage'
import { normalizePhone, validateRussianPhone } from './bookingService'

export interface InstructorInput {
  schoolId: string
  branchId: string
  name: string
  phone?: string
  email?: string
  bio?: string
  car?: string
  transmission?: Transmission
  isActive: boolean
}

function createInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function colorFromName(name: string): string {
  const palette = ['#214f3d', '#356951', '#486f60', '#2a5d86', '#405769']
  const hash = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

export function generateInstructorToken(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)

  let token = `tok-${slug || 'instructor'}-${Math.random().toString(36).slice(2, 7)}`
  while (db.instructors.byToken(token)) {
    token = `tok-${slug || 'instructor'}-${Math.random().toString(36).slice(2, 7)}`
  }
  return token
}

export function getInstructorsBySchool(schoolId: string): Instructor[] {
  return [...db.instructors.bySchool(schoolId)].sort((left, right) => left.name.localeCompare(right.name, 'ru'))
}

export function createInstructor(input: InstructorInput): { ok: boolean; instructor?: Instructor; error?: string } {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    return { ok: false, error: 'Укажите имя инструктора.' }
  }

  if (!input.branchId) {
    return { ok: false, error: 'Выберите филиал.' }
  }

  const normalizedPhone = input.phone ? normalizePhone(input.phone) : ''
  if (normalizedPhone && !validateRussianPhone(normalizedPhone)) {
    return { ok: false, error: 'Телефон инструктора указан в неверном формате.' }
  }

  const instructor: Instructor = {
    id: generateId('inst'),
    schoolId: input.schoolId,
    branchId: input.branchId,
    name: trimmedName,
    phone: normalizedPhone,
    email: input.email?.trim() ?? '',
    token: generateInstructorToken(trimmedName),
    bio: input.bio?.trim() ?? '',
    experience: 0,
    isActive: input.isActive,
    categories: ['B'],
    avatarInitials: createInitials(trimmedName),
    avatarColor: colorFromName(trimmedName),
    car: input.car?.trim() || undefined,
    transmission: input.transmission,
  }

  db.instructors.upsert(instructor)
  return { ok: true, instructor }
}

export function updateInstructor(
  instructorId: string,
  input: Omit<InstructorInput, 'schoolId'>,
): { ok: boolean; instructor?: Instructor; error?: string } {
  const current = db.instructors.byId(instructorId)
  if (!current) {
    return { ok: false, error: 'Инструктор не найден.' }
  }

  const trimmedName = input.name.trim()
  if (!trimmedName) {
    return { ok: false, error: 'Укажите имя инструктора.' }
  }

  const normalizedPhone = input.phone ? normalizePhone(input.phone) : ''
  if (normalizedPhone && !validateRussianPhone(normalizedPhone)) {
    return { ok: false, error: 'Телефон инструктора указан в неверном формате.' }
  }

  const nextInstructor: Instructor = {
    ...current,
    branchId: input.branchId,
    name: trimmedName,
    phone: normalizedPhone,
    email: input.email?.trim() ?? '',
    bio: input.bio?.trim() ?? '',
    car: input.car?.trim() || undefined,
    transmission: input.transmission,
    isActive: input.isActive,
    avatarInitials: createInitials(trimmedName),
    avatarColor: colorFromName(trimmedName),
  }

  db.instructors.upsert(nextInstructor)
  return { ok: true, instructor: nextInstructor }
}

export function toggleInstructorActive(
  instructorId: string,
  isActive?: boolean,
): { ok: boolean; instructor?: Instructor; error?: string } {
  const instructor = db.instructors.byId(instructorId)
  if (!instructor) {
    return { ok: false, error: 'Инструктор не найден.' }
  }

  const nextInstructor: Instructor = {
    ...instructor,
    isActive: typeof isActive === 'boolean' ? isActive : !instructor.isActive,
  }

  db.instructors.upsert(nextInstructor)
  return { ok: true, instructor: nextInstructor }
}
