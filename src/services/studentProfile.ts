import { normalizePhone } from './bookingService'
import type { LessonDescription, StudentProgress } from '../types'

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

// ─── Student Progress ─────────────────────────────────────────────────────────

export function getProgressKey(studentId: string): string {
  return `dd:student_progress:${studentId}`
}

export function loadStudentProgress(studentId: string): StudentProgress | null {
  try {
    const raw = localStorage.getItem(getProgressKey(studentId))
    if (!raw) return null
    return JSON.parse(raw) as StudentProgress
  } catch {
    return null
  }
}

export function saveStudentProgress(progress: StudentProgress): void {
  localStorage.setItem(getProgressKey(progress.studentId), JSON.stringify(progress))
}

export function findAnyStudentProgress(): { studentId: string; progress: StudentProgress } | null {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('dd:student_progress:')) continue
    const studentId = key.replace('dd:student_progress:', '')
    const progress = loadStudentProgress(studentId)
    if (progress) return { studentId, progress }
  }
  return null
}

// ─── Lesson Descriptions ──────────────────────────────────────────────────────

export function getLessonDescriptionKey(slotId: string): string {
  return `dd:lesson_description:${slotId}`
}

export function loadLessonDescription(slotId: string): LessonDescription | null {
  try {
    const raw = localStorage.getItem(getLessonDescriptionKey(slotId))
    if (!raw) return null
    return JSON.parse(raw) as LessonDescription
  } catch {
    return null
  }
}

export function saveLessonDescription(desc: LessonDescription): void {
  localStorage.setItem(getLessonDescriptionKey(desc.slotId), JSON.stringify(desc))
}
