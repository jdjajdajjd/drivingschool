import type { Branch, User, UserRole } from '../types'
import { adminUsers, createCurrentStaffAuditEntry } from './adminStorage'
import { normalizeStaffBranches, normalizeStaffMember, permissionsForRole } from './schoolStaff'
import { normalizePersonName } from '../lib/nameFormat'

export interface StaffMemberInput {
  schoolId: string
  name: string
  phone: string
  email?: string
  role: UserRole
  branchIds?: string[]
  branches?: Pick<Branch, 'id'>[]
  existing?: User | null
}

export function listSchoolStaff(schoolId: string): User[] {
  return adminUsers.all(schoolId)
}

export function saveSchoolStaffMember(input: StaffMemberInput): { ok: boolean; user?: User; error?: string } {
  const name = normalizePersonName(input.name)
  const phone = input.phone.trim()
  const email = input.email?.trim()

  if (!input.schoolId) return { ok: false, error: 'Школа не выбрана.' }
  if (!name) return { ok: false, error: 'Укажите имя сотрудника.' }
  if (!phone) return { ok: false, error: 'Укажите телефон сотрудника.' }

  const permissions = permissionsForRole(input.role)
  const user: User = normalizeStaffMember({
    id: input.existing?.id ?? `user_${Date.now()}`,
    schoolId: input.existing?.schoolId ?? input.schoolId,
    name,
    phone,
    email: email || undefined,
    role: input.role,
    roleId: input.role,
    isActive: input.existing?.isActive ?? true,
    branchIds: normalizeStaffBranches(input.role, input.branchIds ?? [], input.branches ?? []),
    canViewFinances: permissions.includes('finance.view'),
    canManageSettings: permissions.includes('settings.manage'),
    canDeleteData: permissions.includes('data.delete'),
    canManageStaff: permissions.includes('staff.manage'),
    createdAt: input.existing?.createdAt ?? new Date().toISOString(),
    updatedAt: input.existing ? new Date().toISOString() : undefined,
  })

  adminUsers.upsert(user)
  createCurrentStaffAuditEntry(
    input.schoolId,
    input.existing ? 'user_updated' : 'user_created',
    'user',
    user.id,
    `${input.existing ? 'Обновлен' : 'Добавлен'} сотрудник ${user.name} (${user.role})`,
  )
  return { ok: true, user }
}
