import type { Branch, SchoolRoleDefinition, StaffPermission, User, UserRole } from '../types'

export const SCHOOL_ROLE_DEFINITIONS: SchoolRoleDefinition[] = [
  {
    id: 'director',
    label: 'Директор',
    description: 'Полный доступ к школе, финансам, настройкам и команде.',
    branchScoped: false,
    permissions: ['school.manage', 'branches.manage', 'staff.manage', 'students.manage', 'schedule.manage', 'finance.view', 'finance.manage', 'vehicles.manage', 'documents.manage', 'exams.manage', 'reports.view', 'settings.manage', 'data.delete'],
  },
  {
    id: 'admin',
    label: 'Менеджер школы',
    description: 'Операционная работа со всеми филиалами без удаления критичных данных.',
    branchScoped: false,
    permissions: ['branches.manage', 'students.manage', 'schedule.manage', 'vehicles.manage', 'documents.manage', 'exams.manage', 'reports.view'],
  },
  {
    id: 'branch_admin',
    label: 'Администратор филиала',
    description: 'Работа только с назначенными филиалами, учениками и расписанием.',
    branchScoped: true,
    permissions: ['students.manage', 'schedule.manage'],
  },
  {
    id: 'accountant',
    label: 'Бухгалтер',
    description: 'Просмотр оплат и финансовых показателей школы.',
    branchScoped: false,
    permissions: ['finance.view', 'finance.manage', 'reports.view'],
  },
  {
    id: 'instructor',
    label: 'Инструктор',
    description: 'Доступ к своему расписанию и ученикам без настроек школы.',
    branchScoped: true,
    permissions: ['schedule.manage'],
  },
  {
    id: 'superadmin',
    label: 'Владелец сервиса',
    description: 'Внутренняя роль платформы, не назначается в команде школы.',
    branchScoped: false,
    permissions: ['school.manage', 'branches.manage', 'staff.manage', 'students.manage', 'schedule.manage', 'finance.view', 'finance.manage', 'vehicles.manage', 'documents.manage', 'exams.manage', 'reports.view', 'settings.manage', 'data.delete'],
  },
]

export const SCHOOL_STAFF_ROLES = SCHOOL_ROLE_DEFINITIONS.filter((role) => role.id !== 'superadmin')

export function getRoleDefinition(role: UserRole): SchoolRoleDefinition {
  return SCHOOL_ROLE_DEFINITIONS.find((item) => item.id === role) ?? SCHOOL_ROLE_DEFINITIONS[1]
}

export function permissionsForRole(role: UserRole): StaffPermission[] {
  return getRoleDefinition(role).permissions
}

export function normalizeStaffMember(user: User): User {
  const role = user.roleId ?? user.role
  const permissions = permissionsForRole(role)
  return {
    ...user,
    role,
    roleId: role,
    branchIds: Array.from(new Set((user.branchIds ?? []).filter(Boolean))),
    canViewFinances: permissions.includes('finance.view'),
    canManageSettings: permissions.includes('settings.manage'),
    canDeleteData: permissions.includes('data.delete'),
    canManageStaff: permissions.includes('staff.manage'),
  }
}

export function roleHasPermission(role: UserRole, permission: StaffPermission): boolean {
  return permissionsForRole(role).includes(permission)
}

export function normalizeStaffBranches(role: UserRole, branchIds: string[], branches: Pick<Branch, 'id'>[]): string[] {
  const roleDefinition = getRoleDefinition(role)
  if (!roleDefinition.branchScoped) return []

  const knownBranchIds = new Set(branches.map((branch) => branch.id))
  return Array.from(new Set(branchIds.filter((branchId) => knownBranchIds.has(branchId))))
}
