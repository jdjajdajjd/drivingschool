import { normalizePhone } from './bookingService'
import type { LessonDescription, StudentDocument, StudentDocumentStatus, StudentDocumentType, StudentProgress, StudentRequest, StudentRequestStatus } from '../types'
import { createStudentRequestInSupabase, getStudentDocumentsFromSupabase, getStudentProgressFromSupabase, getStudentRequestsFromSupabase, loginStudentInSupabase, updateStudentProfileInSupabase, updateStudentRequestStatusInSupabase, upsertStudentDocumentsInSupabase, upsertStudentProgressInSupabase } from './supabasePublicService'
import { isSupabaseConfigured } from '../lib/supabase'

export interface StudentProfile {
  name: string
  phone: string
  email: string
  avatarUrl: string
  passwordSet: boolean
  assignedBranchId?: string
  assignedInstructorId?: string
  categoryCodes?: string[]
  trainingStage?: 'theory' | 'practice_ground' | 'city' | 'exam_prep' | 'exam' | 'completed'
  groupName?: string
  trainingStartDate?: string
  drivingStartDate?: string
  trainingEndDate?: string
  drivingEndDate?: string
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

function getCredentialKey(phone: string): string {
  return `dd:student_login:${normalizePhone(phone)}`
}

export function saveStudentCredentials(phone: string, password: string, schoolId: string): void {
  if (isSupabaseConfigured()) return
  const normalizedPhone = normalizePhone(phone)
  localStorage.setItem(getCredentialKey(normalizedPhone), JSON.stringify({ schoolId, phone: normalizedPhone, password }))
}

export function verifyStudentCredentials(phone: string, password: string): { schoolId: string } | null {
  if (isSupabaseConfigured()) return null
  try {
    const raw = localStorage.getItem(getCredentialKey(phone))
    if (!raw) return null
    const saved = JSON.parse(raw) as { schoolId?: string; password?: string }
    if (!saved.schoolId || saved.password !== password) return null
    return { schoolId: saved.schoolId }
  } catch {
    return null
  }
}

const sessionProfileKey = 'vroom:student_session_profile'

export function saveStudentSessionProfile(schoolId: string, profile: StudentProfile): void {
  sessionStorage.setItem(sessionProfileKey, JSON.stringify({ schoolId, profile }))
}

export function loadStudentSessionProfile(): { schoolId: string; profile: StudentProfile } | null {
  try {
    const raw = sessionStorage.getItem(sessionProfileKey)
    return raw ? JSON.parse(raw) as { schoolId: string; profile: StudentProfile } : null
  } catch {
    return null
  }
}

export function clearStudentSessionProfile(): void {
  sessionStorage.removeItem(sessionProfileKey)
}

export function loadStudentProfile(schoolId: string): StudentProfile | null {
  if (isSupabaseConfigured()) return loadStudentSessionProfile()?.profile ?? null
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
  if (isSupabaseConfigured()) return loadStudentSessionProfile()
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
  if (isSupabaseConfigured()) {
    saveStudentSessionProfile(schoolId, profile)
    return profile
  }
  localStorage.setItem(getProfileKey(schoolId), JSON.stringify(profile))
  return profile
}

export function removeStudentProfile(schoolId: string): void {
  if (isSupabaseConfigured()) {
    clearStudentSessionProfile()
    return
  }
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

export async function saveStudentProfileToSupabase(schoolId: string, form: StudentProfileForm, extra?: Partial<StudentProfile>): Promise<StudentProfile> {
  const result = await updateStudentProfileInSupabase({
    schoolId,
    name: form.name,
    phone: form.phone,
    email: form.email ?? '',
    password: form.password ?? '',
    avatarUrl: form.avatarUrl ?? '',
    categoryCodes: extra?.categoryCodes,
    trainingStage: extra?.trainingStage,
    groupName: extra?.groupName,
    trainingStartDate: extra?.trainingStartDate,
    drivingStartDate: extra?.drivingStartDate,
    trainingEndDate: extra?.trainingEndDate,
    drivingEndDate: extra?.drivingEndDate,
  })
  const profile: StudentProfile = {
    name: form.name.trim(),
    phone: result.normalizedPhone,
    email: form.email?.trim() ?? '',
    avatarUrl: form.avatarUrl?.trim() ?? '',
    passwordSet: Boolean(form.password?.trim() || extra?.passwordSet),
    updatedAt: new Date().toISOString(),
    createdByConsent: true,
    ...extra,
  }
  saveStudentSessionProfile(schoolId, profile)
  return profile
}

export async function loginStudentProfileFromSupabase(schoolId: string, phone: string, password: string): Promise<StudentProfile | null> {
  const result = await loginStudentInSupabase({ schoolId, phone, password })
  if (!result) return null
  const profile: StudentProfile = {
    name: result.name,
    phone: result.phone,
    email: result.email,
    avatarUrl: result.avatarUrl,
    passwordSet: true,
    assignedBranchId: result.assignedBranchId || undefined,
    updatedAt: new Date().toISOString(),
    createdByConsent: true,
  }
  saveStudentSessionProfile(schoolId, profile)
  return profile
}

export async function refreshStudentProgressFromSupabase(studentId: string): Promise<StudentProgress | null> {
  const progress = await getStudentProgressFromSupabase(studentId)
  if (progress) saveStudentProgress(progress)
  return progress
}

export function saveStudentProgress(progress: StudentProgress): void {
  localStorage.setItem(getProgressKey(progress.studentId), JSON.stringify(progress))
  void upsertStudentProgressInSupabase(progress).catch((error) => console.error('Supabase student progress sync failed', error))
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

export const studentDocumentLabels: Record<StudentDocumentType, string> = {
  passport: 'Паспорт',
  medical_certificate: 'Медсправка',
  snils: 'СНИЛС',
  contract: 'Договор',
  photo: 'Фото',
  state_fee: 'Госпошлина',
}

export const studentDocumentStatusLabels: Record<StudentDocumentStatus, string> = {
  missing: 'Нужно заполнить',
  pending: 'На проверке',
  provided: 'Передано',
  approved: 'Принято',
  rejected: 'Нужно исправить',
}

const defaultDocumentTypes: StudentDocumentType[] = ['passport', 'medical_certificate', 'snils', 'contract', 'photo']

export function getStudentDocumentsKey(studentId: string): string {
  return `dd:student_documents:${studentId}`
}

export function loadStudentDocuments(studentId: string): StudentDocument[] {
  try {
    const raw = localStorage.getItem(getStudentDocumentsKey(studentId))
    const saved = raw ? JSON.parse(raw) as StudentDocument[] : []
    const byType = new Map(saved.map((document) => [document.type, document]))
    return defaultDocumentTypes.map((type) => byType.get(type) ?? { studentId, type, status: 'missing', updatedAt: new Date().toISOString() })
  } catch {
    return defaultDocumentTypes.map((type) => ({ studentId, type, status: 'missing', updatedAt: new Date().toISOString() }))
  }
}

export async function refreshStudentDocumentsFromSupabase(studentId: string): Promise<StudentDocument[]> {
  const documents = await getStudentDocumentsFromSupabase(studentId)
  if (documents.length > 0) saveStudentDocuments(studentId, documents)
  return documents
}

export function saveStudentDocuments(studentId: string, documents: StudentDocument[]): void {
  localStorage.setItem(getStudentDocumentsKey(studentId), JSON.stringify(documents))
  void upsertStudentDocumentsInSupabase(documents).catch((error) => console.error('Supabase student documents sync failed', error))
}

export function updateStudentDocument(studentId: string, type: StudentDocumentType, status: StudentDocumentStatus): StudentDocument[] {
  const documents = loadStudentDocuments(studentId).map((document) => document.type === type ? { ...document, status, updatedAt: new Date().toISOString() } : document)
  saveStudentDocuments(studentId, documents)
  return documents
}

export const studentRequestStatusLabels: Record<StudentRequestStatus, string> = {
  new: 'Новый',
  reviewing: 'В работе',
  resolved: 'Решён',
  rejected: 'Отклонён',
}

export function getStudentRequestsKey(schoolId: string): string {
  return `dd:student_requests:${schoolId}`
}

export function loadStudentRequests(schoolId: string): StudentRequest[] {
  try {
    const raw = localStorage.getItem(getStudentRequestsKey(schoolId))
    return raw ? JSON.parse(raw) as StudentRequest[] : []
  } catch {
    return []
  }
}

export async function refreshStudentRequestsFromSupabase(schoolId: string): Promise<StudentRequest[]> {
  const requests = await getStudentRequestsFromSupabase(schoolId)
  saveStudentRequests(schoolId, requests)
  return requests
}

export function saveStudentRequests(schoolId: string, requests: StudentRequest[]): void {
  localStorage.setItem(getStudentRequestsKey(schoolId), JSON.stringify(requests))
}

export function createStudentRequest(request: Omit<StudentRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): StudentRequest {
  const now = new Date().toISOString()
  const next: StudentRequest = {
    ...request,
    id: `student-request-${Date.now()}`,
    status: 'new',
    createdAt: now,
    updatedAt: now,
  }
  saveStudentRequests(request.schoolId, [next, ...loadStudentRequests(request.schoolId)])
  void createStudentRequestInSupabase(next).catch((error) => console.error('Supabase student request sync failed', error))
  return next
}

export function updateStudentRequestStatus(schoolId: string, requestId: string, status: StudentRequestStatus): StudentRequest[] {
  const requests = loadStudentRequests(schoolId).map((request) => request.id === requestId ? { ...request, status, updatedAt: new Date().toISOString() } : request)
  saveStudentRequests(schoolId, requests)
  void updateStudentRequestStatusInSupabase(schoolId, requestId, status).catch((error) => console.error('Supabase student request status sync failed', error))
  return requests
}
