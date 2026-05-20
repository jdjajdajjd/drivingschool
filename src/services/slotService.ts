import { addMinutes, eachDayOfInterval, format, isBefore, parseISO } from 'date-fns'
import { formatDuration, generateId } from '../lib/utils'
import { isWorkspaceSupabaseReady } from '../lib/supabase'
import type { BulkSlotCreateResult, LessonType, ResolvedSlot, Slot, SlotStatus } from '../types'
import { db } from './storage'
import { getBookingById, getSlotDateTime } from './bookingService'
import { findInstructorSlotConflict, getSlotCreationConflictError, minutesFromTime } from './scheduleConflicts'
import {
  createSupabaseSlot,
  deleteSupabaseSlot,
  persistSupabaseMutation,
  updateSupabaseSlotStatus,
} from './supabaseAdminService'
import { assertAdminPermission } from './adminAccess'
import { validateBranchBelongsToSchool, validateInstructorBelongsToSchool } from './tenantIntegrity'

export interface CreateSlotParams {
  schoolId: string
  branchId: string
  instructorId: string
  date: string
  startTime: string
  duration: number
  lessonType: LessonType
}

export interface CreateBulkSlotsParams {
  schoolId: string
  branchId: string
  instructorId: string
  dateFrom: string
  dateTo: string
  weekdays: number[]
  windowStart: string
  windowEnd: string
  duration: number
  lessonType: LessonType
  breakMinutes: number
}

export function getSlotsBySchool(schoolId: string): ResolvedSlot[] {
  return db.slots
    .bySchool(schoolId)
    .sort((left, right) => getSlotDateTime(left).getTime() - getSlotDateTime(right).getTime())
    .map((slot) => ({
      slot,
      branch: db.branches.byId(slot.branchId),
      instructor: db.instructors.byId(slot.instructorId),
      booking: slot.bookingId ? db.bookings.byId(slot.bookingId) : null,
      student: slot.bookingId ? getBookingById(slot.bookingId)?.student ?? null : null,
    }))
}

export function getSlotsByInstructor(instructorId: string): ResolvedSlot[] {
  return db.slots
    .byInstructor(instructorId)
    .sort((left, right) => getSlotDateTime(left).getTime() - getSlotDateTime(right).getTime())
    .map((slot) => ({
      slot,
      branch: db.branches.byId(slot.branchId),
      instructor: db.instructors.byId(slot.instructorId),
      booking: slot.bookingId ? db.bookings.byId(slot.bookingId) : null,
      student: slot.bookingId ? getBookingById(slot.bookingId)?.student ?? null : null,
    }))
}

export function getAvailableSlots(
  instructorId?: string,
  date?: string,
  branchId?: string,
): Slot[] {
  return db.slots
    .all()
    .filter((slot) => slot.status === 'available')
    .filter((slot) => (instructorId ? slot.instructorId === instructorId : true))
    .filter((slot) => (date ? slot.date === date : true))
    .filter((slot) => (branchId ? slot.branchId === branchId : true))
    .filter((slot) => !isBefore(getSlotDateTime(slot), new Date()))
    .sort((left, right) => getSlotDateTime(left).getTime() - getSlotDateTime(right).getTime())
}


function isValidTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value) && minutesFromTime(value) >= 0 && minutesFromTime(value) < 24 * 60
}

function validateSlotTiming(startTime: string, duration: number): string | null {
  if (!isValidTime(startTime)) return 'Укажите корректное время начала.'
  if (!Number.isFinite(duration) || !Number.isInteger(duration) || duration < 30 || duration > 240 || duration % 15 !== 0) {
    return 'Длительность должна быть от 30 минут до 4 часов с шагом 15 минут.'
  }
  if (minutesFromTime(startTime) + duration > 24 * 60) return 'Занятие не должно переходить на следующий день.'
  return null
}


export function findSlotConflict(params: { instructorId: string; date: string; startTime: string; duration: number; excludeSlotId?: string }): Slot | null {
  return findInstructorSlotConflict(params)
}

export function checkSlotDuplicate(instructorId: string, date: string, startTime: string): boolean {
  return db.slots
    .byInstructorAndDate(instructorId, date)
    .some((slot) => slot.status !== 'cancelled' && slot.time === startTime)
}

