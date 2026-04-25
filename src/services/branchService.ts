import { generateId } from '../lib/utils'
import type { Branch } from '../types'
import { db } from './storage'

export interface BranchInput {
  schoolId: string
  name: string
  address?: string
  phone?: string
  isActive: boolean
}

export function getBranchesBySchool(schoolId: string): Branch[] {
  return [...db.branches.bySchool(schoolId)].sort((left, right) => left.name.localeCompare(right.name, 'ru'))
}

export function createBranch(input: BranchInput): { ok: boolean; branch?: Branch; error?: string } {
  const name = input.name.trim()
  if (!name) {
    return { ok: false, error: 'Укажите название филиала.' }
  }

  const branch: Branch = {
    id: generateId('branch'),
    schoolId: input.schoolId,
    name,
    address: input.address?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    isActive: input.isActive,
  }

  db.branches.upsert(branch)
  return { ok: true, branch }
}

export function updateBranch(branchId: string, input: Omit<BranchInput, 'schoolId'>): { ok: boolean; branch?: Branch; error?: string } {
  const current = db.branches.byId(branchId)
  if (!current) {
    return { ok: false, error: 'Филиал не найден.' }
  }

  const name = input.name.trim()
  if (!name) {
    return { ok: false, error: 'Укажите название филиала.' }
  }

  const nextBranch: Branch = {
    ...current,
    name,
    address: input.address?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    isActive: input.isActive,
  }

  db.branches.upsert(nextBranch)
  return { ok: true, branch: nextBranch }
}

export function deleteBranchSafe(branchId: string): { ok: boolean; error?: string } {
  const branch = db.branches.byId(branchId)
  if (!branch) {
    return { ok: false, error: 'Филиал не найден.' }
  }

  const hasInstructors = db.instructors.byBranch(branchId).length > 0
  const hasSlots = db.slots.byBranch(branchId).length > 0
  const hasBookings = db.bookings.all().some((booking) => booking.branchId === branchId)

  if (hasInstructors || hasSlots || hasBookings) {
    return {
      ok: false,
      error:
        'У филиала есть связанные инструкторы, слоты или записи. Сначала перенесите или отключите связанные данные.',
    }
  }

  db.branches.remove(branchId)
  return { ok: true }
}
