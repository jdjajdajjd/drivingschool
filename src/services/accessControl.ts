export type AccessRole = 'admin' | 'superadmin'

export const ADMIN_BASE_PATH = '/virazh-office-73q'
export const SUPERADMIN_BASE_PATH = '/drivedesk-root-91x'
export const ADMIN_LOGIN_PATH = '/staff-entrance-73q'
export const SUPERADMIN_LOGIN_PATH = '/root-entrance-91x'

const ACCESS_KEYS: Record<AccessRole, string> = {
  admin: 'dd:access:admin',
  superadmin: 'dd:access:superadmin',
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
  return localStorage.getItem(ACCESS_KEYS[role]) === 'granted'
}

export function grantAccess(role: AccessRole): void {
  localStorage.setItem(ACCESS_KEYS[role], 'granted')
}

export function clearAccess(role: AccessRole): void {
  localStorage.removeItem(ACCESS_KEYS[role])
}
