import { addMinutes, eachDayOfInterval, format, isBefore, parseISO } from 'date-fns'
import { generateId } from '../lib/utils'
import type { BulkSlotCreateResult, ResolvedSlot, Slot, SlotStatus } from '../types'
import { db } from './storage'
import { getBookingById, getSlotDateTime } from './bookingService'

export interface CreateSlotParams {
  schoolId: string
  branchId: string
  instructorId: string
  date: string
  startTime: string
  duration: number
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

export function checkSlotDuplicate(instructorId: string, date: string, startTime: string): boolean {
  return db.slots
    .byInstructorAndDate(instructorId, date)
    .some((slot) => slot.time === startTime)
}

export function createSlot(params: CreateSlotParams): { ok: boolean; slot?: Slot; error?: string } {
  const instructor = db.instructors.byId(params.instructorId)
  if (!instructor) {
    return { ok: false, error: 'Инструктор не найден.' }
  }

  if (!instructor.isActive) {
    return { ok: false, error: 'Нельзя создавать слоты для выключенного инструктора.' }
  }

  const slotDate = new Date(`${params.date}T${params.startTime}:00`)
  if (isBefore(slotDate, new Date())) {
    return { ok: false, error: 'Нельзя создать слот в прошлом.' }
  }

  if (checkSlotDuplicate(params.instructorId, params.date, params.startTime)) {
    return { ok: false, error: 'Такой слот уже существует.' }
  }

  const slot: Slot = {
    id: generateId('slot'),
    schoolId: params.schoolId,
    branchId: params.branchId,
    instructorId: params.instructorId,
    date: params.date,
    time: params.startTime,
    duration: params.duration,
    status: 'available',
    createdAt: new Date().toISOString(),
  }

  db.slots.upsert(slot)
  return { ok: true, slot }
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

export function createBulkSlots(params: CreateBulkSlotsParams): { ok: boolean; result?: BulkSlotCreateResult; error?: string } {
  const instructor = db.instructors.byId(params.instructorId)
  if (!instructor) {
    return { ok: false, error: 'Инструктор не найден.' }
  }

  if (!instructor.isActive) {
    return { ok: false, error: 'Для выключенного инструктора нельзя создать слоты.' }
  }

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

      if (checkSlotDuplicate(params.instructorId, entry.date, entry.time)) {
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
        status: 'available',
        createdAt: new Date().toISOString(),
      }

      db.slots.upsert(slot)
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

export function updateSlotStatus(
  slotId: string,
  status: SlotStatus,
): { ok: boolean; slot?: Slot; error?: string } {
  const slot = db.slots.byId(slotId)
  if (!slot) {
    return { ok: false, error: 'Слот не найден.' }
  }

  const activeBooking = slot.bookingId ? db.bookings.byId(slot.bookingId) : null
  if (status === 'available' && activeBooking?.status === 'active') {
    return { ok: false, error: 'Нельзя освободить слот с активной записью.' }
  }

  if (status === 'cancelled' && slot.status === 'booked') {
    return { ok: false, error: 'Нельзя отменить занятый слот без обработки записи.' }
  }

  const nextSlot: Slot = {
    ...slot,
    status,
    bookingId: status === 'available' ? undefined : slot.bookingId,
  }
  db.slots.upsert(nextSlot)
  return { ok: true, slot: nextSlot }
}

export function deleteSlot(slotId: string): { ok: boolean; error?: string } {
  const slot = db.slots.byId(slotId)
  if (!slot) {
    return { ok: false, error: 'Слот не найден.' }
  }

  if (slot.status === 'booked' || slot.bookingId) {
    return { ok: false, error: 'Нельзя удалить занятый слот без обработки записи.' }
  }

  db.slots.remove(slotId)
  return { ok: true }
}
