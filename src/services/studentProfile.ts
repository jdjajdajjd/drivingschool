import { normalizePhone } from './bookingService'
import { normalizePersonName } from '../lib/nameFormat'
import type { LessonDescription, StudentDocument, StudentDocumentStatus, StudentDocumentType, StudentProgress, StudentRequest, StudentRequestStatus } from '../types'
import { createStudentRequestInSupabase, loginStudentInSupabase, updateStudentProfileInSupabase } from './supabasePublicService'
import { isSupabaseConfigured } from '../lib/supabase'
import { getSupabaseStudentDocumentsAdmin, getSupabaseStudentProgressAdmin, getSupabaseStudentRequestsAdmin, updateSupabaseStudentRequestStatusAdmin, upsertSupabaseStudentDocumentsAdmin, upsertSupabaseStudentProgressAdmin } from './supabaseAdminService'
import { assertAdminPermission } from './adminAccess'
import { findSchoolNamespaceById, getDataNamespace } from './storage'

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

export interface StudentProfileSchoolContext {
  name?: string
  slug?: string
  description?: string
  phone?: string
  email?: string
  address?: string
  logoUrl?: string
  primaryColor?: string
}

export function getProfileKey(schoolId: string): string {
  return `dd:student_profile:${schoolId}`
}

function getCredentialKey(phone: string): string {
  return `dd:student_login:${normalizePhone(phone)}`
}

export function saveStudentCredentials(phone: string, password: string, schoolId: string): void {
  if (shouldUseRemoteForSchool(schoolId)) return
  const normalizedPhone = normalizePhone(phone)
  setLocalStudentItem(getCredentialKey(normalizedPhone), JSON.stringify({ schoolId, phone: normalizedPhone, password }))
}

export function verifyStudentCredentials(phone: string, password: string): { schoolId: string } | null {
  if (isSupabaseConfigured() && getDataNamespace() === 'workspace') return null
  try {
    const raw = getLocalStudentItem(getCredentialKey(phone))
    if (!raw) return null
    const saved = JSON.parse(raw) as { schoolId?: string; password?: string }
    if (!saved.schoolId || saved.password !== password) return null
    return { schoolId: saved.schoolId }
  } catch {
    return null
  }
}

const sessionProfileKey = 'vroom:student_session_profile'

function localStudentStorage(): Storage {
  return getDataNamespace() === 'demo' ? sessionStorage : localStorage
}

function getLocalStudentItem(key: string): string | null {
  const value = localStudentStorage().getItem(key)
  if (value || getDataNamespace() !== 'demo') return value
  return localStorage.getItem(key)
}

function setLocalStudentItem(key: string, value: string): void {
  localStudentStorage().setItem(key, value)
}

function removeLocalStudentItem(key: string): void {
  localStudentStorage().removeItem(key)
  if (getDataNamespace() === 'demo') localStorage.removeItem(key)
}

function localStudentKeys(prefix: string): string[] {
  const storages = getDataNamespace() === 'demo' ? [sessionStorage, localStorage] : [localStorage]
  return Array.from(new Set(storages.flatMap((storage) => {
    const keys: string[] = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    return keys
  })))
}

function shouldUseRemoteForSchool(schoolId?: string): boolean {
  if (!isSupabaseConfigured()) return false
  if (getDataNamespace() === 'demo') return false
  if (schoolId && findSchoolNamespaceById(schoolId) === 'demo') return false
  return true
}

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
  if (shouldUseRemoteForSchool(schoolId)) {
    const sessionProfile = loadStudentSessionProfile()
    if (sessionProfile?.schoolId === schoolId) return sessionProfile.profile
  }
  try {
    const raw = getLocalStudentItem(getProfileKey(schoolId))
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
  if (isSupabaseConfigured() && getDataNamespace() === 'workspace') {
    const sessionProfile = loadStudentSessionProfile()
    if (sessionProfile) return sessionProfile
  }
  for (const key of localStudentKeys('dd:student_profile:')) {
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
    name: normalizePersonName(form.name),
    phone: normalizePhone(form.phone),
    email: form.email?.trim() ?? '',
    avatarUrl: form.avatarUrl?.trim() ?? '',
    passwordSet: Boolean(form.password?.trim() || extra?.passwordSet),
    updatedAt: new Date().toISOString(),
    createdByConsent: true,
    ...extra,
  }
  if (shouldUseRemoteForSchool(schoolId)) {
    saveStudentSessionProfile(schoolId, profile)
    return profile
  }
  setLocalStudentItem(getProfileKey(schoolId), JSON.stringify(profile))
  return profile
}

export function removeStudentProfile(schoolId: string): void {
  if (shouldUseRemoteForSchool(schoolId)) {
    clearStudentSessionProfile()
    return
  }
  removeLocalStudentItem(getProfileKey(schoolId))
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
    const raw = getLocalStudentItem(getProgressKey(studentId))
    if (!raw) return null
    return JSON.parse(raw) as StudentProgress
  } catch {
    return null
  }
}

