import { generateId } from '../lib/utils'
import { normalizePersonName } from '../lib/nameFormat'
import { isWorkspaceSupabaseReady } from '../lib/supabase'
import type { Instructor, Transmission } from '../types'
import { db } from './storage'
import { getSlotDateTime, normalizePhone, validateRussianPhone } from './bookingService'
import { persistSupabaseMutation, updateSupabaseInstructorActive, updateSupabaseSlotStatus, upsertSupabaseInstructor } from './supabaseAdminService'
import { assertAdminPermission } from './adminAccess'
import { validateBranchBelongsToSchool } from './tenantIntegrity'

export interface InstructorInput {
  schoolId: string
  branchId: string
  name: string
  phone?: string
  email?: string
  bio?: string
  car?: string
  transmission?: Transmission
  categories?: string[]
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
  const trimmedName = normalizePersonName(input.name)
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
    categories: input.categories?.length ? input.categories : ['B'],
    avatarInitials: createInitials(trimmedName),
    avatarColor: colorFromName(trimmedName),
    car: input.car?.trim() || undefined,
    transmission: input.transmission,
  }

  db.instructors.upsert(instructor)
  persistSupabaseMutation(upsertSupabaseInstructor(instructor.id, input, instructor.token))
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

  const trimmedName = normalizePersonName(input.name)
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
    categories: input.categories?.length ? input.categories : current.categories?.length ? current.categories : ['B'],
    isActive: input.isActive,
    avatarInitials: createInitials(trimmedName),
    avatarColor: colorFromName(trimmedName),
  }

  db.instructors.upsert(nextInstructor)
  persistSupabaseMutation(
    upsertSupabaseInstructor(
      nextInstructor.id,
      {
        schoolId: nextInstructor.schoolId,
        branchId: input.branchId,
        name: input.name,
        phone: input.phone,
        email: input.email,
        bio: input.bio,
        car: input.car,
        transmission: input.transmission,
        categories: input.categories,
        isActive: input.isActive,
      },
      nextInstructor.token,
    ),
  )
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
  persistSupabaseMutation(updateSupabaseInstructorActive(instructorId, nextInstructor.isActive))
  return { ok: true, instructor: nextInstructor }
}

export async function createInstructorConfirmed(input: InstructorInput): Promise<{ ok: boolean; instructor?: Instructor; error?: string }> {
  const access = assertAdminPermission('branches.manage')
  if (!access.ok) return access

  const trimmedName = normalizePersonName(input.name)
  if (!trimmedName) return { ok: false, error: 'Укажите имя инструктора.' }
  if (!input.branchId) return { ok: false, error: 'Выберите филиал.' }

  const branchError = validateBranchBelongsToSchool(input.schoolId, input.branchId)
  if (branchError) return { ok: false, error: branchError }

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
    categories: input.categories?.length ? input.categories : ['B'],
    avatarInitials: createInitials(trimmedName),
    avatarColor: colorFromName(trimmedName),
    car: input.car?.trim() || undefined,
    transmission: input.transmission,
  }

  if (isWorkspaceSupabaseReady()) {
    try {
      await upsertSupabaseInstructor(instructor.id, { ...input, phone: normalizedPhone, name: trimmedName }, instructor.token)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить инструктора.' }
    }
  }

  db.instructors.upsert(instructor)
  return { ok: true, instructor }
}

