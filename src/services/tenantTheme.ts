import type { School } from '../types'

export interface TenantTheme {
  name: string
  logoUrl?: string
  brandColors: {
    primary: string
    primaryDark: string
    primarySoft: string
    success: string
    warning: string
    danger: string
  }
  contacts: {
    phone: string
    email: string
    address: string
  }
  hero: {
    eyebrow: string
    title: string
    description: string
  }
  modules: {
    booking: boolean
    schedule: boolean
    studentCabinet: boolean
  }
  trustMetrics: Array<{ label: string; value: string }>
  cta: {
    book: string
    schedule: string
    login: string
    dashboard: string
    createProfile: string
  }
}

interface TenantThemeInput {
  school: School
  branchesCount?: number
  instructorsCount?: number
  freeSlotsCount?: number
}

export function getTenantTheme(input: School | TenantThemeInput): TenantTheme {
  const school = 'school' in input ? input.school : input
  const branchesCount = 'school' in input ? input.branchesCount ?? 0 : 0
  const instructorsCount = 'school' in input ? input.instructorsCount ?? 0 : 0
  const freeSlotsCount = 'school' in input ? input.freeSlotsCount ?? 0 : 0
  const primary = school.primaryColor === '#1f5b43' ? '#2563EB' : (school.primaryColor ?? '#2563EB')

  return {
    name: school.name,
    logoUrl: school.logoUrl,
    brandColors: {
      primary,
      primaryDark: '#1E40AF',
      primarySoft: `${primary}14`,
      success: '#059669',
      warning: '#D97706',
      danger: '#DC2626',
    },
    contacts: {
      phone: school.phone,
      email: school.email,
      address: school.address,
    },
    hero: {
      eyebrow: 'Автошкола',
      title: school.name,
      description: school.description || 'Запишитесь на практическое занятие в удобном филиале и управляйте расписанием в личном кабинете.',
    },
    modules: {
      booking: true,
      schedule: true,
      studentCabinet: true,
    },
    trustMetrics: [
      { label: 'филиала', value: String(branchesCount) },
      { label: 'инструкторов', value: String(instructorsCount) },
      { label: 'свободных мест', value: String(freeSlotsCount) },
    ],
    cta: {
      book: 'Записаться на занятие',
      schedule: 'Расписание',
      login: 'Войти',
      dashboard: 'Личный кабинет',
      createProfile: 'Создать кабинет',
    },
  }
}
