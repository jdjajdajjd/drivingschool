import { getDataNamespace } from './storage'

export function getPreferenceStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return getDataNamespace() === 'demo' ? window.sessionStorage : window.localStorage
}

export function getPreference(key: string): string | null {
  try {
    return getPreferenceStorage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function setPreference(key: string, value: string): void {
  try {
    getPreferenceStorage()?.setItem(key, value)
  } catch {
    // Preferences are convenience-only.
  }
}

export function removePreference(key: string): void {
  try {
    getPreferenceStorage()?.removeItem(key)
  } catch {
    // Preferences are convenience-only.
  }
}
