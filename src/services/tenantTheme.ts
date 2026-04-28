import type { School } from '../types'

export interface TenantTheme {
  name: string
  logoUrl?: string
  primaryColor: string
  contactPhone: string
  contactEmail: string
  address: string
  cta: {
    book: string
    schedule: string
    login: string
  }
}

export function getTenantTheme(school: School): TenantTheme {
  return {
    name: school.name,
    logoUrl: school.logoUrl,
    primaryColor: school.primaryColor === '#1f5b43' ? '#2563EB' : (school.primaryColor ?? '#2563EB'),
    contactPhone: school.phone,
    contactEmail: school.email,
    address: school.address,
    cta: {
      book: 'Записаться на занятие',
      schedule: 'Расписание',
      login: 'Войти',
    },
  }
}
