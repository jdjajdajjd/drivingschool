import { addDays, format } from 'date-fns'
import { clearLocalDbWhenSupabaseConfigured, db } from './storage'
import type { School, Branch, Instructor, Slot, Booking, Student, SchoolModule, StudentProgress, LessonDescription, Car, Document, GIBDDExam, InternalExam, Payment, ProblemCase, User } from '../types'
import { saveStudentProgress, saveLessonDescription } from './studentProfile'
import { adminCars, adminDocuments, adminGIBDDExams, adminInternalExams, adminPayments, adminUsers, problemCases } from './adminStorage'

const SCHOOL_ID = 'school-virazh'
export const WORKSPACE_SCHOOL_ID = 'school-workspace'
const DEMO_SEED_DATE = format(new Date(), 'yyyy-MM-dd')

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
  primaryColor: '#4455C4',
  bookingLimitEnabled: true,
  maxActiveBookingsPerStudent: 2,
  branchSelectionMode: 'student_choice',
  maxSlotsPerBooking: 2,
  defaultLessonDuration: 90,
  enabledCategoryCodes: ['B', 'C', 'D'],
  isActive: true,
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
    for (let d = 0; d <= 7; d++) {
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
          schoolId: SCHOOL_ID,
          instructorId: instructor.id,
          branchId: instructor.branchId,
          date,
          time,
          duration: SCHOOL.defaultLessonDuration ?? 90,
          lessonType: time >= '15:00' ? 'city' : 'practice_ground',
          status: 'available',
          createdAt: new Date().toISOString(),
        })
      }
    }
  }
  return slots
}

const STUDENTS: Student[] = [
  { id: 'stu-001', schoolId: SCHOOL_ID, name: 'Иванова Анна Михайловна', normalizedPhone: '79161234567', phone: '+79161234567', email: 'ivanova@mail.ru', assignedBranchId: 'branch-central', assignedInstructorId: 'inst-petrov', categoryCodes: ['B'], trainingStage: 'city', groupName: 'B-24', createdAt: '2024-03-10T09:00:00Z' },
  { id: 'stu-002', schoolId: SCHOOL_ID, name: 'Соколов Павел Андреевич', normalizedPhone: '79167654321', phone: '+79167654321', email: 'sokolov@gmail.com', assignedBranchId: 'branch-north', assignedInstructorId: 'inst-smirnova', categoryCodes: ['B'], trainingStage: 'practice_ground', groupName: 'B-24', createdAt: '2024-03-12T10:30:00Z' },
  { id: 'stu-003', schoolId: SCHOOL_ID, name: 'Новикова Елена Дмитриевна', normalizedPhone: '79169876543', phone: '+79169876543', email: 'novikova@yandex.ru', assignedBranchId: 'branch-central', assignedInstructorId: 'inst-kozlov', categoryCodes: ['B', 'C'], trainingStage: 'exam_prep', groupName: 'C-12', createdAt: '2024-03-15T14:00:00Z' },
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

function ensureInstructorTodayWorkday(slots: Slot[], bookings: Booking[]): void {
  const petrovTodaySlots = slots
    .filter((slot) => slot.instructorId === 'inst-petrov' && slot.date === DEMO_SEED_DATE)
    .sort((left, right) => left.time.localeCompare(right.time))
    .slice(0, 4)

  petrovTodaySlots.forEach((slot, idx) => {
    if (bookings.some((booking) => booking.slotId === slot.id)) return
    const student = STUDENTS[idx % STUDENTS.length]
    const bookingId = `booking-today-petrov-${idx + 1}`
    slot.status = 'booked'
    slot.bookingId = bookingId
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
      status: 'active',
      createdAt: new Date(Date.now() - idx * 45 * 60000).toISOString(),
      notes: idx === 0 ? 'Встреча у центрального офиса, повторить перестроения.' : '',
      comment: idx === 1 ? 'Ученик просил напомнить про удобную обувь.' : '',
    })
  })
}

