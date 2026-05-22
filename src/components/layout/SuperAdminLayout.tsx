import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Building, LogOut, Menu, Plus, ShieldCheck as Shield } from '@/components/icons/lucide'
import { cn } from '../../lib/utils'
import { SUPERADMIN_BASE_PATH, WORKSPACE_ADMIN_LOGIN_PATH, clearAccess, getAccessSecret } from '../../services/accessControl'
import { closeSupabaseStaffSession } from '../../services/staffSessionService'
import { BrandMark } from './BrandMark'

const Building2 = Building

const NAV = [
  { to: SUPERADMIN_BASE_PATH, label: 'Обзор', icon: Shield, end: true },
  { to: `${SUPERADMIN_BASE_PATH}/schools`, label: 'Автошколы', icon: Building2 },
  { to: `${SUPERADMIN_BASE_PATH}/schools/new`, label: 'Создать школу', icon: Plus },
]

export function SuperAdminLayout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="v-superadmin-shell min-h-screen">
      <div className="md:hidden">
        <header className="v-superadmin-mobile-header sticky top-0 z-20 flex items-center justify-between px-4 py-3 backdrop-blur-2xl">
          <button
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#111827]/[0.07] bg-white/75 text-[#667381] shadow-[var(--shadow-card)]"
            aria-label="Открыть меню"
          >
            <Menu width={18} height={18} />
          </button>
          <button onClick={() => navigate('/')} className="flex items-center">
            <BrandMark size="sm" />
          </button>
        </header>
      </div>

      <div
        className={cn(
          'fixed inset-0 z-30 bg-[#111827]/25 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        className={cn(
          'v-superadmin-sidebar fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col transition-transform duration-200 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b border-[#111827]/[0.06] px-5 py-5">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <BrandMark size="md" />
            <div className="text-left">
              <p className="text-xs font-medium text-[#687381]">Операторская</p>
            </div>
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'v-superadmin-nav-link flex min-h-11 items-center gap-3 px-3.5 py-3 text-sm font-semibold transition-colors',
                  isActive ? 'is-active text-white' : 'text-[#9CA8B6] hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon width={16} height={16} className={isActive ? 'text-[#111315]' : 'text-[#9AA6B2]'} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[#111827]/[0.06] px-3 py-4">
          <button
            onClick={() => window.open(WORKSPACE_ADMIN_LOGIN_PATH, '_blank')}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-[#667381] transition hover:bg-white/70 hover:text-[#111315]"
          >
            <Building2 width={15} height={15} className="text-[#9AA6B2]" />
            Вход админа
          </button>
          <button
            onClick={async () => {
              const sessionToken = getAccessSecret('superadmin')
              await closeSupabaseStaffSession('superadmin', sessionToken)
              clearAccess('superadmin')
              navigate('/')
            }}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm text-[#D1433C] transition hover:bg-[#FEF2F2]"
          >
            <LogOut width={15} height={15} />
            Выйти
          </button>
        </div>
      </aside>

      <main className="v-superadmin-main min-h-screen md:ml-[280px]">
        <Outlet />
      </main>
    </div>
  )
}
