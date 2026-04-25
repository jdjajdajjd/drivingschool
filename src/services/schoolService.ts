import { addDays, isAfter, subDays } from 'date-fns'
import { generateId } from '../lib/utils'
import type { School, SchoolOverview } from '../types'
import { getBillingSummary } from './modules'
import { resetDemoData } from './seed'
import { db } from './storage'
import { validateDataIntegrity } from './integrityService'

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
  if (maxActive < 1 || maxActive > 10) {
    return { ok: false, error: 'Лимит записей должен быть от 1 до 10.' }
  }

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
    isActive: patch.isActive ?? school.isActive,
  }

  db.schools.upsert(updated)
  return { ok: true, school: updated }
}

export function performDemoReset(): void {
  resetDemoData()
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
