import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Award,
  BarChart3,
  Building2,
  CalendarDays,
  Car,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { ADMIN_BASE_PATH, clearAccess } from '../../services/accessControl'
import { setDataNamespace } from '../../services/storage'
import { seedIfNeeded } from '../../services/seed'
import { syncSupabaseSchoolToLocalDb } from '../../services/supabaseSync'
import { db } from '../../services/storage'

const navItems = [
  { to: ADMIN_BASE_PATH, label: 'Сегодня', icon: LayoutDashboard },
  { to: `${ADMIN_BASE_PATH}/schedule`, label: 'Расписание', icon: CalendarDays },
  { to: `${ADMIN_BASE_PATH}/students`, label: 'Ученики', icon: Users },
  { to: `${ADMIN_BASE_PATH}/instructors`, label: 'Инструкторы', icon: UserCog },
  { to: `${ADMIN_BASE_PATH}/cars`, label: 'Машины', icon: Car },
  { to: `${ADMIN_BASE_PATH}/branches`, label: 'Филиалы', icon: Building2 },
  { to: `${ADMIN_BASE_PATH}/payments`, label: 'Оплаты', icon: Wallet },
  { to: `${ADMIN_BASE_PATH}/documents`, label: 'Документы', icon: FileText },
  { to: `${ADMIN_BASE_PATH}/exams`, label: 'Экзамены', icon: Award },
  { to: `${ADMIN_BASE_PATH}/reports`, label: 'Отчеты', icon: BarChart3 },
  { to: `${ADMIN_BASE_PATH}/settings`, label: 'Настройки', icon: Settings },
  { to: `${ADMIN_BASE_PATH}/users`, label: 'Пользователи', icon: ShieldCheck },
]

const mobileNavItems = navItems.filter((item) =>
  [ADMIN_BASE_PATH, `${ADMIN_BASE_PATH}/schedule`, `${ADMIN_BASE_PATH}/students`, `${ADMIN_BASE_PATH}/payments`, `${ADMIN_BASE_PATH}/reports`].includes(item.to),
)

function Sidebar({ onClose }: { onClose?: () => void }) {
  const school = db.schools.all()[0]

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-950 text-[15px] font-black text-white">
          {(school?.name ?? 'V').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black text-gray-950">{school?.name ?? 'Автошкола'}</p>
          <p className="text-[12px] font-semibold text-gray-500">директорская панель</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-950 lg:hidden"
            aria-label="Закрыть меню"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-[0.08em] text-gray-400">Разделы</p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === ADMIN_BASE_PATH}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-lg px-3 text-[14px] font-bold transition ${
                    isActive
                      ? 'bg-gray-950 text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
                  }`
                }
              >
                <Icon size={19} strokeWidth={2.35} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export function AdminLayout() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    let disposed = false
    setDataNamespace('workspace')
    seedIfNeeded({ mode: 'workspace' })
    syncSupabaseSchoolToLocalDb('virazh')
      .catch(() => undefined)
      .finally(() => {
        if (!disposed) setReady(true)
      })
    const fallback = window.setTimeout(() => setReady(true), 4000)
    return () => {
      disposed = true
      window.clearTimeout(fallback)
    }
  }, [])

  if (!ready) return <div className="v-admin-shell min-h-dvh" />

  const school = db.schools.all()[0]
  const publicPath = school ? `/school/${school.slug}` : '/'

  const signOut = () => {
    clearAccess('admin')
    navigate('/')
  }

  return (
    <div className="v-admin-shell flex h-dvh overflow-hidden bg-gray-50 text-gray-950">
      <aside className="hidden w-[268px] shrink-0 border-r border-gray-100 bg-white lg:block">
        <Sidebar />
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-gray-950/35"
            aria-label="Закрыть меню"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative h-full w-[286px] max-w-[86vw] shadow-2xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-gray-100 bg-white/95 px-3 backdrop-blur lg:h-16 lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-gray-100 text-gray-600 hover:bg-gray-50 hover:text-gray-950 lg:hidden"
            aria-label="Открыть меню"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-black text-gray-950">vroom.today</p>
            <p className="truncate text-[11px] font-semibold text-gray-500">{school?.name ?? 'Рабочее пространство автошколы'}</p>
          </div>

          <button
            type="button"
            onClick={() => { if (school) window.location.href = publicPath }}
            className="hidden min-h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] font-bold text-gray-700 hover:border-gray-300 hover:text-gray-950 sm:inline-flex"
          >
            <ExternalLink size={16} />
            Сайт
          </button>
          <button
            type="button"
            onClick={signOut}
            className="grid h-10 w-10 place-items-center rounded-lg border border-gray-200 bg-white text-red-600 hover:border-red-200 hover:bg-red-50"
            aria-label="Выйти"
          >
            <LogOut size={18} />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)] pt-1">
            {mobileNavItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === ADMIN_BASE_PATH}
                  className={({ isActive }) =>
                    `flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-black transition ${
                      isActive ? 'text-gray-950' : 'text-gray-400'
                    }`
                  }
                >
                  <Icon size={20} strokeWidth={2.4} />
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
