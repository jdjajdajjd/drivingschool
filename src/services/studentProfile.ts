import { normalizePhone } from './bookingService'

export interface StudentProfile {
  name: string
  phone: string
  email: string
  avatarUrl: string
  passwordSet: boolean
  assignedBranchId?: string
  pendingBranchId?: string
  branchChangeRequestedAt?: string
  updatedAt: string
  createdByConsent: boolean
}

export interface StudentProfileForm {
  name: string
  phone: string
  email?: string
  password?: string
  avatarUrl?: string
}

export function getProfileKey(schoolId: string): string {
  return `dd:student_profile:${schoolId}`
}

export function loadStudentProfile(schoolId: string): StudentProfile | null {
  try {
    const raw = localStorage.getItem(getProfileKey(schoolId))
    if (!raw) return null
    const profile = JSON.parse(raw) as StudentProfile
    if (!profile.createdByConsent || !profile.name || !profile.phone) return null
    return {
      ...profile,
      email: profile.email ?? '',
      avatarUrl: profile.avatarUrl ?? '',
      passwordSet: Boolean(profile.passwordSet),
    }
  } catch {
    return null
  }
}

export function findAnyStudentProfile(): { schoolId: string; profile: StudentProfile } | null {
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key?.startsWith('dd:student_profile:')) continue
    const schoolId = key.replace('dd:student_profile:', '')
    const profile = loadStudentProfile(schoolId)
    if (profile) return { schoolId, profile }
  }
  return null
}

export function saveStudentProfile(
  schoolId: string,
  form: StudentProfileForm,
  extra?: Partial<StudentProfile>,
): StudentProfile {
  const profile: StudentProfile = {
    name: form.name.trim(),
    phone: normalizePhone(form.phone),
    email: form.email?.trim() ?? '',
    avatarUrl: form.avatarUrl?.trim() ?? '',
    passwordSet: Boolean(form.password?.trim() || extra?.passwordSet),
    updatedAt: new Date().toISOString(),
    createdByConsent: true,
    ...extra,
  }
  localStorage.setItem(getProfileKey(schoolId), JSON.stringify(profile))
  return profile
}

export function removeStudentProfile(schoolId: string): void {
  localStorage.removeItem(getProfileKey(schoolId))
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'У'
}
