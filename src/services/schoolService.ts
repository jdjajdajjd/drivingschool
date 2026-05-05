import { addDays, isAfter, subDays } from 'date-fns'
import { isSupabaseConfigured } from '../lib/supabase'
import { generateId } from '../lib/utils'
import type { School, SchoolOverview } from '../types'
import { DRIVING_CATEGORIES } from './drivingCategories'
import { getBillingSummary } from './modules'
import { resetDemoData as resetSeedData } from './seed'
import { db } from './storage'
import { validateDataIntegrity } from './integrityService'
import { updateSupabaseSchoolSettings } from './supabaseAdminService'

export function getSchools(): School[] {
  return [...db.schools.all()].sort((left, right) => left.name.localeCompare(right.name, 'ru'))
}

export function getSchoolById(schoolId: string): School | null {
  return db.schools.byId(schoolId)
}

export function getSchoolBySlug(slug: string): School | null {
  return db.schools.bySlug(slug)
}

export function validateSchoolSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug)
}

export function validatePrimaryColor(color: string): boolean {
  return /^#([0-9a-fA-F]{6})$/.test(color)
}

const VALID_CATEGORY_CODES = new Set(DRIVING_CATEGORIES.map((category) => category.code))

function normalizeCategoryCodes(codes?: string[]): string[] | undefined {
  if (!codes) return undefined
  const normalized = codes.filter((code, index) => VALID_CATEGORY_CODES.has(code) && codes.indexOf(code) === index)
  return normalized.length > 0 ? normalized : undefined
}

export interface SchoolInput {
  name: string
  slug: string
  description: string
  phone: string
  email: string
  address: string
  primaryColor?: string
  logoUrl?: string
  bookingLimitEnabled?: boolean
  maxActiveBookingsPerStudent?: number
  branchSelectionMode?: School['branchSelectionMode']
  maxSlotsPerBooking?: number
  defaultLessonDuration?: number
  enabledCategoryCodes?: string[]
  isActive?: boolean
}

export function createSchool(input: SchoolInput): { ok: boolean; school?: School; error?: string } {
  const name = input.name.trim()
  const slug = input.slug.trim()

  if (!name) {
    return { ok: false, error: 'Укажите название автошколы.' }
  }

  if (!slug || !validateSchoolSlug(slug)) {
    return { ok: false, error: 'Slug должен содержать только латиницу, цифры и дефис.' }
  }

  if (db.schools.bySlug(slug)) {
    return { ok: false, error: 'Школа с таким slug уже существует.' }
  }

  if (input.primaryColor && !validatePrimaryColor(input.primaryColor)) {
    return { ok: false, error: 'Укажите корректный цвет в формате #RRGGBB.' }
  }

  const school: School = {
    id: generateId('school'),
    name,
    slug,
    description: input.description.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    address: input.address.trim(),
    createdAt: new Date().toISOString(),
    primaryColor: input.primaryColor || '#1f5b43',
    logoUrl: input.logoUrl?.trim() || undefined,
    bookingLimitEnabled: input.bookingLimitEnabled ?? true,
    maxActiveBookingsPerStudent: input.maxActiveBookingsPerStudent ?? 2,
    branchSelectionMode: input.branchSelectionMode ?? 'student_choice',
    maxSlotsPerBooking: input.maxSlotsPerBooking ?? 1,
    defaultLessonDuration: input.defaultLessonDuration ?? 90,
    enabledCategoryCodes: normalizeCategoryCodes(input.enabledCategoryCodes) ?? ['B'],
    isActive: input.isActive ?? true,
  }

  db.schools.upsert(school)
  return { ok: true, school }
}

