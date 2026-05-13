export type AccessRole = 'admin' | 'superadmin'

export const ADMIN_BASE_PATH = '/virazh-office-73q'
export const SUPERADMIN_BASE_PATH = '/drivedesk-root-91x'
export const ADMIN_LOGIN_PATH = '/staff-entrance-73q'
export const WORKSPACE_ADMIN_LOGIN_PATH = '/workspace-admin'
export const SUPERADMIN_LOGIN_PATH = '/root-entrance-91x'

const ACCESS_KEYS: Record<AccessRole, string> = {
  admin: 'dd:access:admin',
  superadmin: 'dd:access:superadmin',
}

const ACCESS_PASSWORD_KEYS: Record<AccessRole, string> = {
  admin: 'dd:access_password:admin',
  superadmin: 'dd:access_password:superadmin',
}

function envValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function accessValue(value: unknown): string {
  return envValue(value)
}

const ACCESS: Record<AccessRole, { login: string; password: string; redirect: string }> = {
  admin: {
    login: accessValue(import.meta.env.VITE_ADMIN_LOGIN),
    password: accessValue(import.meta.env.VITE_ADMIN_PASSWORD),
    redirect: ADMIN_BASE_PATH,
  },
  superadmin: {
    login: accessValue(import.meta.env.VITE_SUPERADMIN_LOGIN),
    password: accessValue(import.meta.env.VITE_SUPERADMIN_PASSWORD),
    redirect: SUPERADMIN_BASE_PATH,
  },
}

export function getAccessConfig(role: AccessRole) {
  return ACCESS[role]
}

export function isAccessConfigured(role: AccessRole): boolean {
  const config = getAccessConfig(role)
  return Boolean(config.login && config.password)
}

export function isAccessGranted(role: AccessRole): boolean {
  return sessionStorage.getItem(accessKey(role)) === 'granted'
}

function currentNamespace(): string {
  if (typeof window === 'undefined') return 'demo'
  return (window as Window & { __VROOM_DATA_NAMESPACE?: string }).__VROOM_DATA_NAMESPACE ?? window.sessionStorage.getItem('dd:data_namespace') ?? 'demo'
}

function accessKey(role: AccessRole): string {
  return role === 'admin' ? `${ACCESS_KEYS[role]}:${currentNamespace()}` : ACCESS_KEYS[role]
}

function accessPasswordKey(role: AccessRole): string {
  return role === 'admin' ? `${ACCESS_PASSWORD_KEYS[role]}:${currentNamespace()}` : ACCESS_PASSWORD_KEYS[role]
}

export function grantAccess(role: AccessRole, password: string): void {
  sessionStorage.setItem(accessKey(role), 'granted')
  sessionStorage.setItem(accessPasswordKey(role), password)
  localStorage.removeItem(accessKey(role))
}

export function clearAccess(role: AccessRole): void {
  sessionStorage.removeItem(accessKey(role))
  sessionStorage.removeItem(accessPasswordKey(role))
  localStorage.removeItem(accessKey(role))
}

export function getAccessPassword(role: AccessRole): string {
  return sessionStorage.getItem(accessPasswordKey(role)) ?? ''
}
