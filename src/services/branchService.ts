import { generateId } from '../lib/utils'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Branch } from '../types'
import { db } from './storage'
import { updateSupabaseSlotStatus, upsertSupabaseBranch } from './supabaseAdminService'

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

async function persistBranchWithInactiveSlotCleanup(nextBranch: Branch): Promise<{ ok: boolean; branch?: Branch; error?: string }> {
  const now = Date.now()
  const futureAvailableSlots = nextBranch.isActive
    ? []
    : db.slots
        .byBranch(nextBranch.id)
        .filter(
          (slot) =>
            slot.status === 'available' &&
            new Date(`${slot.date}T${slot.time}:00`).getTime() >= now,
        )

  if (isSupabaseConfigured()) {
    try {
      await upsertSupabaseBranch(nextBranch.id, {
        schoolId: nextBranch.schoolId,
        name: nextBranch.name,
        address: nextBranch.address,
        phone: nextBranch.phone,
        isActive: nextBranch.isActive,
      })
      await Promise.all(futureAvailableSlots.map((slot) => updateSupabaseSlotStatus(slot.id, 'cancelled')))
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить филиал.' }
    }
  }

  db.branches.upsert(nextBranch)
  futureAvailableSlots.forEach((slot) => db.slots.upsert({ ...slot, status: 'cancelled' }))
  return { ok: true, branch: nextBranch }
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

  return persistBranchWithInactiveSlotCleanup(nextBranch)
}

export async function archiveBranchConfirmed(branchId: string): Promise<{ ok: boolean; branch?: Branch; error?: string }> {
  const current = db.branches.byId(branchId)
  if (!current) {
    return { ok: false, error: 'Филиал не найден.' }
  }

  const nextBranch: Branch = { ...current, isActive: false }
  const result = await persistBranchWithInactiveSlotCleanup(nextBranch)
  return result.ok ? result : { ...result, error: result.error ?? 'Не удалось выключить филиал.' }
}