const ACTIVE_MODULES: SchoolModule[] = [
  {
    id: 'school-module-telegram',
    schoolId: SCHOOL_ID,
    moduleId: 'telegram',
    enabledAt: '2024-02-01T10:00:00Z',
    status: 'enabled',
  },
  {
    id: 'school-module-branding',
    schoolId: SCHOOL_ID,
    moduleId: 'branding',
    enabledAt: '2024-02-15T10:00:00Z',
    status: 'enabled',
  },
]

export function seedIfNeeded(options: { force?: boolean; mode?: 'demo' | 'workspace' } = {}): void {
  clearLocalDbWhenSupabaseConfigured()
  if (!options.force && db.isSeeded()) return

  if (options.mode === 'workspace') {
    // Production workspaces must come from Supabase and be tied to a staff session.
    // Do not create a local placeholder school here: that can mask a broken tenant binding.
    db.markSeeded()
    return
  }

  db.reset()

  db.schools.upsert(SCHOOL)
  BRANCHES.forEach((b) => db.branches.upsert(b))
  INSTRUCTORS.forEach((i) => db.instructors.upsert(i))

  const slots = generateSlots()
  const bookings = generateBookings(slots)
  ensureInstructorTodayWorkday(slots, bookings)

  slots.forEach((s) => db.slots.upsert(s))
  bookings.forEach((b) => db.bookings.upsert(b))
  STUDENTS.forEach((s) => db.students.upsert(s))
  ACTIVE_MODULES.forEach((sm) => db.subModules.upsert(sm))

  db.markSeeded()
  seedDemoProgress()
  seedDemoAdminOperations()
}

const THEORY_TOPICS = [
  'Основы ПДД и дорожная безопасность',
  'Дорожные знаки и разметка',
  'Движение в городе',
  'Перекрёстки и проезд перекрёстков',
  'Обгон, опережение, встречный разъезд',
  'Остановка, стоянка, парковка',
  'Движение по прилегающим территориям',
  'Особенности движения в тёмное время суток',
  'Перевозка пассажиров и грузов',
  'Первая помощь при ДТП',
]

const DRIVING_LESSON_THEMES = [
  { theme: 'Знакомство с автомобилем', goals: ['Настройка сиденья и зеркал', 'Запуск двигателя', 'Понять расположение педалей'], whatToBring: ['Паспорт'] },
  { theme: 'Начало движения и остановка', goals: ['Трогание с места', 'Остановка у обочины', 'Контроль сцепления'], whatToBring: ['Паспорт', 'Удобная обувь'] },
  { theme: 'Движение по прямой', goals: ['Набор скорости', 'Соблюдение дистанции', 'Контроль полосы'], whatToBring: ['Паспорт'] },
  { theme: 'Повороты и развороты', goals: ['Поворот направо', 'Поворот налево', 'Разворот на узкой дороге'], whatToBring: ['Паспорт', 'Тетрадь'] },
  { theme: 'Парковка и постановка на стоянку', goals: ['Параллельная парковка', 'Парковка перпендикулярная', 'Экстренная остановка'], whatToBring: ['Паспорт'] },
  { theme: 'Движение в городе', goals: ['Проезд перекрёстков', 'Перестроение', 'Объезд препятствий'], whatToBring: ['Паспорт'] },
  { theme: 'Обгон и опережение', goals: ['Безопасный обгон', 'Возврат в полосу', 'Опережение'], whatToBring: ['Паспорт'] },
  { theme: 'Движение по загородной дороге', goals: ['Набирать скорость', 'Торможение', 'Проезд поворотов'], whatToBring: ['Паспорт', 'Вода'] },
]