export async function updateInstructorConfirmed(
  instructorId: string,
  input: Omit<InstructorInput, 'schoolId'>,
): Promise<{ ok: boolean; instructor?: Instructor; error?: string }> {
  const access = assertAdminPermission('branches.manage')
  if (!access.ok) return access

  const current = db.instructors.byId(instructorId)
  if (!current) return { ok: false, error: 'Инструктор не найден.' }

  const trimmedName = normalizePersonName(input.name)
  if (!trimmedName) return { ok: false, error: 'Укажите имя инструктора.' }

  const normalizedPhone = input.phone ? normalizePhone(input.phone) : ''
  if (normalizedPhone && !validateRussianPhone(normalizedPhone)) {
    return { ok: false, error: 'Телефон инструктора указан в неверном формате.' }
  }

  const branchError = validateBranchBelongsToSchool(current.schoolId, input.branchId)
  if (branchError) return { ok: false, error: branchError }

  const nextInstructor: Instructor = {
    ...current,
    branchId: input.branchId,
    name: trimmedName,
    phone: normalizedPhone,
    email: input.email?.trim() ?? '',
    bio: input.bio?.trim() ?? '',
    car: input.car?.trim() || undefined,
    transmission: input.transmission,
    categories: input.categories?.length ? input.categories : current.categories?.length ? current.categories : ['B'],
    isActive: input.isActive,
    avatarInitials: createInitials(trimmedName),
    avatarColor: colorFromName(trimmedName),
  }

  const disabling = current.isActive && !nextInstructor.isActive
  if (isWorkspaceSupabaseReady()) {
    const futureAvailableSlots = disabling ? getFutureAvailableSlotsForInstructor(nextInstructor.id) : []
    try {
      await upsertSupabaseInstructor(
        nextInstructor.id,
        {
          schoolId: nextInstructor.schoolId,
          branchId: nextInstructor.branchId,
          name: nextInstructor.name,
          phone: nextInstructor.phone,
          email: nextInstructor.email,
          bio: nextInstructor.bio,
          car: nextInstructor.car,
          transmission: nextInstructor.transmission,
          categories: nextInstructor.categories,
          isActive: nextInstructor.isActive,
        },
        nextInstructor.token,
      )
      for (const slot of futureAvailableSlots) {
        try {
          await updateSupabaseSlotStatus(slot.id, 'cancelled')
        } catch (slotError) {
          await updateSupabaseInstructorActive(nextInstructor.id, current.isActive)
          throw slotError
        }
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить инструктора.' }
    }
  }

  if (disabling) {
    cancelFutureAvailableSlotsForInstructor(nextInstructor.id)
  }
  db.instructors.upsert(nextInstructor)
  return { ok: true, instructor: nextInstructor }
}

export async function toggleInstructorActiveConfirmed(
  instructorId: string,
  isActive?: boolean,
): Promise<{ ok: boolean; instructor?: Instructor; error?: string }> {
  const access = assertAdminPermission('branches.manage')
  if (!access.ok) return access

  const instructor = db.instructors.byId(instructorId)
  if (!instructor) return { ok: false, error: 'Инструктор не найден.' }

  const nextInstructor: Instructor = {
    ...instructor,
    isActive: typeof isActive === 'boolean' ? isActive : !instructor.isActive,
  }

  const disabling = instructor.isActive && !nextInstructor.isActive
  if (disabling) {
    const futureAvailableSlots = getFutureAvailableSlotsForInstructor(nextInstructor.id)
    if (isWorkspaceSupabaseReady()) {
      try {
        await updateSupabaseInstructorActive(instructorId, false)
        for (const slot of futureAvailableSlots) {
          try {
            await updateSupabaseSlotStatus(slot.id, 'cancelled')
          } catch (slotError) {
            await updateSupabaseInstructorActive(instructorId, instructor.isActive)
            throw slotError
          }
        }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Не удалось изменить статус инструктора.' }
      }
    }
    cancelSlots(futureAvailableSlots)
  } else if (isWorkspaceSupabaseReady()) {
    try {
      await updateSupabaseInstructorActive(instructorId, true)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось изменить статус инструктора.' }
    }
  }
  db.instructors.upsert(nextInstructor)
  return { ok: true, instructor: nextInstructor }
}

function getFutureAvailableSlotsForInstructor(instructorId: string) {
  return db.slots
    .byInstructor(instructorId)
    .filter((slot) => slot.status === 'available')
    .filter((slot) => getSlotDateTime(slot).getTime() >= Date.now())
}

function cancelFutureAvailableSlotsForInstructor(instructorId: string): void {
  cancelSlots(getFutureAvailableSlotsForInstructor(instructorId))
}

function cancelSlots(slots: ReturnType<typeof getFutureAvailableSlotsForInstructor>): void {
  for (const slot of slots) {
    db.slots.upsert({ ...slot, status: 'cancelled' })
  }
}
