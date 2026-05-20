import { isSupabaseRemoteConfigured } from '../lib/supabase'

export type AccessRole = 'admin' | 'superadmin'
export type WorkspaceStaffRole = 'director' | 'admin' | 'branch_admin' | 'accountant' | 'instructor'

export interface WorkspaceStaffContext {
  role: WorkspaceStaffRole
  schoolId?: string
  branchIds: string[]
  name?: string
}

export const DEMO_ADMIN_BASE_PATH = '/demo/admin'
export const ADMIN_BASE_PATH = '/admin-panel'
export const SUPERADMIN_BASE_PATH = '/superadmin'
export const ADMIN_LOGIN_PATH = '/demo/admin-login'
export const WORKSPACE_ADMIN_LOGIN_PATH = '/admin-login'
export const SUPERADMIN_LOGIN_PATH = '/operator/login'

export function getAdminBasePathForLocation(pathname = typeof window === 'undefined' ? ADMIN_BASE_PATH : window.location.pathname): string {
  return pathname === DEMO_ADMIN_BASE_PATH || pathname.startsWith(`${DEMO_ADMIN_BASE_PATH}/`) ? DEMO_ADMIN_BASE_PATH : ADMIN_BASE_PATH
}

const ACCESS_KEYS: Record<AccessRole, string> = {
  admin: 'dd:access:admin',
  superadmin: 'dd:access:superadmin',
}

const ACCESS_SECRET_KEYS: Record<AccessRole, string> = {
  admin: 'dd:access_secret:admin',
  superadmin: 'dd:access_secret:superadmin',
}

const WORKSPACE_STAFF_CONTEXT_KEY = 'dd:staff_context:workspace'

function envValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

const LEGACY_ACCESS: Record<AccessRole, { login: string; password: string; redirect: string }> = {
  admin: {
    login: envValue(import.meta.env.VITE_ADMIN_LOGIN),
    password: envValue(import.meta.env.VITE_ADMIN_PASSWORD),
    redirect: ADMIN_BASE_PATH,
  },
  superadmin: {
    login: envValue(import.meta.env.VITE_SUPERADMIN_LOGIN),
    password: envValue(import.meta.env.VITE_SUPERADMIN_PASSWORD),
    redirect: SUPERADMIN_BASE_PATH,
  },
}

export function canUseLegacyAccess(): boolean {
  return !isSupabaseRemoteConfigured()
}

function currentNamespace(): string {
  if (typeof window === 'undefined') return 'demo'
  return (
    (window as Window & { __VROOM_DATA_NAMESPACE?: string }).__VROOM_DATA_NAMESPACE ??
    window.sessionStorage.getItem('dd:data_namespace') ??
    'demo'
  )
}

function accessKey(role: AccessRole): string {
  return role === 'admin' ? `${ACCESS_KEYS[role]}:${currentNamespace()}` : ACCESS_KEYS[role]
}

function accessSecretKey(role: AccessRole): string {
  return role === 'admin' ? `${ACCESS_SECRET_KEYS[role]}:${currentNamespace()}` : ACCESS_SECRET_KEYS[role]
}

export function isAccessConfigured(role: AccessRole, mode: 'demo' | 'workspace' = 'workspace'): boolean {
  if (role === 'admin' && mode === 'demo') return true
  return isSupabaseRemoteConfigured() || isLegacyAccessConfigured(role)
}

export function isAccessGranted(role: AccessRole): boolean {
  if (sessionStorage.getItem(accessKey(role)) !== 'granted') return false
  const requiresSecret = role === 'superadmin' || (role === 'admin' && currentNamespace() === 'workspace')
  return requiresSecret ? Boolean(sessionStorage.getItem(accessSecretKey(role))) : true
}

export function grantAccess(role: AccessRole, secret = ''): void {
  sessionStorage.setItem(accessKey(role), 'granted')
  if (role === 'admin') {
    sessionStorage.setItem('dd:supabase_workspace_ready', 'false')
    if (currentNamespace() === 'workspace' && !sessionStorage.getItem(WORKSPACE_STAFF_CONTEXT_KEY)) {
      setWorkspaceStaffContext({ role: 'admin', branchIds: [] })
    }
  }
  if (secret) {
    sessionStorage.setItem(accessSecretKey(role), secret)
  } else {
    sessionStorage.removeItem(accessSecretKey(role))
  }
  localStorage.removeItem(accessKey(role))
}

export function clearAccess(role: AccessRole): void {
  sessionStorage.removeItem(accessKey(role))
  sessionStorage.removeItem(accessSecretKey(role))
  if (role === 'admin') {
    sessionStorage.removeItem('dd:supabase_workspace_ready')
    sessionStorage.removeItem(WORKSPACE_STAFF_CONTEXT_KEY)
  }
  localStorage.removeItem(accessKey(role))
}

export function getAccessSecret(role: AccessRole): string {
  return sessionStorage.getItem(accessSecretKey(role)) ?? ''
}

export function hasWorkspaceAdminAccessForSchool(schoolId?: string): boolean {
  if (typeof window === 'undefined') return false
  if (window.sessionStorage.getItem('dd:access:admin:workspace') !== 'granted') return false
  if (!window.sessionStorage.getItem('dd:access_secret:admin:workspace')) return false

  const context = getWorkspaceStaffContext()
  return Boolean(context.schoolId && (!schoolId || context.schoolId === schoolId))
}

export function setWorkspaceStaffContext(context: WorkspaceStaffContext): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(
    WORKSPACE_STAFF_CONTEXT_KEY,
    JSON.stringify({
      ...context,
      branchIds: Array.from(new Set(context.branchIds.filter(Boolean))),
    }),
  )
}

export function getWorkspaceStaffContext(): WorkspaceStaffContext {
  if (typeof window === 'undefined') return { role: 'admin', branchIds: [] }
  try {
    const raw = sessionStorage.getItem(WORKSPACE_STAFF_CONTEXT_KEY)
    if (!raw) return { role: 'admin', branchIds: [] }
    const parsed = JSON.parse(raw) as Partial<WorkspaceStaffContext>
    const allowedRoles: WorkspaceStaffRole[] = ['director', 'admin', 'branch_admin', 'accountant', 'instructor']
    const role = allowedRoles.includes(parsed.role as WorkspaceStaffRole) ? parsed.role as WorkspaceStaffRole : 'admin'
    return {
      role,
      schoolId: parsed.schoolId,
      branchIds: Array.isArray(parsed.branchIds) ? parsed.branchIds.filter(Boolean) : [],
      name: parsed.name,
    }
  } catch {
    return { role: 'admin', branchIds: [] }
  }
}

export function isBranchAdminContext(): boolean {
  const role = getWorkspaceStaffContext().role
  return role === 'branch_admin' || role === 'instructor'
}

export function canAccessBranch(branchId?: string | null): boolean {
  const context = getWorkspaceStaffContext()
  if (context.role !== 'branch_admin' && context.role !== 'instructor') return true
  return Boolean(branchId && context.branchIds.includes(branchId))
}

export function getLegacyAccessConfig(role: AccessRole) {
  return LEGACY_ACCESS[role]
}

export function isLegacyAccessConfigured(role: AccessRole): boolean {
  if (!canUseLegacyAccess()) return false
  const config = getLegacyAccessConfig(role)
  return Boolean(config.login && config.password)
}
