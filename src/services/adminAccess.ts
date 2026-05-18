import type { StaffPermission } from '../types'
import { getDataNamespace } from './storage'
import { getWorkspaceStaffContext } from './accessControl'
import { roleHasPermission } from './schoolStaff'

export function canUseAdminPermission(permission: StaffPermission): boolean {
  if (getDataNamespace() === 'demo') return true
  return roleHasPermission(getWorkspaceStaffContext().role, permission)
}

export function assertAdminPermission(permission: StaffPermission): { ok: true } | { ok: false; error: string } {
  if (canUseAdminPermission(permission)) return { ok: true }
  return { ok: false, error: 'Недостаточно прав для этого действия.' }
}
