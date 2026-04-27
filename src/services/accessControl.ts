export type AccessRole = 'admin' | 'superadmin'

export const ADMIN_BASE_PATH = '/virazh-office-73q'
export const SUPERADMIN_BASE_PATH = '/drivedesk-root-91x'
export const ADMIN_LOGIN_PATH = '/staff-entrance-73q'
export const SUPERADMIN_LOGIN_PATH = '/root-entrance-91x'

const ACCESS_KEYS: Record<AccessRole, string> = {
  admin: 'dd:access:admin',
  superadmin: 'dd:access:superadmin',
}

const ACCESS_PASSWORD_KEYS: Record<AccessRole, string> = {
  admin: 'dd:access_password:admin',
  superadmin: 'dd:access_password:superadmin',
}

const ACCESS: Record<AccessRole, { login: string; password: string; redirect: string }> = {
  admin: {
    login: import.meta.env.VITE_ADMIN_LOGIN || 'virazh-admin',
    password: import.meta.env.VITE_ADMIN_PASSWORD || 'drivedesk-admin-2026',
    redirect: ADMIN_BASE_PATH,
  },
  superadmin: {
    login: import.meta.env.VITE_SUPERADMIN_LOGIN || 'drivedesk-root',
    password: import.meta.env.VITE_SUPERADMIN_PASSWORD || 'drivedesk-root-2026',
    redirect: SUPERADMIN_BASE_PATH,
  },
}

export function getAccessConfig(role: AccessRole) {
  return ACCESS[role]
}

export function isAccessGranted(role: AccessRole): boolean {
  return sessionStorage.getItem(ACCESS_KEYS[role]) === 'granted'
}

export function grantAccess(role: AccessRole, password: string): void {
  sessionStorage.setItem(ACCESS_KEYS[role], 'granted')
  sessionStorage.setItem(ACCESS_PASSWORD_KEYS[role], password)
  localStorage.removeItem(ACCESS_KEYS[role])
}

export function clearAccess(role: AccessRole): void {
  sessionStorage.removeItem(ACCESS_KEYS[role])
  sessionStorage.removeItem(ACCESS_PASSWORD_KEYS[role])
  localStorage.removeItem(ACCESS_KEYS[role])
}

export function getAccessPassword(role: AccessRole): string {
  return sessionStorage.getItem(ACCESS_PASSWORD_KEYS[role]) ?? ''
}
