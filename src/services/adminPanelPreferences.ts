import type { StaffPermission } from '../types'
import { getDataNamespace } from './storage'
import { getWorkspaceStaffContext } from './accessControl'
import { getPreference, setPreference } from './preferenceStorage'

export type AdminNavItemId =
  | 'today'
  | 'schedule'
  | 'slots'
  | 'bookings'
  | 'students'
  | 'instructors'
  | 'branches'
  | 'cars'
  | 'payments'
  | 'documents'
  | 'exams'
  | 'reports'
  | 'settings'
  | 'users'
  | 'launch'

export interface AdminNavDefinition {
  id: AdminNavItemId
  label: string
  description: string
  permission: StaffPermission
  required: boolean
}

export const REQUIRED_ADMIN_NAV_IDS: AdminNavItemId[] = ['today', 'schedule', 'students', 'settings']

export const DEFAULT_OPTIONAL_ADMIN_NAV_IDS: AdminNavItemId[] = []

export const BOOKING_TOOL_ADMIN_NAV_IDS: AdminNavItemId[] = [
  'today',
  'schedule',
  'students',
  'settings',
]

export function getAdminPanelPreferencesKey(schoolId: string): string {
  const context = getWorkspaceStaffContext()
  const actor = context.name ? context.name.replace(/\s+/g, '_').toLowerCase() : context.role
  return `dd:${getDataNamespace()}:admin_panel:${schoolId}:${actor}`
}

export function getEnabledAdminNavIds(schoolId: string, definitions: AdminNavDefinition[]): AdminNavItemId[] {
  const allowed = new Set(BOOKING_TOOL_ADMIN_NAV_IDS)
  const required = definitions.filter((item) => item.required && allowed.has(item.id)).map((item) => item.id)
  const defaults = Array.from(new Set([...required, ...DEFAULT_OPTIONAL_ADMIN_NAV_IDS]))

  try {
    const raw = getPreference(getAdminPanelPreferencesKey(schoolId))
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as { enabledIds?: unknown }
    const enabled = Array.isArray(parsed.enabledIds) ? parsed.enabledIds.filter((id): id is AdminNavItemId => typeof id === 'string' && allowed.has(id as AdminNavItemId)) : defaults
    return Array.from(new Set([...required, ...enabled]))
  } catch {
    return defaults
  }
}

export function saveEnabledAdminNavIds(schoolId: string, enabledIds: AdminNavItemId[]): void {
  try {
    setPreference(
      getAdminPanelPreferencesKey(schoolId),
      JSON.stringify({ enabledIds: Array.from(new Set([...REQUIRED_ADMIN_NAV_IDS, ...enabledIds])) }),
    )
  } catch {
    // Preferences are convenience-only; ignore storage failures.
  }
}

export type AdminDashboardBlockId =
  | 'finance'
  | 'stats'
  | 'launchChecklist'
  | 'nearest'
  | 'attention'
  | 'quickActions'
  | 'audit'
  | 'requests'
  | 'dataCheck'

export interface AdminDashboardBlockDefinition {
  id: AdminDashboardBlockId
  label: string
  description: string
  required?: boolean
}

export const ADMIN_DASHBOARD_BLOCKS: AdminDashboardBlockDefinition[] = [
  { id: 'finance', label: 'Финансы', description: 'Оплаты, остатки и поступления.' },
  { id: 'stats', label: 'Сводка', description: 'Основные показатели работы школы.' },
  { id: 'launchChecklist', label: 'Настройка школы', description: 'Проверка филиалов, сотрудников и расписания.' },
  { id: 'nearest', label: 'Ближайшие занятия', description: 'Короткий список занятий по времени.' },
  { id: 'attention', label: 'Проверки', description: 'Незакрытые занятия, оплаты, документы и машины.' },
  { id: 'quickActions', label: 'Действия', description: 'Основные рабочие переходы.' },
  { id: 'audit', label: 'Последние действия', description: 'Журнал изменений.' },
  { id: 'requests', label: 'Запросы учеников', description: 'Переносы и отмены.' },
  { id: 'dataCheck', label: 'Проверка данных', description: 'Ошибки связей.' },
]

const DEFAULT_DASHBOARD_BLOCK_IDS: AdminDashboardBlockId[] = ['stats', 'quickActions']

function getAdminDashboardBlocksKey(schoolId: string): string {
  return `${getAdminPanelPreferencesKey(schoolId)}:dashboard_blocks`
}

export function getEnabledDashboardBlockIds(schoolId: string): AdminDashboardBlockId[] {
  try {
    const raw = getPreference(getAdminDashboardBlocksKey(schoolId))
    if (!raw) return DEFAULT_DASHBOARD_BLOCK_IDS
    const parsed = JSON.parse(raw) as { enabledIds?: unknown }
    return Array.isArray(parsed.enabledIds)
      ? parsed.enabledIds.filter((id): id is AdminDashboardBlockId => typeof id === 'string')
      : DEFAULT_DASHBOARD_BLOCK_IDS
  } catch {
    return DEFAULT_DASHBOARD_BLOCK_IDS
  }
}

export function saveEnabledDashboardBlockIds(schoolId: string, enabledIds: AdminDashboardBlockId[]): void {
  try {
    setPreference(getAdminDashboardBlocksKey(schoolId), JSON.stringify({ enabledIds: Array.from(new Set(enabledIds)) }))
  } catch {
    // Preferences are convenience-only; ignore storage failures.
  }
}
