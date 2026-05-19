import { Suspense, useEffect, useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Medal, GraphUp, Building, Calendar, Car, OpenNewWindow, Page, Dashboard, LogOut, Menu, Settings, ShieldCheck, Filter, Search, UserBadgeCheck, Group, Wallet, Xmark } from 'iconoir-react'
const Award = Medal
const BarChart3 = GraphUp
const Building2 = Building
const CalendarDays = Calendar
const ExternalLink = OpenNewWindow
const FileText = Page
const LayoutDashboard = Dashboard
const SlidersHorizontal = Filter
const UserCog = UserBadgeCheck
const Users = Group
const X = Xmark
import { ADMIN_BASE_PATH, clearAccess, getAccessSecret } from '../../services/accessControl'
import { closeSupabaseStaffSession } from '../../services/staffSessionService'
import { setDataNamespace } from '../../services/storage'
import { seedIfNeeded } from '../../services/seed'
import { syncSupabaseSchoolToLocalDb } from '../../services/supabaseSync'
import { db } from '../../services/storage'
import { getWorkspaceStaffContext, isBranchAdminContext } from '../../services/accessControl'
import { roleHasPermission } from '../../services/schoolStaff'
import type { StaffPermission } from '../../types'
import {
  getEnabledAdminNavIds,
  saveEnabledAdminNavIds,
  type AdminNavDefinition,
  type AdminNavItemId,
} from '../../services/adminPanelPreferences'
import { BrandMark } from './BrandMark'
import { AdminAccessDenied } from './AdminAccessDenied'
import { SchoolRequiredState } from './SchoolRequiredState'
import { Modal } from '../ui/Modal'
import { AdminContentLoader, LoadingScreen } from '../ui/loader'
import { filterBranches, filterInstructors, filterStudents } from '../../services/staffScope'

function permission(value: StaffPermission): StaffPermission {
  return value
}

