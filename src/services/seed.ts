import { addDays, format } from 'date-fns'
import { db } from './storage'
import type { School, Branch, Instructor, Slot, Booking, Student, SubscriptionModule } from '../types'

const SCHOOL_ID = 'school-virazh'

const SCHOOL: School = {
  id: SCHOOL_ID,
  name: 'Автошкола «Вираж»',
  slug: 'virazh',
  description:
    'Профессиональная подготовка водителей с 2008 года. Современные автомобили, опытные инструкторы, удобное расписание.',
  phone: '+7 (495) 123-45-67',
  email: 'info@virazh-school.ru',
  address: 'г. Москва, ул. Ленина, 45',
  createdAt: '2024-01-15T10:00:00Z',
  bookingLimitEnabled: true,
  maxActiveBookingsPerStudent: 2,
}

const BRANCHES: Branch[] = [
  {
    id: 'branch-central',
    schoolId: SCHOOL_ID,
    name: 'Центральный офис',
    address: 'ул. Ленина, 45',
    phone: '+7 (495) 123-45-67',
    isActive: true,
  },
  {
    id: 'branch-north',
    schoolId: SCHOOL_ID,
    name: 'Северное отделение',
    address: 'ул. Гагарина, 112',
    phone: '+7 (495) 234-56-78',
    isActive: true,
  },
  {
    id: 'branch-west',
    schoolId: SCHOOL_ID,
    name: 'Западное отделение',
    address: 'пр. Победы, 78',
    phone: '+7 (495) 345-67-89',
    isActive: true,
  },
]

const INSTRUCTORS: Instructor[] = [
  {
    id: 'inst-petrov',
    schoolId: SCHOOL_ID,
    branchId: 'branch-central',
    name: 'Петров Алексей Иванович',
    phone: '+7 (916) 111-22-33',
    email: 'petrov@virazh.ru',
    token: 'tok-petrov-2024',
    bio: 'Инструктор высшей категории, 15 лет за рулём учебного автомобиля. Специализируется на вождении в городском потоке и подготовке к экзамену ГИБДД.',
    experience: 15,
    isActive: true,
    categories: ['B'],
    avatarInitials: 'АП',
    avatarColor: '#2A6E4C',
    car: 'Lada Vesta',
    transmission: 'manual',
  },
  {
    id: 'inst-smirnova',
    schoolId: SCHOOL_ID,
    branchId: 'branch-north',
    name: 'Смирнова Наталья Петровна',
    phone: '+7 (916) 222-33-44',
    email: 'smirnova@virazh.ru',
    token: 'tok-smirnova-2024',
    bio: 'Педагог и инструктор с 8-летним стажем. Специализируется на работе с начинающими водителями. Спокойный подход, терпение — её главные качества.',
    experience: 8,
    isActive: true,
    categories: ['B'],
    avatarInitials: 'НС',
    avatarColor: '#1F5239',
    car: 'Kia Rio',
    transmission: 'auto',
  },
  {
    id: 'inst-kozlov',
    schoolId: SCHOOL_ID,
    branchId: 'branch-central',
    name: 'Козлов Игорь Владимирович',
    phone: '+7 (916) 333-44-55',
    email: 'kozlov@virazh.ru',
    token: 'tok-kozlov-2024',
    bio: 'Бывший сотрудник ГИБДД, знает требования экзамена изнутри. 12 лет опыта инструктора. Высокая сдаваемость учеников с первого раза.',
    experience: 12,
    isActive: true,
    categories: ['B', 'C'],
    avatarInitials: 'ИК',
    avatarColor: '#163B29',
    car: 'Hyundai Solaris',
    transmission: 'manual',
  },
  {
    id: 'inst-volkova',
    schoolId: SCHOOL_ID,
    branchId: 'branch-west',
    name: 'Волкова Марина Сергеевна',
    phone: '+7 (916) 444-55-66',
    email: 'volkova@virazh.ru',
    token: 'tok-volkova-2024',
    bio: 'Молодой энергичный инструктор с 6-летним стажем. Отличный подход к молодёжи, современный стиль обучения. Специализируется на автоматической коробке.',
    experience: 6,
    isActive: true,
    categories: ['B'],
    avatarInitials: 'МВ',
    avatarColor: '#3A8B62',
    car: 'Toyota Corolla',
    transmission: 'auto',
  },
  {
    id: 'inst-zakharov',
    schoolId: SCHOOL_ID,
    branchId: 'branch-north',
    name: 'Захаров Дмитрий Николаевич',
    phone: '+7 (916) 555-66-77',
    email: 'zakharov@virazh.ru',
    token: 'tok-zakharov-2024',
    bio: 'Ветеран школы, 20 лет в профессии. Умеет найти подход к любому ученику. Многократный победитель городских соревнований по безопасному вождению.',
    experience: 20,
    isActive: true,
    categories: ['B', 'C', 'D'],
    avatarInitials: 'ДЗ',
    avatarColor: '#0E261A',
    car: 'Skoda Octavia',
    transmission: 'manual',
  },
]

const TIME_SLOTS = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00']

