import type {
  Booking,
  Branch,
  Instructor,
  School,
  Slot,
  SlotLock,
  Student,
  SchoolModule,
} from '../types'
export const SEED_VERSION = '7'

const KEY_PREFIX = 'dd:'
let activeNamespace = 'demo'

const K = {
  SCHOOLS: 'schools',
  BRANCHES: 'branches',
  INSTRUCTORS: 'instructors',
  SLOTS: 'slots',
  BOOKINGS: 'bookings',
  STUDENTS: 'students',
  SCHOOL_MODULES: 'school_modules',
  SLOT_LOCKS: 'slot_locks',
  SEEDED: 'seeded',
  SEED_VERSION: 'seed_version',
} as const

function namespacedKey(key: string, namespace: DataNamespace = activeNamespace as DataNamespace): string {
  return `${KEY_PREFIX}${namespace}:${key}`
}

export type DataNamespace = 'demo' | 'workspace'

export function setDataNamespace(namespace: DataNamespace): void {
  activeNamespace = namespace
  if (typeof window !== 'undefined') {
    ;(window as Window & { __VROOM_DATA_NAMESPACE?: DataNamespace }).__VROOM_DATA_NAMESPACE = namespace
    window.sessionStorage.setItem('dd:data_namespace', namespace)
  }
}

export function getDataNamespace(): DataNamespace {
  return activeNamespace as DataNamespace
}

export function isDemoNamespace(): boolean {
  return getDataNamespace() === 'demo'
}

function browserStorageForNamespace(namespace: DataNamespace): Storage | null {
  if (typeof window === 'undefined') return null
  return namespace === 'demo' ? window.sessionStorage : window.localStorage
}

const memoryStore = new Map<string, unknown[]>()

/**
 * Read all records for a given key from a specific namespace, without changing
 * the currently active namespace. Used for cross-namespace lookups (e.g. finding
 * a workspace school by slug when the current namespace is 'demo').
 */
function readAllFromNamespace<T>(namespace: DataNamespace, key: string): T[] {
  const nsKey = namespacedKey(key, namespace)
  try {
    const raw = browserStorageForNamespace(namespace)?.getItem(nsKey)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return [...((memoryStore.get(`${namespace}:${key}`) as T[] | undefined) ?? [])]
  }
}

export function findSchoolNamespaceBySlug(slug: string): DataNamespace | null {
  // Workspace data takes priority; demo routes set the demo namespace explicitly.
  const workspaceSchool = readAllFromNamespace<School>('workspace', K.SCHOOLS).some(
    (school) => school.slug === slug,
  )
  if (workspaceSchool) return 'workspace'

  const demoSchool = readAllFromNamespace<School>('demo', K.SCHOOLS).some(
    (school) => school.slug === slug,
  )
  return demoSchool ? 'demo' : null
}

export function findSchoolBySlugAcrossNamespaces(slug: string): School | null {
  const namespace = findSchoolNamespaceBySlug(slug)
  if (!namespace) return null
  return readAllFromNamespace<School>(namespace, K.SCHOOLS).find(
    (school) => school.slug === slug,
  ) ?? null
}

export function findSchoolNamespaceById(id: string): DataNamespace | null {
  const workspaceSchool = readAllFromNamespace<School>('workspace', K.SCHOOLS).some(
    (school) => school.id === id,
  )
  if (workspaceSchool) return 'workspace'

  const demoSchool = readAllFromNamespace<School>('demo', K.SCHOOLS).some(
    (school) => school.id === id,
  )
  return demoSchool ? 'demo' : null
}

export function findSchoolByIdAcrossNamespaces(id: string): School | null {
  const namespace = findSchoolNamespaceById(id)
  if (!namespace) return null
  return readAllFromNamespace<School>(namespace, K.SCHOOLS).find(
    (school) => school.id === id,
  ) ?? null
}

export function clearLocalDbWhenSupabaseConfigured(): void {
  // Data is split by namespace now; Supabase should not wipe local demo/workspace state.
}

function readAll<T>(key: string): T[] {
  try {
    const namespace = getDataNamespace()
    const raw = browserStorageForNamespace(namespace)?.getItem(namespacedKey(key, namespace))
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return [...((memoryStore.get(`${activeNamespace}:${key}`) as T[] | undefined) ?? [])]
  }
}

