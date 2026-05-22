import { Suspense, useEffect, useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Medal, GraphUp, Building, Calendar, Car, OpenNewWindow, Page, Dashboard, LogOut, Menu, Settings, ShieldCheck, UserBadgeCheck, Group, Wallet, Xmark, Clock, Inbox, CheckCircle } from '@/components/icons/lucide'
const Award = Medal
const BarChart3 = GraphUp
const Building2 = Building
const CalendarDays = Calendar
const ExternalLink = OpenNewWindow
const FileText = Page
const LayoutDashboard = Dashboard
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
  BOOKING_TOOL_ADMIN_NAV_IDS,
  getEnabledAdminNavIds,
  type AdminNavDefinition,
  type AdminNavItemId,
} from '../../services/adminPanelPreferences'
import { BrandMark } from './BrandMark'
import { AdminAccessDenied } from './AdminAccessDenied'
import { SchoolRequiredState } from './SchoolRequiredState'
import { AdminContentLoader, LoadingScreen } from '../ui/loader'

function permission(value: StaffPermission): StaffPermission {
  return value
}

type AdminNavItem = AdminNavDefinition & {
  to: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

function buildNavItems(basePath: string): AdminNavItem[] {
  return [
    { id: 'today', to: basePath, label: 'Сегодня', description: 'Что происходит сегодня.', icon: LayoutDashboard, permission: permission('schedule.manage'), required: true },
    { id: 'slots', to: `${basePath}/slots`, label: 'Окна', description: 'Сборка сетки и контроль свободного времени.', icon: Clock, permission: permission('schedule.manage'), required: false },
    { id: 'students', to: `${basePath}/students`, label: 'Ученики', description: 'Кому доступна самостоятельная запись.', icon: Users, permission: permission('students.manage'), required: true },
    { id: 'schedule', to: `${basePath}/schedule`, label: 'Запись', description: 'Окна, занятия и переносы.', icon: CalendarDays, permission: permission('schedule.manage'), required: true },
    { id: 'bookings', to: `${basePath}/bookings`, label: 'Заявки', description: 'Звонки, новые обращения и ручная запись.', icon: Inbox, permission: permission('schedule.manage'), required: true },
    { id: 'instructors', to: `${basePath}/instructors`, label: 'Инструкторы', description: 'Кто проводит занятия и открывает окна.', icon: UserCog, permission: permission('branches.manage'), required: true },
    { id: 'branches', to: `${basePath}/branches`, label: 'Филиалы', description: 'Где проходят занятия.', icon: Building2, permission: permission('branches.manage'), required: false },
    { id: 'cars', to: `${basePath}/cars`, label: 'Машины', description: 'Автопарк, статусы, страховки.', icon: Car, permission: permission('vehicles.manage'), required: false },
    { id: 'payments', to: `${basePath}/payments`, label: 'Оплаты', description: 'Задолженности, поступления и частичные оплаты.', icon: Wallet, permission: permission('finance.view'), required: false },
    { id: 'documents', to: `${basePath}/documents`, label: 'Документы', description: 'Договоры, справки и проверки.', icon: FileText, permission: permission('documents.manage'), required: false },
    { id: 'exams', to: `${basePath}/exams`, label: 'Экзамены', description: 'Внутренние и ГИБДД экзамены.', icon: Award, permission: permission('exams.manage'), required: false },
    { id: 'reports', to: `${basePath}/reports`, label: 'Отчёты', description: 'Сводки и показатели школы.', icon: BarChart3, permission: permission('reports.view'), required: false },
    { id: 'launch', to: `${basePath}/launch`, label: 'Запуск', description: 'Готовность школы к работе.', icon: CheckCircle, permission: permission('reports.view'), required: false },
    { id: 'settings', to: `${basePath}/settings`, label: 'Ещё', description: 'Инструкторы, филиалы, часы и ссылка для учеников.', icon: Settings, permission: permission('settings.manage'), required: true },
    { id: 'users', to: `${basePath}/users`, label: 'Команда', description: 'Сотрудники, роли и филиалы.', icon: ShieldCheck, permission: permission('staff.manage'), required: false },
  ]
}

type NavItem = ReturnType<typeof buildNavItems>[number]

function Sidebar({ navItems, basePath, onClose }: { navItems: NavItem[]; basePath: string; onClose?: () => void }) {
  const coreItems = navItems.filter((item) => ['today', 'students', 'schedule', 'bookings', 'settings'].includes(item.id))
  return (
    <div className="flex h-full flex-col border-r border-[#E5EAF1] bg-white text-[#111315]">
      <div className="flex items-center justify-between gap-3 border-b border-[#EEF2F6] px-4 py-4">
        <Link to={basePath} onClick={onClose} className="flex min-w-0 flex-col items-start text-left" aria-label="На главный экран кабинета">
          <BrandMark variant="dark" size="md" />
          <span className="mt-1 text-[12px] font-medium text-[#667085]">кабинет записи</span>
        </Link>
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
        <div className="space-y-1">
          {coreItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === basePath}
                onClick={onClose}
                className={({ isActive }) =>
                  `admin-sidebar-link flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-[14px] font-medium transition ${
                    isActive
                      ? 'is-active bg-[#EAF3FF] text-[#111827] shadow-[inset_0_0_0_1px_rgba(10,132,255,0.12)]'
                      : 'text-[#667085] hover:bg-[#F5F7FA] hover:text-[#111827]'
                  }`
                }
              >
                <Icon width={19} height={19} strokeWidth={2.1} aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function getAccessBlockReason(school: { accessStatus?: string; accessPaidUntil?: string; isActive?: boolean }): 'blocked' | 'overdue' | null {
  if (school.isActive === false || school.accessStatus === 'blocked') return 'blocked'
  if (school.accessStatus === 'overdue') return 'overdue'
  if (school.accessPaidUntil) {
    const paidUntil = new Date(school.accessPaidUntil + 'T23:59:59')
    if (Number.isFinite(paidUntil.getTime()) && paidUntil < new Date()) return 'overdue'
  }
  return null
}

function getAccessNotice(school: { accessStatus?: string; accessPaidUntil?: string }): { tone: 'warning' | 'info'; text: string } | null {
  if (school.accessStatus === 'expires_soon') {
    return { tone: 'warning', text: school.accessPaidUntil ? 'Доступ оплачен до ' + school.accessPaidUntil + '. Продление фиксирует оператор vroom после перевода.' : 'Доступ скоро закончится. Продление фиксирует оператор vroom после перевода.' }
  }
  if (school.accessStatus === 'trial') {
    return { tone: 'info', text: school.accessPaidUntil ? 'Пробный доступ до ' + school.accessPaidUntil + '. После оплаты оператор переведет школу в активные.' : 'Пробный доступ. После оплаты оператор переведет школу в активные.' }
  }
  return null
}

function AccessBlockedState({ schoolName, reason, onSignOut }: { schoolName: string; reason: 'blocked' | 'overdue'; onSignOut: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--admin-bg)] p-4 text-[#111315]">
      <section className="w-full max-w-[520px] rounded-[28px] border border-[rgba(255,59,48,0.16)] bg-white p-5 shadow-[var(--shadow-card)] md:p-7">
        <span className="v-admin-pill v-tone-danger">{reason === 'blocked' ? 'Доступ остановлен' : 'Доступ просрочен'}</span>
        <h1 className="mt-4 text-[28px] font-semibold leading-none text-[#111827]">Кабинет {schoolName} сейчас недоступен</h1>
        <p className="mt-3 text-[14px] font-medium leading-6 text-[#667085]">
          {reason === 'blocked' ? 'Оператор vroom заблокировал кабинет вручную. Данные школы сохранены, но рабочие действия закрыты.' : 'Срок оплаты закончился. После ручного перевода оператор vroom продлит доступ, данные школы сохранятся.'}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onSignOut} className="v-admin-button flex-1 justify-center">Выйти</button>
        </div>
      </section>
    </div>
  )
}

export function AdminLayout({ mode = 'workspace', basePath = ADMIN_BASE_PATH }: { mode?: 'demo' | 'workspace'; basePath?: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const staffContext = getWorkspaceStaffContext()
  const branchScoped = mode === 'workspace' && isBranchAdminContext()
  const allNavItems = buildNavItems(basePath)
  const school = ready ? db.schools.currentAdmin() : null
  const enabledIds = school ? getEnabledAdminNavIds(school.id, allNavItems) : []
  const bookingToolNavIds = new Set(BOOKING_TOOL_ADMIN_NAV_IDS)
  const permittedRouteItems = allNavItems.filter((item) => {
    if (mode === 'demo') return true
    return roleHasPermission(staffContext.role, item.permission)
  })
  const permittedNavItems = permittedRouteItems.filter((item) => bookingToolNavIds.has(item.id as AdminNavItemId))
  const navItems = permittedNavItems.filter((item) => item.required || enabledIds.includes(item.id as AdminNavItemId))
  const mobileNavItems = navItems.filter((item) =>
    [basePath, `${basePath}/schedule`, `${basePath}/students`, `${basePath}/bookings`, `${basePath}/settings`].includes(item.to),
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
  const currentPermittedRouteItem = permittedRouteItems
    .slice()
    .sort((left, right) => right.to.length - left.to.length)
    .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
  const pageTitle = currentNavItem?.label ?? currentRouteItem?.label ?? 'Рабочий день'
  const signOut = async () => {
    const sessionToken = getAccessSecret('admin')
    await closeSupabaseStaffSession(staffContext.role, sessionToken)
    clearAccess('admin')
    navigate('/')
  }

  if (mode === 'workspace' && (!staffContext.schoolId || !school)) {
    return <SchoolRequiredState onSignOut={signOut} />
  }

  const accessBlockReason = mode === 'workspace' && school ? getAccessBlockReason(school) : null
  const accessNotice = mode === 'workspace' && school ? getAccessNotice(school) : null

  if (mode === 'workspace' && school && accessBlockReason) {
    return <AccessBlockedState schoolName={school.name} reason={accessBlockReason} onSignOut={signOut} />
  }

  const accessDenied = mode === 'workspace' && Boolean(currentRouteItem && !currentPermittedRouteItem)
  const fallbackPath = navItems[0]?.to ?? basePath

  return (
    <div className="v-admin-shell vroom-admin-shell flex h-dvh overflow-hidden bg-[var(--admin-bg)] text-[#111315]">
      <a href="#admin-main" className="v-skip-link">К содержимому</a>
      <aside className="hidden w-[272px] shrink-0 lg:block">
        <Sidebar navItems={navItems} basePath={basePath} />
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
            <Sidebar navItems={navItems} basePath={basePath} onClose={() => setSidebarOpen(false)} />
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

          {school ? (
            <Link
              to={publicPath}
              target="_blank"
              rel="noreferrer"
              className="hidden min-h-10 items-center gap-2 rounded-full border border-[#111827]/[0.07] bg-white/70 px-3 text-[13px] font-medium text-[#2A2D2F] hover:border-[#111827]/[0.14] hover:bg-white md:inline-flex"
            >
              <ExternalLink width={16} height={16} aria-hidden="true" />
              Ссылка ученика
            </Link>
          ) : null}
          <button
            type="button"
            onClick={signOut}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#111827]/[0.07] bg-white/70 text-[#D1433C] hover:border-[#D1433C]/20 hover:bg-[#FEF2F2]"
            aria-label="Выйти"
          >
            <LogOut width={18} height={18} />
          </button>
        </header>

        <main id="admin-main" className="min-h-0 flex-1 overflow-y-auto pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0">
          {accessNotice ? (
            <div className={'mx-3 mt-3 rounded-[18px] border px-4 py-3 text-[13px] font-semibold md:mx-5 ' + (accessNotice.tone === 'warning' ? 'border-[#F6D58B] bg-[#FFF8E8] text-[#8A5A00]' : 'border-[#B8D8FF] bg-[#EEF7FF] text-[#075EBC]')}>
              {accessNotice.text}
            </div>
          ) : null}
          <Suspense fallback={<AdminContentLoader />}>
            <div key={location.pathname} className="admin-route-stage">
              {accessDenied ? <AdminAccessDenied to={fallbackPath} /> : <Outlet />}
            </div>
          </Suspense>
        </main>

        <nav className="admin-mobile-nav fixed bottom-0 left-0 right-0 z-40 border-t border-white/70 bg-white/85 backdrop-blur-2xl lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)] pt-1">
            {mobileNavItems.slice(0, 5).map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === basePath}
                  className={({ isActive }) =>
                    `admin-mobile-nav-item flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium transition ${
                      isActive ? 'text-[#0A84FF]' : 'text-[#7A8490]'
                    }`
                  }
                >
                  <Icon width={20} height={20} strokeWidth={2.4} aria-hidden="true" />
                  <span className="max-w-full truncate">{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}

export default AdminLayout