function generateSlots(): Slot[] {
  const slots: Slot[] = []
  const today = new Date()

  for (const instructor of INSTRUCTORS) {
    for (let d = 1; d <= 7; d++) {
      const date = format(addDays(today, d), 'yyyy-MM-dd')
      const timesForDay =
        d % 3 === 0
          ? TIME_SLOTS.slice(0, 5)
          : d % 2 === 0
            ? TIME_SLOTS.slice(1, 6)
            : TIME_SLOTS.slice(0, 6)

      for (const time of timesForDay) {
        slots.push({
          id: `slot-${instructor.id}-${date}-${time.replace(':', '')}`,
          instructorId: instructor.id,
          branchId: instructor.branchId,
          date,
          time,
          duration: 90,
          status: 'available',
        })
      }
    }
  }
  return slots
}

const STUDENTS: Student[] = [
  { id: 'stu-001', schoolId: SCHOOL_ID, name: 'Иванова Анна Михайловна', normalizedPhone: '79161234567', phone: '+79161234567', email: 'ivanova@mail.ru', createdAt: '2024-03-10T09:00:00Z' },
  { id: 'stu-002', schoolId: SCHOOL_ID, name: 'Соколов Павел Андреевич', normalizedPhone: '79167654321', phone: '+79167654321', email: 'sokolov@gmail.com', createdAt: '2024-03-12T10:30:00Z' },
  { id: 'stu-003', schoolId: SCHOOL_ID, name: 'Новикова Елена Дмитриевна', normalizedPhone: '79169876543', phone: '+79169876543', email: 'novikova@yandex.ru', createdAt: '2024-03-15T14:00:00Z' },
  { id: 'stu-004', schoolId: SCHOOL_ID, name: 'Морозов Сергей Алексеевич', normalizedPhone: '79163456789', phone: '+79163456789', email: 'morozov@mail.ru', createdAt: '2024-03-18T11:00:00Z' },
  { id: 'stu-005', schoolId: SCHOOL_ID, name: 'Лебедева Ольга Николаевна', normalizedPhone: '79162345678', phone: '+79162345678', email: 'lebedeva@gmail.com', createdAt: '2024-03-20T09:30:00Z' },
  { id: 'stu-006', schoolId: SCHOOL_ID, name: 'Козлова Виктория Игоревна', normalizedPhone: '79168765432', phone: '+79168765432', email: 'kozlova@yandex.ru', createdAt: '2024-03-22T16:00:00Z' },
  { id: 'stu-007', schoolId: SCHOOL_ID, name: 'Попов Михаил Сергеевич', normalizedPhone: '79165432109', phone: '+79165432109', email: 'popov@mail.ru', createdAt: '2024-03-25T12:00:00Z' },
  { id: 'stu-008', schoolId: SCHOOL_ID, name: 'Александрова Юлия Вячеславовна', normalizedPhone: '79164321098', phone: '+79164321098', email: 'alex@gmail.com', createdAt: '2024-03-28T10:00:00Z' },
]

function generateBookings(slots: Slot[]): Booking[] {
  const bookings: Booking[] = []
  const statuses: Booking['status'][] = ['active', 'active', 'completed', 'active', 'cancelled']

  const bookableSlots = slots.filter((_, i) => i % 4 === 0).slice(0, 18)

  bookableSlots.forEach((slot, idx) => {
    const student = STUDENTS[idx % STUDENTS.length]
    const bookingId = `booking-${String(idx + 1).padStart(3, '0')}`
    const status = statuses[idx % statuses.length]

    // Only mark slot as booked if the booking is active or completed
    if (status !== 'cancelled') {
      slot.status = 'booked'
      slot.bookingId = bookingId
    }

    bookings.push({
      id: bookingId,
      schoolId: SCHOOL_ID,
      slotId: slot.id,
      instructorId: slot.instructorId,
      branchId: slot.branchId,
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.normalizedPhone ?? student.phone,
      studentEmail: student.email,
      status,
      createdAt: new Date(Date.now() - idx * 3600000 * 24).toISOString(),
    })
  })

  return bookings
}

const ACTIVE_MODULES: SubscriptionModule[] = [
  {
    id: 'submod-telegram',
    schoolId: SCHOOL_ID,
    moduleId: 'telegram',
    activatedAt: '2024-02-01T10:00:00Z',
    status: 'active',
  },
  {
    id: 'submod-analytics',
    schoolId: SCHOOL_ID,
    moduleId: 'analytics',
    activatedAt: '2024-02-15T10:00:00Z',
    status: 'active',
  },
  {
    id: 'submod-reminders',
    schoolId: SCHOOL_ID,
    moduleId: 'reminders',
    activatedAt: '2024-03-01T10:00:00Z',
    status: 'active',
  },
]

export function seedIfNeeded(): void {
  if (db.isSeeded()) return

  // Clear stale data before reseeding
  db.reset()

  db.schools.upsert(SCHOOL)
  BRANCHES.forEach((b) => db.branches.upsert(b))
  INSTRUCTORS.forEach((i) => db.instructors.upsert(i))

  const slots = generateSlots()
  const bookings = generateBookings(slots)

  slots.forEach((s) => db.slots.upsert(s))
  bookings.forEach((b) => db.bookings.upsert(b))
  STUDENTS.forEach((s) => db.students.upsert(s))
  ACTIVE_MODULES.forEach((sm) => db.subModules.upsert(sm))

  db.markSeeded()
}