export function createSlot(params: CreateSlotParams, options: { skipRemote?: boolean } = {}): { ok: boolean; slot?: Slot; error?: string } {
  const access = assertAdminPermission('schedule.manage')
  if (!access.ok) return access

  const instructor = db.instructors.byId(params.instructorId)
  const branch = db.branches.byId(params.branchId)
  if (!instructor) {
    return { ok: false, error: 'Инструктор не найден.' }
  }

  if (!branch?.isActive) {
    return { ok: false, error: 'Нельзя создавать время для выключенного филиала.' }
  }

  if (!instructor.isActive) {
    return { ok: false, error: 'Нельзя создавать время для выключенного инструктора.' }
  }

  const branchError = validateBranchBelongsToSchool(params.schoolId, params.branchId)
  if (branchError) return { ok: false, error: branchError }

  const instructorError = validateInstructorBelongsToSchool(params.schoolId, params.instructorId)
  if (instructorError) return { ok: false, error: instructorError }

  if (instructor.branchId !== params.branchId) {
    return { ok: false, error: 'Инструктор не относится к выбранному филиалу.' }
  }

  const timingError = validateSlotTiming(params.startTime, params.duration)
  if (timingError) return { ok: false, error: timingError }

  const slotDate = new Date(`${params.date}T${params.startTime}:00`)
  if (isBefore(slotDate, new Date())) {
    return { ok: false, error: 'Нельзя создать время в прошлом.' }
  }

  const conflictError = getSlotCreationConflictError({
    schoolId: params.schoolId,
    instructorId: params.instructorId,
    date: params.date,
    startTime: params.startTime,
    duration: params.duration,
    formatDuration,
  })
  if (conflictError) return { ok: false, error: conflictError }

  const slot: Slot = {
    id: generateId('slot'),
    schoolId: params.schoolId,
    branchId: params.branchId,
    instructorId: params.instructorId,
    date: params.date,
    time: params.startTime,
    duration: params.duration,
    lessonType: params.lessonType,
    status: 'available',
    createdAt: new Date().toISOString(),
  }

  db.slots.upsert(slot)
  if (!options.skipRemote) persistSupabaseMutation(
    createSupabaseSlot({
      slotId: slot.id,
      schoolId: slot.schoolId,
      branchId: slot.branchId,
      instructorId: slot.instructorId,
      date: slot.date,
      startTime: slot.time,
      duration: slot.duration,
      lessonType: slot.lessonType ?? 'driving',
    }),
  )
  return { ok: true, slot }
}

export async function createSlotConfirmed(params: CreateSlotParams): Promise<{ ok: boolean; slot?: Slot; error?: string }> {
  const result = createSlot(params, { skipRemote: true })
  if (!result.ok || !result.slot) return result
  if (isWorkspaceSupabaseReady()) {
    try {
      await createSupabaseSlot({
        slotId: result.slot.id,
        schoolId: result.slot.schoolId,
        branchId: result.slot.branchId,
        instructorId: result.slot.instructorId,
        date: result.slot.date,
        startTime: result.slot.time,
        duration: result.slot.duration,
        lessonType: result.slot.lessonType ?? 'driving',
      })
    } catch (error) {
      db.slots.remove(result.slot.id)
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить занятие.' }
    }
  }
  return result
}

function iterateWindow(
  date: string,
  startTime: string,
  endTime: string,
  duration: number,
  breakMinutes: number,
): Array<{ date: string; time: string }> {
  const items: Array<{ date: string; time: string }> = []
  let cursor = new Date(`${date}T${startTime}:00`)
  const windowEnd = new Date(`${date}T${endTime}:00`)

  while (addMinutes(cursor, duration) <= windowEnd) {
    items.push({ date, time: format(cursor, 'HH:mm') })
    cursor = addMinutes(cursor, duration + breakMinutes)
  }

  return items
}

export function createBulkSlots(params: CreateBulkSlotsParams, options: { skipRemote?: boolean } = {}): { ok: boolean; result?: BulkSlotCreateResult; error?: string } {
  const access = assertAdminPermission('schedule.manage')
  if (!access.ok) return access

  const instructor = db.instructors.byId(params.instructorId)
  const branch = db.branches.byId(params.branchId)
  if (!instructor) {
    return { ok: false, error: 'Инструктор не найден.' }
  }

  if (!branch?.isActive) {
    return { ok: false, error: 'Для выключенного филиала нельзя создать время.' }
  }

  if (!instructor.isActive) {
    return { ok: false, error: 'Для выключенного инструктора нельзя создать время.' }
  }

  const branchError = validateBranchBelongsToSchool(params.schoolId, params.branchId)
  if (branchError) return { ok: false, error: branchError }

  const instructorError = validateInstructorBelongsToSchool(params.schoolId, params.instructorId)
  if (instructorError) return { ok: false, error: instructorError }

  if (instructor.branchId !== params.branchId) {
    return { ok: false, error: 'Инструктор не относится к выбранному филиалу.' }
  }

  const timingError = validateSlotTiming(params.windowStart, params.duration)
  if (timingError) return { ok: false, error: timingError }
  if (!isValidTime(params.windowEnd) || minutesFromTime(params.windowStart) >= minutesFromTime(params.windowEnd)) {
    return { ok: false, error: 'Укажите корректный интервал рабочего дня.' }
  }
  if (!Number.isFinite(params.breakMinutes) || params.breakMinutes < 0 || params.breakMinutes > 180) {
    return { ok: false, error: 'Перерыв должен быть от 0 до 180 минут.' }
  }
  if (!params.weekdays.length) return { ok: false, error: 'Выберите дни недели.' }
  if (parseISO(params.dateFrom) > parseISO(params.dateTo)) return { ok: false, error: 'Дата окончания не может быть раньше даты начала.' }

  const dates = eachDayOfInterval({
    start: parseISO(params.dateFrom),
    end: parseISO(params.dateTo),
  })

  const created: Slot[] = []
  let skippedDuplicates = 0
  let skippedPast = 0

  for (const day of dates) {
    const weekday = day.getDay()
    if (!params.weekdays.includes(weekday)) {
      continue
    }

    const date = format(day, 'yyyy-MM-dd')
    const entries = iterateWindow(
      date,
      params.windowStart,
      params.windowEnd,
      params.duration,
      params.breakMinutes,
    )

    for (const entry of entries) {
      if (isBefore(new Date(`${entry.date}T${entry.time}:00`), new Date())) {
        skippedPast += 1
        continue
      }

      const conflictError = getSlotCreationConflictError({
        schoolId: params.schoolId,
        instructorId: params.instructorId,
        date: entry.date,
        startTime: entry.time,
        duration: params.duration,
        formatDuration,
      })
      if (conflictError) {
        skippedDuplicates += 1
        continue
      }

      const slot: Slot = {
        id: generateId('slot'),
        schoolId: params.schoolId,
        branchId: params.branchId,
        instructorId: params.instructorId,
        date: entry.date,
        time: entry.time,
        duration: params.duration,
        lessonType: params.lessonType,
        status: 'available',
        createdAt: new Date().toISOString(),
      }

      db.slots.upsert(slot)
      if (!options.skipRemote) persistSupabaseMutation(
        createSupabaseSlot({
          slotId: slot.id,
          schoolId: slot.schoolId,
          branchId: slot.branchId,
          instructorId: slot.instructorId,
          date: slot.date,
          startTime: slot.time,
          duration: slot.duration,
          lessonType: slot.lessonType ?? 'driving',
        }),
      )
      created.push(slot)
    }
  }

  return {
    ok: true,
    result: {
      created,
      createdCount: created.length,
      skippedDuplicates,
      skippedPast,
      skippedInactiveInstructor: 0,
    },
  }
}