export function updateSchool(schoolId: string, patch: Partial<SchoolInput>): { ok: boolean; school?: School; error?: string } {
  const school = db.schools.byId(schoolId)
  if (!school) {
    return { ok: false, error: 'Автошкола не найдена.' }
  }

  const nextSlug = (patch.slug ?? school.slug).trim()
  const nextName = (patch.name ?? school.name).trim()

  if (!nextName) {
    return { ok: false, error: 'Укажите название автошколы.' }
  }

  if (!nextSlug || !validateSchoolSlug(nextSlug)) {
    return { ok: false, error: 'Slug должен содержать только латиницу, цифры и дефис.' }
  }

  const schoolWithSlug = db.schools.bySlug(nextSlug)
  if (schoolWithSlug && schoolWithSlug.id !== schoolId) {
    return { ok: false, error: 'Slug уже занят другой школой.' }
  }

  const nextColor = patch.primaryColor ?? school.primaryColor ?? ''
  if (nextColor && !validatePrimaryColor(nextColor)) {
    return { ok: false, error: 'Укажите корректный цвет в формате #RRGGBB.' }
  }

  const maxActive = patch.maxActiveBookingsPerStudent ?? school.maxActiveBookingsPerStudent ?? 2
  if (!Number.isFinite(maxActive) || !Number.isInteger(maxActive) || maxActive < 1 || maxActive > 10) {
    return { ok: false, error: 'Лимит записей должен быть целым числом от 1 до 10.' }
  }

  const maxSlotsPerBooking = patch.maxSlotsPerBooking ?? school.maxSlotsPerBooking ?? 1
  if (!Number.isFinite(maxSlotsPerBooking) || !Number.isInteger(maxSlotsPerBooking) || maxSlotsPerBooking < 1 || maxSlotsPerBooking > 6) {
    return { ok: false, error: 'Лимит занятий за одну запись должен быть целым числом от 1 до 6.' }
  }

  const defaultLessonDuration = patch.defaultLessonDuration ?? school.defaultLessonDuration ?? 90
  if (
    !Number.isFinite(defaultLessonDuration) ||
    !Number.isInteger(defaultLessonDuration) ||
    defaultLessonDuration < 30 ||
    defaultLessonDuration > 240 ||
    defaultLessonDuration % 15 !== 0
  ) {
    return { ok: false, error: 'Длительность занятия должна быть целым числом от 30 до 240 минут с шагом 15 минут.' }
  }

  const enabledCategoryCodes =
    patch.enabledCategoryCodes !== undefined
      ? normalizeCategoryCodes(patch.enabledCategoryCodes)
      : school.enabledCategoryCodes

  const updated: School = {
    ...school,
    ...patch,
    name: nextName,
    slug: nextSlug,
    description: patch.description !== undefined ? patch.description.trim() : school.description,
    phone: patch.phone !== undefined ? patch.phone.trim() : school.phone,
    email: patch.email !== undefined ? patch.email.trim() : school.email,
    address: patch.address !== undefined ? patch.address.trim() : school.address,
    primaryColor: nextColor || undefined,
    logoUrl: patch.logoUrl !== undefined ? patch.logoUrl.trim() || undefined : school.logoUrl,
    bookingLimitEnabled: patch.bookingLimitEnabled ?? school.bookingLimitEnabled,
    maxActiveBookingsPerStudent: maxActive,
    branchSelectionMode: patch.branchSelectionMode ?? school.branchSelectionMode ?? 'student_choice',
    maxSlotsPerBooking,
    defaultLessonDuration,
    enabledCategoryCodes,
    isActive: patch.isActive ?? school.isActive,
  }

  db.schools.upsert(updated)
  return { ok: true, school: updated }
}

export async function updateSchoolConfirmed(schoolId: string, patch: Partial<SchoolInput>): Promise<{ ok: boolean; school?: School; error?: string }> {
  const school = db.schools.byId(schoolId)
  if (!school) {
    return { ok: false, error: 'Автошкола не найдена.' }
  }

  const result = updateSchool(schoolId, patch)
  if (!result.ok || !result.school) {
    return result
  }

  if (isSupabaseConfigured()) {
    try {
      await updateSupabaseSchoolSettings(schoolId, {
        name: result.school.name,
        slug: result.school.slug,
        description: result.school.description,
        primaryColor: result.school.primaryColor,
        logoUrl: result.school.logoUrl,
        bookingLimitEnabled: result.school.bookingLimitEnabled,
        maxActiveBookingsPerStudent: result.school.maxActiveBookingsPerStudent,
        branchSelectionMode: result.school.branchSelectionMode,
        maxSlotsPerBooking: result.school.maxSlotsPerBooking,
        defaultLessonDuration: result.school.defaultLessonDuration,
        enabledCategoryCodes: result.school.enabledCategoryCodes,
      })
    } catch (error) {
      db.schools.upsert(school)
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить настройки школы.' }
    }
  }

  return result
}

export function resetProductData(): void {
  resetSeedData()
}

export function getSchoolOverview(schoolId: string): SchoolOverview | null {
  const school = db.schools.byId(schoolId)
  if (!school) {
    return null
  }

  const now = new Date()
  const sevenDaysAhead = addDays(now, 7)
  const last30Days = subDays(now, 30)
  const bookings = db.bookings.bySchool(schoolId)
  const activeBookings = bookings.filter((booking) => booking.status === 'active')

  return {
    school,
    branchCount: db.branches.bySchool(schoolId).length,
    instructorCount: db.instructors.bySchool(schoolId).length,
    studentCount: db.students.bySchool(schoolId).length,
    activeBookingsCount: activeBookings.length,
    bookingsLast30Days: bookings.filter((booking) => new Date(booking.createdAt) >= last30Days).length,
    freeSlots7Days: db.slots
      .bySchool(schoolId)
      .filter((slot) => slot.status === 'available')
      .filter((slot) => {
        const startsAt = new Date(`${slot.date}T${slot.time}:00`)
        return isAfter(startsAt, now) && startsAt <= sevenDaysAhead
      }).length,
    enabledModulesCount: db.schoolModules.bySchool(schoolId).filter((item) => item.status === 'enabled').length,
    billing: getBillingSummary(schoolId),
    integrityWarnings: validateDataIntegrity(schoolId).length,
  }
}
