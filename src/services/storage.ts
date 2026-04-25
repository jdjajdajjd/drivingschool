import type {
  Booking,
  Branch,
  Instructor,
  School,
  Slot,
  SlotLock,
  Student,
  SubscriptionModule,
} from '../types'

export const SEED_VERSION = '4'

const K = {
  SCHOOLS: 'dd:schools',
  BRANCHES: 'dd:branches',
  INSTRUCTORS: 'dd:instructors',
  SLOTS: 'dd:slots',
  BOOKINGS: 'dd:bookings',
  STUDENTS: 'dd:students',
  SUB_MODULES: 'dd:sub_modules',
  SLOT_LOCKS: 'dd:slot_locks',
  SEEDED: 'dd:seeded',
  SEED_VERSION: 'dd:seed_version',
} as const

function readAll<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeAll<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

function upsert<T extends { id: string }>(key: string, item: T): T {
  const items = readAll<T>(key)
  const index = items.findIndex((current) => current.id === item.id)

  if (index >= 0) {
    items[index] = item
  } else {
    items.push(item)
  }

  writeAll(key, items)
  return item
}

function removeById(key: string, id: string): void {
  writeAll(
    key,
    readAll<{ id: string }>(key).filter((item) => item.id !== id),
  )
}

function readLocks(): SlotLock[] {
  const now = Date.now()
  const activeLocks = readAll<SlotLock>(K.SLOT_LOCKS).filter(
    (lock) => new Date(lock.expiresAt).getTime() > now,
  )

  if (activeLocks.length !== readAll<SlotLock>(K.SLOT_LOCKS).length) {
    writeAll(K.SLOT_LOCKS, activeLocks)
  }

  return activeLocks
}

function writeLocks(locks: SlotLock[]): void {
  writeAll(K.SLOT_LOCKS, locks)
}

export const db = {
  schools: {
    all: () => readAll<School>(K.SCHOOLS),
    bySlug: (slug: string) => readAll<School>(K.SCHOOLS).find((school) => school.slug === slug) ?? null,
    byId: (id: string) => readAll<School>(K.SCHOOLS).find((school) => school.id === id) ?? null,
    upsert: (school: School) => upsert(K.SCHOOLS, school),
  },

  branches: {
    all: () => readAll<Branch>(K.BRANCHES),
    bySchool: (schoolId: string) =>
      readAll<Branch>(K.BRANCHES).filter((branch) => branch.schoolId === schoolId),
    byId: (id: string) => readAll<Branch>(K.BRANCHES).find((branch) => branch.id === id) ?? null,
    upsert: (branch: Branch) => upsert(K.BRANCHES, branch),
    remove: (id: string) => removeById(K.BRANCHES, id),
  },

  instructors: {
    all: () => readAll<Instructor>(K.INSTRUCTORS),
    bySchool: (schoolId: string) =>
      readAll<Instructor>(K.INSTRUCTORS).filter((instructor) => instructor.schoolId === schoolId),
    byBranch: (branchId: string) =>
      readAll<Instructor>(K.INSTRUCTORS).filter((instructor) => instructor.branchId === branchId),
    byToken: (token: string) =>
      readAll<Instructor>(K.INSTRUCTORS).find((instructor) => instructor.token === token) ?? null,
    byId: (id: string) =>
      readAll<Instructor>(K.INSTRUCTORS).find((instructor) => instructor.id === id) ?? null,
    upsert: (instructor: Instructor) => upsert(K.INSTRUCTORS, instructor),
    remove: (id: string) => removeById(K.INSTRUCTORS, id),
  },

  slots: {
    all: () => readAll<Slot>(K.SLOTS),
    byInstructor: (instructorId: string) =>
      readAll<Slot>(K.SLOTS).filter((slot) => slot.instructorId === instructorId),
    byInstructorAndDate: (instructorId: string, date: string) =>
      readAll<Slot>(K.SLOTS).filter(
        (slot) => slot.instructorId === instructorId && slot.date === date,
      ),
    availableForInstructorDate: (instructorId: string, date: string) =>
      readAll<Slot>(K.SLOTS).filter(
        (slot) =>
          slot.instructorId === instructorId &&
          slot.date === date &&
          slot.status === 'available',
      ),
    byId: (id: string) => readAll<Slot>(K.SLOTS).find((slot) => slot.id === id) ?? null,
    upsert: (slot: Slot) => upsert(K.SLOTS, slot),
    remove: (id: string) => removeById(K.SLOTS, id),
  },

  bookings: {
    all: () => readAll<Booking>(K.BOOKINGS),
    bySchool: (schoolId: string) =>
      readAll<Booking>(K.BOOKINGS).filter((booking) => booking.schoolId === schoolId),
    byInstructor: (instructorId: string) =>
      readAll<Booking>(K.BOOKINGS).filter((booking) => booking.instructorId === instructorId),
    byId: (id: string) => readAll<Booking>(K.BOOKINGS).find((booking) => booking.id === id) ?? null,
    upsert: (booking: Booking) => upsert(K.BOOKINGS, booking),
  },

  students: {
    all: () => readAll<Student>(K.STUDENTS),
    bySchool: (schoolId: string) =>
      readAll<Student>(K.STUDENTS).filter((student) => student.schoolId === schoolId),
    byId: (id: string) => readAll<Student>(K.STUDENTS).find((student) => student.id === id) ?? null,
    upsert: (student: Student) => upsert(K.STUDENTS, student),
  },

  subModules: {
    all: () => readAll<SubscriptionModule>(K.SUB_MODULES),
    bySchool: (schoolId: string) =>
      readAll<SubscriptionModule>(K.SUB_MODULES).filter(
        (subscription) => subscription.schoolId === schoolId,
      ),
    byId: (id: string) =>
      readAll<SubscriptionModule>(K.SUB_MODULES).find((subscription) => subscription.id === id) ?? null,
    upsert: (subscription: SubscriptionModule) => upsert(K.SUB_MODULES, subscription),
    remove: (id: string) => removeById(K.SUB_MODULES, id),
  },

  slotLocks: {
    all: () => readLocks(),
    bySlotId: (slotId: string) => readLocks().find((lock) => lock.slotId === slotId) ?? null,
    upsert: (lock: SlotLock) => {
      const locks = readLocks()
      const index = locks.findIndex((current) => current.slotId === lock.slotId)

      if (index >= 0) {
        locks[index] = lock
      } else {
        locks.push(lock)
      }

      writeLocks(locks)
      return lock
    },
    remove: (slotId: string) => {
      writeLocks(readLocks().filter((lock) => lock.slotId !== slotId))
    },
    removeBySession: (sessionId: string) => {
      writeLocks(readLocks().filter((lock) => lock.sessionId !== sessionId))
    },
    clearExpired: () => {
      writeLocks(readLocks())
    },
  },

  isSeeded: () =>
    localStorage.getItem(K.SEEDED) === 'true' &&
    localStorage.getItem(K.SEED_VERSION) === SEED_VERSION,

  markSeeded: () => {
    localStorage.setItem(K.SEEDED, 'true')
    localStorage.setItem(K.SEED_VERSION, SEED_VERSION)
  },

  reset: () => Object.values(K).forEach((key) => localStorage.removeItem(key)),
}