export async function createBulkSlotsConfirmed(params: CreateBulkSlotsParams): Promise<{ ok: boolean; result?: BulkSlotCreateResult; error?: string }> {
  const result = createBulkSlots(params, { skipRemote: true })
  if (!result.ok || !result.result) return result
  if (isWorkspaceSupabaseReady()) {
    const created = result.result.created
    try {
      for (const slot of created) {
        await createSupabaseSlot({
          slotId: slot.id,
          schoolId: slot.schoolId,
          branchId: slot.branchId,
          instructorId: slot.instructorId,
          date: slot.date,
          startTime: slot.time,
          duration: slot.duration,
          lessonType: slot.lessonType ?? 'driving',
        })
      }
    } catch (error) {
      created.forEach((slot) => db.slots.remove(slot.id))
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить серию занятий.' }
    }
  }
  return result
}

export function updateSlotStatus(
  slotId: string,
  status: SlotStatus,
  options: { skipRemote?: boolean } = {},
): { ok: boolean; slot?: Slot; error?: string } {
  const access = assertAdminPermission('schedule.manage')
  if (!access.ok) return access

  const slot = db.slots.byId(slotId)
  if (!slot) {
    return { ok: false, error: 'Выбранное время не найдено.' }
  }

  const activeBooking = slot.bookingId ? db.bookings.byId(slot.bookingId) : null
  if (status === 'available' && activeBooking?.status === 'active') {
    return { ok: false, error: 'Нельзя освободить время с активной записью.' }
  }

  if (status === 'cancelled' && slot.status === 'booked') {
    return { ok: false, error: 'Нельзя отменить занятое время без обработки записи.' }
  }

  const nextSlot: Slot = {
    ...slot,
    status,
    bookingId: status === 'available' ? undefined : slot.bookingId,
  }
  db.slots.upsert(nextSlot)
  if (!options.skipRemote) persistSupabaseMutation(updateSupabaseSlotStatus(slotId, status))
  return { ok: true, slot: nextSlot }
}

export async function updateSlotStatusConfirmed(slotId: string, status: SlotStatus): Promise<{ ok: boolean; slot?: Slot; error?: string }> {
  if (isWorkspaceSupabaseReady()) await updateSupabaseSlotStatus(slotId, status)
  return updateSlotStatus(slotId, status, { skipRemote: true })
}

export function deleteSlot(slotId: string, options: { skipRemote?: boolean } = {}): { ok: boolean; error?: string } {
  const access = assertAdminPermission('schedule.manage')
  if (!access.ok) return access

  const slot = db.slots.byId(slotId)
  if (!slot) {
    return { ok: false, error: 'Выбранное время не найдено.' }
  }

  if (slot.status === 'booked' || slot.bookingId) {
    return { ok: false, error: 'Нельзя удалить занятое время без обработки записи.' }
  }

  db.slots.remove(slotId)
  if (!options.skipRemote) persistSupabaseMutation(deleteSupabaseSlot(slotId))
  return { ok: true }
}

export async function deleteSlotConfirmed(slotId: string): Promise<{ ok: boolean; error?: string }> {
  if (isWorkspaceSupabaseReady()) await deleteSupabaseSlot(slotId)
  return deleteSlot(slotId, { skipRemote: true })
}