function seedDemoProgress(): void {
  STUDENTS.forEach((student, idx) => {
    const theoryCompleted = 2 + (idx % 5)
    const hoursCompleted = 4 + (idx * 3) % 20

    const progress: StudentProgress = {
      id: `progress-${student.id}`,
      studentId: student.id,
      schoolId: SCHOOL_ID,
      theoryTopicsTotal: THEORY_TOPICS.length,
      theoryTopicsCompleted: theoryCompleted,
      drivingHoursTotal: 0,
      drivingHoursCompleted: hoursCompleted,
      confirmedHours: hoursCompleted,
      internalExamPassed: idx % 3 !== 0,
      internalExamDate: idx % 3 !== 0 ? format(addDays(new Date(), -7 + idx), 'yyyy-MM-dd') : null,
      gaidExamDate: format(addDays(new Date(), 30 + idx * 7), 'yyyy-MM-dd'),
      notes: '',
      updatedAt: new Date().toISOString(),
    }
    saveStudentProgress(progress)
  })

  const bookedSlots = db.slots.all().filter((s) => s.status === 'booked')
  bookedSlots.forEach((slot, idx) => {
    const lessonIdx = idx % DRIVING_LESSON_THEMES.length
    const lesson = DRIVING_LESSON_THEMES[lessonIdx]
    const desc: LessonDescription = {
      slotId: slot.id,
      theme: lesson.theme,
      goals: lesson.goals,
      whatToBring: lesson.whatToBring,
      notes: '',
    }
    saveLessonDescription(desc)
  })
}