type AdminNavItem = AdminNavDefinition & {
  to: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

function buildNavItems(basePath: string): AdminNavItem[] {
  return [
    { id: 'today', to: basePath, label: 'Сегодня', description: 'Рабочий день и ближайшие задачи.', icon: LayoutDashboard, permission: permission('schedule.manage'), required: true },
    { id: 'schedule', to: `${basePath}/schedule`, label: 'Расписание', description: 'Окна, записи и переносы занятий.', icon: CalendarDays, permission: permission('schedule.manage'), required: true },
    { id: 'students', to: `${basePath}/students`, label: 'Ученики', description: 'Карточки учеников и обучение.', icon: Users, permission: permission('students.manage'), required: true },
    { id: 'instructors', to: `${basePath}/instructors`, label: 'Инструкторы', description: 'Инструкторы и их карточки.', icon: UserCog, permission: permission('branches.manage'), required: true },
    { id: 'branches', to: `${basePath}/branches`, label: 'Филиалы', description: 'Адреса, телефоны и активность филиалов.', icon: Building2, permission: permission('branches.manage'), required: false },
    { id: 'cars', to: `${basePath}/cars`, label: 'Машины', description: 'Автопарк, статусы, страховки.', icon: Car, permission: permission('vehicles.manage'), required: false },
    { id: 'payments', to: `${basePath}/payments`, label: 'Оплаты', description: 'Долги, поступления и частичные оплаты.', icon: Wallet, permission: permission('finance.view'), required: false },
    { id: 'documents', to: `${basePath}/documents`, label: 'Документы', description: 'Договоры, справки и проверки.', icon: FileText, permission: permission('documents.manage'), required: false },
    { id: 'exams', to: `${basePath}/exams`, label: 'Экзамены', description: 'Внутренние и ГИБДД экзамены.', icon: Award, permission: permission('exams.manage'), required: false },
    { id: 'reports', to: `${basePath}/reports`, label: 'Отчёты', description: 'Сводки и показатели школы.', icon: BarChart3, permission: permission('reports.view'), required: false },
    { id: 'settings', to: `${basePath}/settings`, label: 'Настройки', description: 'Параметры школы и записи.', icon: Settings, permission: permission('settings.manage'), required: false },
    { id: 'users', to: `${basePath}/users`, label: 'Команда', description: 'Сотрудники, роли и филиалы.', icon: ShieldCheck, permission: permission('staff.manage'), required: false },
  ]
}

type NavItem = ReturnType<typeof buildNavItems>[number]

function Sidebar({ navItems, basePath, onClose, onCustomize }: { navItems: NavItem[]; basePath: string; onClose?: () => void; onCustomize: () => void }) {
  return (
    <div className="flex h-full flex-col border-r border-white/70 bg-[rgba(255,255,255,0.72)] text-[#111315] shadow-[var(--shadow-card)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-[#111827]/[0.06] px-4 py-4">
        <button type="button" onClick={() => onClose?.()} className="flex min-w-0 flex-col items-start text-left">
          <BrandMark variant="dark" size="md" />
          <span className="mt-1 text-[12px] font-medium text-[#687381]">админка</span>
        </button>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-[#8A96A3] hover:bg-[#EEF6FF] hover:text-[#111315] lg:hidden"
            aria-label="Закрыть меню"
          >
            <X width={18} height={18} />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[11px] font-medium text-[#9AA6B2]">Операции</p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === basePath}
                onClick={onClose}
                className={({ isActive }) =>
                  `admin-sidebar-link flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[14px] font-medium transition ${
                    isActive
                      ? 'is-active bg-[#EAF3FF] text-[#111315] shadow-[inset_0_0_0_1px_rgba(17,24,39,0.06)]'
                      : 'text-[#667381] hover:bg-white/70 hover:text-[#111315]'
                  }`
                }
              >
                <Icon width={19} height={19} strokeWidth={2.1} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
      <div className="border-t border-[#111827]/[0.06] p-3">
        <button
          type="button"
          onClick={() => { onCustomize(); onClose?.() }}
          className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-[14px] font-medium text-[#667381] hover:bg-white/70 hover:text-[#111315]"
        >
          <SlidersHorizontal width={18} height={18} />
          Настроить меню
        </button>
      </div>
    </div>
  )
}

export function AdminLayout({ mode = 'workspace', basePath = ADMIN_BASE_PATH }: { mode?: 'demo' | 'workspace'; basePath?: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuSettingsOpen, setMenuSettingsOpen] = useState(false)
  const [menuVersion, setMenuVersion] = useState(0)
  const [quickSearch, setQuickSearch] = useState('')
  const staffContext = getWorkspaceStaffContext()
  const branchScoped = mode === 'workspace' && isBranchAdminContext()
  const allNavItems = buildNavItems(basePath)
  const school = ready ? db.schools.currentAdmin() : null
  const enabledIds = school ? getEnabledAdminNavIds(school.id, allNavItems) : []
  const permittedNavItems = allNavItems.filter((item) => {
    if (mode === 'demo') return true
    return roleHasPermission(staffContext.role, item.permission)
  })
  const navItems = permittedNavItems.filter((item) => item.required || enabledIds.includes(item.id as AdminNavItemId))
  const mobileNavItems = navItems.filter((item) =>
    [basePath, `${basePath}/schedule`, `${basePath}/students`, `${basePath}/payments`, `${basePath}/reports`].includes(item.to),
  )

  useEffect(() => {
    let disposed = false
    setDataNamespace(mode)
    const staffContext = getWorkspaceStaffContext()
    if (mode === 'demo') {
      seedIfNeeded({ mode })
    }

    if (mode === 'workspace' && !staffContext.schoolId) {
      setReady(true)
      return () => {
        disposed = true
      }
    }

    const sync = mode === 'workspace'
      ? syncSupabaseSchoolToLocalDb({ schoolId: staffContext.schoolId })
      : Promise.resolve()
    sync.catch(() => undefined).finally(() => {
      if (!disposed) setReady(true)
    })
    const fallback = window.setTimeout(() => setReady(true), 4000)
    return () => {
      disposed = true
      window.clearTimeout(fallback)
    }
  }, [mode])

  if (!ready) return <LoadingScreen tone="admin" label="Загрузка кабинета" />

  const publicPath = school ? `/school/${school.slug}` : '/'
  const currentRouteItem = allNavItems
    .slice()
    .sort((left, right) => right.to.length - left.to.length)
    .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
  const currentNavItem = navItems
    .slice()
    .sort((left, right) => right.to.length - left.to.length)
    .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
  const pageTitle = currentNavItem?.label ?? 'Рабочий день'
  const setupSteps = school ? [
    { label: 'Филиал', done: db.branches.bySchool(school.id).length > 0, to: `${basePath}/branches` },
    { label: 'Инструктор', done: db.instructors.bySchool(school.id).some((item) => item.isActive), to: `${basePath}/instructors` },
    { label: 'Окна', done: db.slots.bySchool(school.id).some((slot) => slot.status === 'available' && new Date(`${slot.date}T${slot.time}:00`) > new Date()), to: `${basePath}/schedule` },
    { label: 'Ученик', done: db.students.bySchool(school.id).length > 0, to: `${basePath}/students` },
  ] : []
  const nextSetupStep = setupSteps.find((step) => !step.done)
  const quickResults = (() => {
    if (!school || quickSearch.trim().length < 2) return []
    const query = quickSearch.trim().toLowerCase()
    return [
      ...filterStudents(db.students.bySchool(school.id))
        .filter((student) => student.name.toLowerCase().includes(query) || student.phone.includes(query) || student.email.toLowerCase().includes(query))
        .slice(0, 4)
        .map((student) => ({ id: `student-${student.id}`, label: student.name, meta: student.phone, to: `${basePath}/students/${student.id}` })),
      ...filterInstructors(db.instructors.bySchool(school.id))
        .filter((instructor) => instructor.name.toLowerCase().includes(query) || instructor.phone.includes(query))
        .slice(0, 3)
        .map((instructor) => ({ id: `instructor-${instructor.id}`, label: instructor.name, meta: 'Инструктор', to: `${basePath}/instructors/${instructor.id}` })),
      ...filterBranches(db.branches.bySchool(school.id))
        .filter((branch) => branch.name.toLowerCase().includes(query) || branch.address.toLowerCase().includes(query))
        .slice(0, 2)
        .map((branch) => ({ id: `branch-${branch.id}`, label: branch.name, meta: 'Филиал', to: `${basePath}/branches` })),
    ].slice(0, 8)
  })()

  const signOut = async () => {
    const sessionToken = getAccessSecret('admin')
    await closeSupabaseStaffSession(staffContext.role, sessionToken)
    clearAccess('admin')
    navigate('/')
  }

  if (mode === 'workspace' && (!staffContext.schoolId || !school)) {
    return <SchoolRequiredState onSignOut={signOut} />
  }

  const accessDenied = mode === 'workspace' && Boolean(currentRouteItem && !currentNavItem)
  const fallbackPath = navItems[0]?.to ?? basePath

  return (
    <div className="v-admin-shell vroom-admin-shell flex h-dvh overflow-hidden bg-[var(--admin-bg)] text-[#111315]">
      <aside className="hidden w-[272px] shrink-0 lg:block">
        <Sidebar navItems={navItems} basePath={basePath} onCustomize={() => setMenuSettingsOpen(true)} />
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#111827]/28 backdrop-blur-sm"
            aria-label="Закрыть меню"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative h-full w-[286px] max-w-[86vw] shadow-2xl">
            <Sidebar navItems={navItems} basePath={basePath} onClose={() => setSidebarOpen(false)} onCustomize={() => setMenuSettingsOpen(true)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/70 bg-[rgba(255,255,255,0.72)] px-3 shadow-[0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-2xl lg:h-16 lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#111827]/[0.07] bg-white/70 text-[#667381] hover:bg-white hover:text-[#111315] lg:hidden"
            aria-label="Открыть меню"
          >
            <Menu width={20} height={20} />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <BrandMark variant="dark" size="sm" className="lg:hidden" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[#111315]">{pageTitle}</p>
              <p className="truncate text-[11px] font-medium text-[#687381]">
                {branchScoped ? `Администратор филиала · ${staffContext.name ?? school?.name ?? 'рабочее пространство'}` : school?.name ?? 'Рабочее пространство автошколы'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { if (school) window.open(publicPath, '_blank') }}
            className="hidden min-h-10 items-center gap-2 rounded-full border border-[#111827]/[0.07] bg-white/70 px-3 text-[13px] font-medium text-[#2A2D2F] hover:border-[#111827]/[0.14] hover:bg-white xl:inline-flex"
          >
            <ExternalLink width={16} height={16} />
            Сайт
          </button>
          {school && nextSetupStep ? (
            <button
              type="button"
              onClick={() => navigate(nextSetupStep.to)}
              className="hidden min-h-10 items-center gap-2 rounded-full border border-[#315A7C]/15 bg-[#EAF3FF]/80 px-3 text-[13px] font-medium text-[#315A7C] hover:bg-white lg:inline-flex"
              title="Открыть следующий шаг настройки"
            >
              {setupSteps.filter((step) => step.done).length}/{setupSteps.length} · {nextSetupStep.label}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setMenuSettingsOpen(true)}
            className="hidden min-h-10 items-center gap-2 rounded-full border border-[#111827]/[0.07] bg-white/70 px-3 text-[13px] font-medium text-[#2A2D2F] hover:border-[#111827]/[0.14] hover:bg-white lg:inline-flex"
          >
            <SlidersHorizontal width={16} height={16} />
            Меню
          </button>
          <div className="relative hidden min-w-[220px] max-w-[360px] flex-[0_1_360px] md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8D98A4]" />
            <input
              value={quickSearch}
              onChange={(event) => setQuickSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setQuickSearch('')
                if (event.key === 'Enter' && quickResults[0]) {
                  navigate(quickResults[0].to)
                  setQuickSearch('')
                }
              }}
              placeholder="Поиск"
              className="h-10 w-full rounded-full border border-[#111827]/[0.07] bg-white/70 pl-9 pr-9 text-[13px] font-medium text-[#111315] outline-none focus:border-[#111827]/[0.2] focus:bg-white"
            />
            {quickSearch ? (
              <button type="button" onClick={() => setQuickSearch('')} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-[#8D98A4] hover:bg-[#EEF2F5] hover:text-[#111315]">×</button>
            ) : null}
            {quickSearch.trim().length >= 2 ? (
              <div className="absolute right-0 top-12 z-30 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-[22px] border border-white/70 bg-white/90 shadow-[var(--shadow-dark)] backdrop-blur-2xl">
                {quickResults.length === 0 ? (
                  <div className="p-3 text-[13px] font-medium text-[#687381]">Ничего не найдено</div>
                ) : (
                  quickResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { navigate(item.to); setQuickSearch('') }}
                      className="block w-full border-b border-[#111827]/[0.06] px-3 py-3 text-left last:border-b-0 hover:bg-[#EAF3FF]/60"
                    >
                      <span className="block truncate text-[14px] font-semibold text-[#111315]">{item.label}</span>
                      <span className="mt-0.5 block truncate text-[12px] font-medium text-[#687381]">{item.meta}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#111827]/[0.07] bg-white/70 text-[#D1433C] hover:border-[#D1433C]/20 hover:bg-[#FEF2F2]"
            aria-label="Выйти"
          >
            <LogOut width={18} height={18} />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0">
          <Suspense fallback={<AdminContentLoader />}>
            <div key={location.pathname} className="admin-route-stage">
              {accessDenied ? <AdminAccessDenied to={fallbackPath} /> : <Outlet />}
            </div>
          </Suspense>
        </main>

        <nav className="admin-mobile-nav fixed bottom-0 left-0 right-0 z-40 border-t border-white/70 bg-white/85 backdrop-blur-2xl lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)] pt-1">
            {mobileNavItems.slice(0, 4).map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === basePath}
                  className={({ isActive }) =>
                    `admin-mobile-nav-item flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium transition ${
                      isActive ? 'is-active bg-[#EAF3FF] text-[#111315]' : 'text-[#7A8490]'
                    }`
                  }
                >
                  <Icon width={20} height={20} strokeWidth={2.4} />
                  <span className="max-w-full truncate">{item.label}</span>
                </NavLink>
              )
            })}
            <button
              type="button"
              onClick={() => setMenuSettingsOpen(true)}
              className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium text-[#7A8490]"
            >
              <SlidersHorizontal width={20} height={20} strokeWidth={2.4} />
              <span className="max-w-full truncate">Разделы</span>
            </button>
          </div>
        </nav>
      </div>
      {school ? (
        <AdminMenuSettingsModal
          open={menuSettingsOpen}
          schoolId={school.id}
          items={permittedNavItems}
          enabledIds={enabledIds}
          onClose={() => setMenuSettingsOpen(false)}
          onSaved={() => setMenuVersion((value) => value + 1)}
          version={menuVersion}
        />
      ) : null}
    </div>
  )
}

function AdminMenuSettingsModal({
  open,
  schoolId,
  items,
  enabledIds,
  onClose,
  onSaved,
}: {
  open: boolean
  schoolId: string
  items: Array<NavItem & AdminNavDefinition>
  enabledIds: AdminNavItemId[]
  onClose: () => void
  onSaved: () => void
  version: number
}) {
  const [draft, setDraft] = useState<AdminNavItemId[]>(enabledIds)

  useEffect(() => {
    if (open) setDraft(enabledIds)
  }, [enabledIds, open])

  const toggle = (id: AdminNavItemId) => {
    setDraft((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const save = () => {
    saveEnabledAdminNavIds(schoolId, draft)
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Разделы" size="md">
      <div className="border-b border-[#111827]/[0.07] bg-[#F8FAFC] px-5 py-3 text-[13px] font-medium leading-5 text-[#687381]">
        Оставьте только рабочие разделы. Основные разделы закреплены, остальное можно включать по мере запуска.
      </div>
      <div className="grid max-h-[min(64vh,560px)] gap-2 overflow-y-auto p-4 sm:p-5">
          {items.map((item) => (
            <label key={item.id} className="flex items-start gap-3 rounded-[20px] border border-white/70 bg-white/75 p-3 shadow-[var(--shadow-card)] backdrop-blur-2xl">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[#111827]"
                checked={item.required || draft.includes(item.id as AdminNavItemId)}
                disabled={item.required}
                onChange={() => toggle(item.id as AdminNavItemId)}
              />
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-[#111315]">{item.label}</span>
                <span className="mt-0.5 block text-[12px] leading-5 text-[#687381]">{item.required ? 'Основной раздел' : item.description}</span>
              </span>
            </label>
          ))}
      </div>
      <div className="flex shrink-0 gap-2 border-t border-[#111827]/[0.07] bg-white/95 p-4 backdrop-blur-2xl">
        <button type="button" onClick={onClose} className="v-admin-button-secondary flex-1">Отмена</button>
        <button type="button" onClick={save} className="v-admin-button flex-1">Сохранить</button>
      </div>
    </Modal>
  )
}

export default AdminLayout
