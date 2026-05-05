import { generateId } from '../lib/utils'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Branch } from '../types'
import { db } from './storage'
import { deleteSupabaseBranch, persistSupabaseMutation, upsertSupabaseBranch } from './supabaseAdminService'

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
  persistSupabaseMutation(upsertSupabaseBranch(branch.id, input))
  return { ok: true, branch }
}

export async function createBranchConfirmed(input: BranchInput): Promise<{ ok: boolean; branch?: Branch; error?: string }> {
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

  if (isSupabaseConfigured()) {
    try {
      await upsertSupabaseBranch(branch.id, { ...input, name: branch.name, address: branch.address, phone: branch.phone })
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить филиал.' }
    }
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
  persistSupabaseMutation(upsertSupabaseBranch(nextBranch.id, { schoolId: nextBranch.schoolId, ...input }))
  return { ok: true, branch: nextBranch }
}

export async function updateBranchConfirmed(
  branchId: string,
  input: Omit<BranchInput, 'schoolId'>,
): Promise<{ ok: boolean; branch?: Branch; error?: string }> {
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

  if (isSupabaseConfigured()) {
    try {
      await upsertSupabaseBranch(nextBranch.id, {
        schoolId: nextBranch.schoolId,
        name: nextBranch.name,
        address: nextBranch.address,
        phone: nextBranch.phone,
        isActive: nextBranch.isActive,
      })
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить филиал.' }
    }
  }

  db.branches.upsert(nextBranch)
  return { ok: true, branch: nextBranch }
}

export async function archiveBranchConfirmed(branchId: string): Promise<{ ok: boolean; branch?: Branch; error?: string }> {
  const current = db.branches.byId(branchId)
  if (!current) {
    return { ok: false, error: 'Филиал не найден.' }
  }

  const nextBranch: Branch = { ...current, isActive: false }

  if (isSupabaseConfigured()) {
    try {
      await upsertSupabaseBranch(nextBranch.id, {
        schoolId: nextBranch.schoolId,
        name: nextBranch.name,
        address: nextBranch.address,
        phone: nextBranch.phone,
        isActive: false,
      })
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось выключить филиал.' }
    }
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
  persistSupabaseMutation(deleteSupabaseBranch(branchId))
  return { ok: true }
}