function seedDemoAdminOperations(): void {
  const cars: Car[] = [
    {
      id: 'car-vesta-314',
      schoolId: SCHOOL_ID,
      branchId: 'branch-central',
      instructorId: 'inst-petrov',
      brand: 'Lada',
      model: 'Vesta',
      licensePlate: 'А314ВС777',
      category: 'B',
      transmission: 'manual',
      status: 'working',
      color: 'белый',
      year: 2023,
      insuranceNumber: 'ЕЕЕ 1234567890',
      insuranceExpiry: format(addDays(new Date(), 42), 'yyyy-MM-dd'),
      nextServiceDate: format(addDays(new Date(), 18), 'yyyy-MM-dd'),
      mileage: 48200,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'car-rio-205',
      schoolId: SCHOOL_ID,
      branchId: 'branch-north',
      instructorId: 'inst-smirnova',
      brand: 'Kia',
      model: 'Rio',
      licensePlate: 'О205КМ799',
      category: 'B',
      transmission: 'auto',
      status: 'working',
      color: 'серебристый',
      year: 2022,
      insuranceNumber: 'ЕЕЕ 9876543210',
      insuranceExpiry: format(addDays(new Date(), 74), 'yyyy-MM-dd'),
      mileage: 39500,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'car-solaris-781',
      schoolId: SCHOOL_ID,
      branchId: 'branch-central',
      instructorId: 'inst-kozlov',
      brand: 'Hyundai',
      model: 'Solaris',
      licensePlate: 'М781РА797',
      category: 'B',
      transmission: 'manual',
      status: 'maintenance',
      color: 'синий',
      year: 2021,
      nextServiceDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
      notes: 'Плановое ТО перед экзаменационной неделей.',
      createdAt: new Date().toISOString(),
    },
  ]

  const payments: Payment[] = [
    {
      id: 'pay-demo-001',
      schoolId: SCHOOL_ID,
      studentId: 'stu-001',
      amount: 56000,
      paidAmount: 56000,
      remainingAmount: 0,
      status: 'paid',
      method: 'card',
      description: 'Полная оплата курса категории B',
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pay-demo-002',
      schoolId: SCHOOL_ID,
      studentId: 'stu-002',
      amount: 56000,
      paidAmount: 28000,
      remainingAmount: 28000,
      status: 'partial',
      method: 'transfer',
      description: 'Рассрочка за обучение',
      dueDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pay-demo-003',
      schoolId: SCHOOL_ID,
      studentId: 'stu-003',
      amount: 12000,
      paidAmount: 0,
      remainingAmount: 12000,
      status: 'overdue',
      method: 'receipt',
      description: 'Дополнительный пакет практики',
      dueDate: format(addDays(new Date(), -3), 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
    },
  ]

  const documents: Document[] = [
    {
      id: 'doc-demo-001',
      schoolId: SCHOOL_ID,
      studentId: 'stu-001',
      type: 'contract',
      status: 'verified',
      fileName: 'dogovor-ivanova.pdf',
      uploadedAt: format(addDays(new Date(), -20), 'yyyy-MM-dd'),
      verifiedAt: format(addDays(new Date(), -19), 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'doc-demo-002',
      schoolId: SCHOOL_ID,
      studentId: 'stu-002',
      type: 'medical_certificate',
      status: 'pending',
      fileName: 'med-spravka-sokolov.pdf',
      uploadedAt: format(addDays(new Date(), -1), 'yyyy-MM-dd'),
      expiresAt: format(addDays(new Date(), 21), 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'doc-demo-003',
      schoolId: SCHOOL_ID,
      studentId: 'stu-003',
      type: 'state_fee_receipt',
      status: 'missing',
      createdAt: new Date().toISOString(),
    },
  ]

  const internalExams: InternalExam[] = [
    {
      id: 'exam-int-demo-001',
      schoolId: SCHOOL_ID,
      studentId: 'stu-001',
      scheduledDate: format(addDays(new Date(), 4), 'yyyy-MM-dd'),
      examinerId: 'inst-kozlov',
      attemptNumber: 1,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'exam-int-demo-002',
      schoolId: SCHOOL_ID,
      studentId: 'stu-003',
      scheduledDate: format(addDays(new Date(), -5), 'yyyy-MM-dd'),
      examinerId: 'inst-petrov',
      attemptNumber: 1,
      result: 'passed',
      status: 'passed',
      createdAt: new Date().toISOString(),
    },
  ]

  const gibddExams: GIBDDExam[] = [
    {
      id: 'exam-gibdd-demo-001',
      schoolId: SCHOOL_ID,
      studentId: 'stu-003',
      examDate: format(addDays(new Date(), 12), 'yyyy-MM-dd'),
      attemptNumber: 1,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
  ]

  const users: User[] = [
    {
      id: 'user-director-demo',
      schoolId: SCHOOL_ID,
      role: 'director',
      name: 'Марина Орлова',
      phone: '+7 916 700-10-10',
      email: 'director@virazh-school.ru',
      isActive: true,
      branchIds: ['branch-central', 'branch-north', 'branch-west'],
      canViewFinances: true,
      canManageSettings: true,
      canDeleteData: true,
      canManageStaff: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-branch-demo',
      schoolId: SCHOOL_ID,
      role: 'branch_admin',
      name: 'Ирина Крылова',
      phone: '+7 916 700-20-20',
      email: 'north@virazh-school.ru',
      isActive: true,
      branchIds: ['branch-north'],
      canViewFinances: false,
      canManageSettings: false,
      canDeleteData: false,
      canManageStaff: false,
      createdAt: new Date().toISOString(),
    },
  ]

  const cases: ProblemCase[] = [
    {
      id: 'problem-demo-001',
      schoolId: SCHOOL_ID,
      studentId: 'stu-002',
      instructorId: 'inst-smirnova',
      type: 'student_wants_new_instructor',
      status: 'open',
      description: 'Ученик просит обсудить смену инструктора после занятия на площадке.',
      createdById: 'user-branch-demo',
      assignedToId: 'user-director-demo',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'problem-demo-002',
      schoolId: SCHOOL_ID,
      carId: 'car-solaris-781',
      type: 'car_broken',
      status: 'in_progress',
      description: 'Машина отправлена на ТО, свободные окна инструктора перенесены на резервный автомобиль.',
      createdById: 'user-director-demo',
      createdAt: new Date().toISOString(),
    },
  ]

  cars.forEach((item) => adminCars.upsert(item))
  payments.forEach((item) => adminPayments.upsert(item))
  documents.forEach((item) => adminDocuments.upsert(item))
  internalExams.forEach((item) => adminInternalExams.upsert(item))
  gibddExams.forEach((item) => adminGIBDDExams.upsert(item))
  users.forEach((item) => adminUsers.upsert(item))
  cases.forEach((item) => problemCases.upsert(item))
}

export function resetDemoData(): void {
  db.reset()
  seedIfNeeded()
}
