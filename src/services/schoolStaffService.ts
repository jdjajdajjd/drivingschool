import type { Branch, User, UserRole } from '../types'
import { adminUsers, createCurrentStaffAuditEntry } from './adminStorage'
import { isWorkspaceSupabaseReady } from '../lib/supabase'
import { getAccessSecret } from './accessControl'
import { upsertSupabaseSchoolStaffCredential } from './staffSessionService'
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
  login?: string
  password?: string
  isActive?: boolean
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
    login: input.login?.trim() || input.existing?.login,
    role: input.role,
    roleId: input.role,
    isActive: input.isActive ?? input.existing?.isActive ?? true,
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

export async function saveSchoolStaffMemberConfirmed(input: StaffMemberInput): Promise<{ ok: boolean; user?: User; login?: string; error?: string }> {
  const saved = saveSchoolStaffMember(input)
  if (!saved.ok || !saved.user) return saved

  const login = input.login?.trim() || saved.user.login?.trim() || ''
  const password = input.password?.trim() ?? ''
  if (!isWorkspaceSupabaseReady()) return { ...saved, login: login || undefined }

  if (!login) return { ok: false, error: 'Укажите логин для входа сотрудника.' }
  if (!input.existing && password.length < 8) return { ok: false, error: 'Для нового сотрудника нужен пароль от 8 символов.' }

  try {
    const staffSecret = getAccessSecret('admin') || getAccessSecret('superadmin')
    const savedLogin = await upsertSupabaseSchoolStaffCredential({
      schoolId: saved.user.schoolId ?? input.schoolId,
      login,
      password,
      staffName: saved.user.name,
      staffRole: saved.user.role === 'superadmin' ? 'admin' : saved.user.role,
      branchIds: saved.user.branchIds,
      isActive: saved.user.isActive,
      staffSecret,
    })
    const userWithLogin = { ...saved.user, login: savedLogin }
    adminUsers.upsert(userWithLogin)
    createCurrentStaffAuditEntry(
      input.schoolId,
      input.existing ? 'user_updated' : 'user_created',
      'user',
      userWithLogin.id,
      `Обновлен доступ сотрудника ${userWithLogin.name} (${userWithLogin.role})`,
    )
    return { ok: true, user: userWithLogin, login: savedLogin }
  } catch (error) {
    if (input.existing) adminUsers.upsert(input.existing)
    else adminUsers.remove(saved.user.id)
    return { ok: false, user: saved.user, error: error instanceof Error ? error.message : 'Не удалось сохранить доступ сотрудника.' }
  }
}