function isMissingStudentProfileRpcError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; status?: unknown; message?: unknown; details?: unknown }
  const code = typeof candidate.code === 'string' ? candidate.code : ''
  const status = typeof candidate.status === 'number' ? candidate.status : undefined
  const message = typeof candidate.message === 'string' ? candidate.message : ''
  const details = typeof candidate.details === 'string' ? candidate.details : ''
  const text = `${message} ${details}`.toLowerCase()

  return status === 404 || code === 'PGRST202' || text.includes('public_update_student_profile') || text.includes('public_login_student')
}

export async function saveStudentProfileToSupabase(schoolId: string, form: StudentProfileForm, extra?: Partial<StudentProfile>): Promise<StudentProfile> {
  if (!shouldUseRemoteForSchool(schoolId)) return saveStudentProfile(schoolId, form, extra)
  let result: Awaited<ReturnType<typeof updateStudentProfileInSupabase>> | null = null
  try {
    result = await updateStudentProfileInSupabase({
      schoolId,
      name: normalizePersonName(form.name),
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
  } catch (error) {
    if (!isMissingStudentProfileRpcError(error)) throw error
    if (isSupabaseConfigured()) throw new Error('Кабинет ученика не сохранен в Supabase. Проверьте SQL-функции public_update_student_profile и public_login_student.')

    return saveStudentProfile(schoolId, form, extra)
  }

  const profile: StudentProfile = {
    name: normalizePersonName(form.name),
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

export async function saveStudentProfileToSupabaseWithSchool(
  schoolId: string,
  school: StudentProfileSchoolContext,
  form: StudentProfileForm,
  extra?: Partial<StudentProfile>,
): Promise<StudentProfile> {
  if (!shouldUseRemoteForSchool(schoolId)) return saveStudentProfile(schoolId, form, extra)
  let result: Awaited<ReturnType<typeof updateStudentProfileInSupabase>> | null = null
  try {
    result = await updateStudentProfileInSupabase({
      schoolId,
      schoolName: school.name,
      schoolSlug: school.slug,
      schoolDescription: school.description,
      schoolPhone: school.phone,
      schoolEmail: school.email,
      schoolAddress: school.address,
      schoolLogoUrl: school.logoUrl,
      schoolPrimaryColor: school.primaryColor,
      name: normalizePersonName(form.name),
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
  } catch (error) {
    if (!isMissingStudentProfileRpcError(error)) throw error
    if (isSupabaseConfigured()) throw new Error('Кабинет ученика не сохранен в Supabase. Проверьте SQL-функции public_update_student_profile и public_login_student.')

    return saveStudentProfile(schoolId, form, extra)
  }

  const profile: StudentProfile = {
    name: normalizePersonName(form.name),
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
  if (!shouldUseRemoteForSchool(schoolId)) {
    const localCredentials = verifyStudentCredentials(phone, password)
    if (!localCredentials || localCredentials.schoolId !== schoolId) return null
    return loadStudentProfile(schoolId)
  }
  let result: Awaited<ReturnType<typeof loginStudentInSupabase>>
  try {
    result = await loginStudentInSupabase({ schoolId, phone, password })
  } catch (error) {
    if (!isMissingStudentProfileRpcError(error)) throw error
    if (isSupabaseConfigured()) throw new Error('Вход ученика не настроен в Supabase. Проверьте SQL-функцию public_login_student.')

    const localCredentials = verifyStudentCredentials(phone, password)
    if (!localCredentials || localCredentials.schoolId !== schoolId) return null
    return loadStudentProfile(schoolId)
  }
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
  if (getDataNamespace() === 'demo') return loadStudentProgress(studentId)
  const progress = await getSupabaseStudentProgressAdmin(studentId)
  if (progress) saveStudentProgress(progress)
  return progress
}

export function saveStudentProgress(progress: StudentProgress): void {
  setLocalStudentItem(getProgressKey(progress.studentId), JSON.stringify(progress))
}

export async function saveStudentProgressAdminConfirmed(progress: StudentProgress): Promise<{ ok: boolean; progress?: StudentProgress; error?: string }> {
  if (shouldUseRemoteForSchool()) {
    try {
      await upsertSupabaseStudentProgressAdmin(progress)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить прогресс ученика.' }
    }
  }

  setLocalStudentItem(getProgressKey(progress.studentId), JSON.stringify(progress))
  return { ok: true, progress }
}

export function findAnyStudentProgress(): { studentId: string; progress: StudentProgress } | null {
  for (const key of localStudentKeys('dd:student_progress:')) {
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
    const raw = getLocalStudentItem(getLessonDescriptionKey(slotId))
    if (!raw) return null
    return JSON.parse(raw) as LessonDescription
  } catch {
    return null
  }
}

export function saveLessonDescription(desc: LessonDescription): void {
  setLocalStudentItem(getLessonDescriptionKey(desc.slotId), JSON.stringify(desc))
}

export const studentDocumentLabels: Record<StudentDocumentType, string> = {
  passport: 'Паспорт',
  medical_certificate: 'Медсправка',
  snils: 'СНИЛС',
  contract: 'Договор',
  photo: 'Фото',
  state_fee: 'Госпошлина',
  consent_data_processing: 'Согласие на обработку данных',
  application: 'Заявление',
  parent_consent: 'Согласие родителя',
  internal_certificate: 'Свидетельство школы',
  gibdd_exam_doc: 'Документ для ГИБДД',
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
    const raw = getLocalStudentItem(getStudentDocumentsKey(studentId))
    const saved = raw ? JSON.parse(raw) as StudentDocument[] : []
    const byType = new Map(saved.map((document) => [document.type, document]))
    return defaultDocumentTypes.map((type) => byType.get(type) ?? { studentId, type, status: 'missing', updatedAt: new Date().toISOString() })
  } catch {
    return defaultDocumentTypes.map((type) => ({ studentId, type, status: 'missing', updatedAt: new Date().toISOString() }))
  }
}

export async function refreshStudentDocumentsFromSupabase(studentId: string): Promise<StudentDocument[]> {
  if (getDataNamespace() === 'demo') return loadStudentDocuments(studentId)
  const documents = await getSupabaseStudentDocumentsAdmin(studentId)
  if (documents.length > 0) saveStudentDocuments(studentId, documents)
  return documents
}

export function saveStudentDocuments(studentId: string, documents: StudentDocument[]): void {
  setLocalStudentItem(getStudentDocumentsKey(studentId), JSON.stringify(documents))
}

export function updateStudentDocument(studentId: string, type: StudentDocumentType, status: StudentDocumentStatus): StudentDocument[] {
  const documents = loadStudentDocuments(studentId).map((document) => document.type === type ? { ...document, status, updatedAt: new Date().toISOString() } : document)
  saveStudentDocuments(studentId, documents)
  return documents
}

export async function updateStudentDocumentAdminConfirmed(
  studentId: string,
  type: StudentDocumentType,
  status: StudentDocumentStatus,
): Promise<{ ok: boolean; documents?: StudentDocument[]; error?: string }> {
  const documents = loadStudentDocuments(studentId).map((document) => document.type === type ? { ...document, status, updatedAt: new Date().toISOString() } : document)

  if (shouldUseRemoteForSchool()) {
    try {
      await upsertSupabaseStudentDocumentsAdmin(documents)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить статус документа.' }
    }
  }

  setLocalStudentItem(getStudentDocumentsKey(studentId), JSON.stringify(documents))
  return { ok: true, documents }
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
    const raw = getLocalStudentItem(getStudentRequestsKey(schoolId))
    return raw ? JSON.parse(raw) as StudentRequest[] : []
  } catch {
    return []
  }
}

export async function refreshStudentRequestsFromSupabase(schoolId: string): Promise<StudentRequest[]> {
  if (!shouldUseRemoteForSchool(schoolId)) return loadStudentRequests(schoolId)
  const requests = await getSupabaseStudentRequestsAdmin(schoolId)
  saveStudentRequests(schoolId, requests)
  return requests
}

export function saveStudentRequests(schoolId: string, requests: StudentRequest[]): void {
  setLocalStudentItem(getStudentRequestsKey(schoolId), JSON.stringify(requests))
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
  if (shouldUseRemoteForSchool(request.schoolId)) {
    void createStudentRequestInSupabase(next).catch((error) => console.error('Supabase student request sync failed', error))
  }
  return next
}

export function updateStudentRequestStatus(schoolId: string, requestId: string, status: StudentRequestStatus): StudentRequest[] {
  const requests = loadStudentRequests(schoolId).map((request) => request.id === requestId ? { ...request, status, updatedAt: new Date().toISOString() } : request)
  saveStudentRequests(schoolId, requests)
  return requests
}

export async function updateStudentRequestStatusAdminConfirmed(
  schoolId: string,
  requestId: string,
  status: StudentRequestStatus,
): Promise<{ ok: boolean; requests?: StudentRequest[]; error?: string }> {
  const access = assertAdminPermission('students.manage')
  if (!access.ok) return access

  const updatedAt = new Date().toISOString()
  const requests = loadStudentRequests(schoolId).map((request) => request.id === requestId ? { ...request, status, updatedAt } : request)

  if (shouldUseRemoteForSchool(schoolId)) {
    try {
      await updateSupabaseStudentRequestStatusAdmin(schoolId, requestId, status, updatedAt)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить статус запроса.' }
    }
  }

  saveStudentRequests(schoolId, requests)
  return { ok: true, requests }
}
