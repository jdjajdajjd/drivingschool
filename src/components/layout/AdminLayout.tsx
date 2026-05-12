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
import { BrandMark } from './BrandMark'

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
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,#10201F_0%,#123043_48%,#101418_100%)] text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <BrandMark variant="dark" size="md" className="border border-white/10 shadow-[0_14px_34px_rgba(0,0,0,0.34)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black text-white">{school?.name ?? 'Автошкола'}</p>
          <p className="text-[12px] font-semibold text-[#9FE0D0]">директорский пульт</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Закрыть меню"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[11px] font-black uppercase text-white/35">Операции</p>
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
                      ? 'bg-[#E7F6F0] text-[#10201F] shadow-[0_14px_34px_rgba(0,0,0,0.20)]'
                      : 'text-white/72 hover:bg-white/10 hover:text-white'
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
    <div className="v-admin-shell flex h-dvh overflow-hidden bg-[var(--admin-bg)] text-[#111418]">
      <aside className="hidden w-[272px] shrink-0 bg-[#10201F] lg:block">
        <Sidebar />
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#101418]/45"
            aria-label="Закрыть меню"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative h-full w-[286px] max-w-[86vw] shadow-2xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[#DCE2E8] bg-white/96 px-3 backdrop-blur lg:h-16 lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[#DCE2E8] text-[#59626D] hover:bg-[#F3F5F7] hover:text-[#111418] lg:hidden"
            aria-label="Открыть меню"
          >
            <Menu size={20} />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <BrandMark variant="light" size="sm" className="border border-[#DCE2E8] lg:hidden" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-black text-[#111418]">vroom.today</p>
              <p className="truncate text-[11px] font-semibold text-[#66717D]">{school?.name ?? 'Рабочее пространство автошколы'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { if (school) window.location.href = publicPath }}
            className="hidden min-h-10 items-center gap-2 rounded-lg border border-[#DCE2E8] bg-white px-3 text-[13px] font-bold text-[#38424D] hover:border-[#B8C2CC] hover:text-[#111418] sm:inline-flex"
          >
            <ExternalLink size={16} />
            Сайт
          </button>
          <button
            type="button"
            onClick={signOut}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[#DCE2E8] bg-white text-[#B42318] hover:border-[#F2B8B5] hover:bg-[#FFF3F2]"
            aria-label="Выйти"
          >
            <LogOut size={18} />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#DCE2E8] bg-white/96 backdrop-blur lg:hidden">
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
                      isActive ? 'bg-[#10201F] text-white shadow-[0_10px_24px_rgba(14,124,102,0.18)]' : 'text-[#7A8490]'
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