function writeAll<T>(key: string, data: T[]): void {
  try {
    const namespace = getDataNamespace()
    browserStorageForNamespace(namespace)?.setItem(namespacedKey(key, namespace), JSON.stringify(data))
  } catch {
    memoryStore.set(`${activeNamespace}:${key}`, data)
  }
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

function currentAdminSchool(): School | null {
  let staffSchoolId = ''
  try {
    const raw = sessionStorage.getItem('dd:staff_context:workspace')
    const parsed = raw ? (JSON.parse(raw) as { schoolId?: unknown }) : null
    staffSchoolId = typeof parsed?.schoolId === 'string' ? parsed.schoolId : ''
  } catch {
    staffSchoolId = ''
  }

  if (staffSchoolId) return readAll<School>(K.SCHOOLS).find((school) => school.id === staffSchoolId) ?? null
  const schools = readAll<School>(K.SCHOOLS)
  return schools.find((school) => school.isActive !== false) ?? schools[0] ?? null
}

export const db = {
  schools: {
    all: () => readAll<School>(K.SCHOOLS),
    currentAdmin: () => currentAdminSchool() as School,
    bySlug: (slug: string) => readAll<School>(K.SCHOOLS).find((school) => school.slug === slug) ?? null,
    byId: (id: string) => readAll<School>(K.SCHOOLS).find((school) => school.id === id) ?? null,
    upsert: (school: School) => upsert(K.SCHOOLS, school),
    remove: (id: string) => removeById(K.SCHOOLS, id),
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
    bySchool: (schoolId: string) =>
      readAll<Slot>(K.SLOTS).filter((slot) => slot.schoolId === schoolId),
    byInstructor: (instructorId: string) =>
      readAll<Slot>(K.SLOTS).filter((slot) => slot.instructorId === instructorId),
    byBranch: (branchId: string) =>
      readAll<Slot>(K.SLOTS).filter((slot) => slot.branchId === branchId),
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
    remove: (id: string) => removeById(K.BOOKINGS, id),
  },

  students: {
    all: () => readAll<Student>(K.STUDENTS),
    bySchool: (schoolId: string) =>
      readAll<Student>(K.STUDENTS).filter((student) => student.schoolId === schoolId),
    byId: (id: string) => readAll<Student>(K.STUDENTS).find((student) => student.id === id) ?? null,
    byNormalizedPhone: (schoolId: string, normalizedPhone: string) =>
      readAll<Student>(K.STUDENTS).find(
        (student) => student.schoolId === schoolId && student.normalizedPhone === normalizedPhone,
      ) ?? null,
    upsert: (student: Student) => upsert(K.STUDENTS, student),
    remove: (id: string) => removeById(K.STUDENTS, id),
  },

  schoolModules: {
    all: () => readAll<SchoolModule>(K.SCHOOL_MODULES),
    bySchool: (schoolId: string) =>
      readAll<SchoolModule>(K.SCHOOL_MODULES).filter(
        (subscription) => subscription.schoolId === schoolId,
      ),
    byId: (id: string) =>
      readAll<SchoolModule>(K.SCHOOL_MODULES).find((subscription) => subscription.id === id) ?? null,
    upsert: (subscription: SchoolModule) => upsert(K.SCHOOL_MODULES, subscription),
    remove: (id: string) => removeById(K.SCHOOL_MODULES, id),
  },

  subModules: {
    all: () => readAll<SchoolModule>(K.SCHOOL_MODULES),
    bySchool: (schoolId: string) =>
      readAll<SchoolModule>(K.SCHOOL_MODULES).filter((subscription) => subscription.schoolId === schoolId),
    byId: (id: string) =>
      readAll<SchoolModule>(K.SCHOOL_MODULES).find((subscription) => subscription.id === id) ?? null,
    upsert: (subscription: SchoolModule) => upsert(K.SCHOOL_MODULES, subscription),
    remove: (id: string) => removeById(K.SCHOOL_MODULES, id),
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

  isSeeded: () => {
    const namespace = getDataNamespace()
    const storage = browserStorageForNamespace(namespace)
    return storage?.getItem(namespacedKey(K.SEEDED, namespace)) === 'true' &&
      storage?.getItem(namespacedKey(K.SEED_VERSION, namespace)) === SEED_VERSION
  },

  markSeeded: () => {
    const namespace = getDataNamespace()
    const storage = browserStorageForNamespace(namespace)
    storage?.setItem(namespacedKey(K.SEEDED, namespace), 'true')
    storage?.setItem(namespacedKey(K.SEED_VERSION, namespace), SEED_VERSION)
  },

  reset: () => {
    const namespace = getDataNamespace()
    const storage = browserStorageForNamespace(namespace)
    Object.values(K).forEach((key) => storage?.removeItem(namespacedKey(key, namespace)))
    Object.values(K).forEach((key) => memoryStore.delete(`${activeNamespace}:${key}`))
  },
}
