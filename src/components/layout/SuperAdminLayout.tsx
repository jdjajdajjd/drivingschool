import { Outlet, useNavigate } from 'react-router-dom'
import { Building2, Car, LogOut, Menu, Plus, Shield } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import { NavLink } from 'react-router-dom'
import { ADMIN_BASE_PATH, SUPERADMIN_BASE_PATH, clearAccess } from '../../services/accessControl'

const NAV = [
  { to: SUPERADMIN_BASE_PATH, label: 'Обзор', icon: Shield, end: true },
  { to: `${SUPERADMIN_BASE_PATH}/schools`, label: 'Автошколы', icon: Building2 },
  { to: `${SUPERADMIN_BASE_PATH}/schools/new`, label: 'Создать школу', icon: Plus },
]

export function SuperAdminLayout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="shell">
      <div className="md:hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b rgba(0,0,0,0.06) bg-white/92 px-4 py-3 backdrop-blur-xl">
          <button
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border rgba(0,0,0,0.06) bg-white #6F747A shadow-[0_20px_60px_rgba(15,20,25,0.08)]"
            aria-label="Открыть меню"
          >
            <Menu size={18} />
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent shadow-[0_20px_60px_rgba(15,20,25,0.08)]">
              <Car size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold #111418">DriveDesk</span>
          </button>
        </header>
      </div>

      <div
        className={cn(
          'fixed inset-0 z-30 bg-warm-main/20 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r rgba(0,0,0,0.06) bg-white/95  backdrop-blur-xl transition-transform duration-200 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b rgba(0,0,0,0.06) px-5 py-5">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent shadow-[0_20px_60px_rgba(15,20,25,0.08)]">
              <Car size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold #111418">DriveDesk</p>
              <p className="text-xs font-medium #9EA3A8">Superadmin</p>
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
                  'flex min-h-11 items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-colors',
                  isActive ? 'rgba(246,184,77,0.12) #C97F10 shadow-[0_20px_60px_rgba(15,20,25,0.08)]' : '#6F747A hover:#F4F5F6 hover:#111418',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? '#C97F10' : '#9EA3A8'} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t rgba(0,0,0,0.06) px-3 py-4">
          <button
            onClick={() => navigate(ADMIN_BASE_PATH)}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold #6F747A transition hover:#F4F5F6 hover:#111418"
          >
            <Building2 size={15} className="#9EA3A8" />
            Открыть админку школы
          </button>
          <button
            onClick={() => {
              clearAccess('superadmin')
              navigate('/')
            }}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm #E5534B transition hover:#FEF2F2"
          >
            <LogOut size={15} />
            Выйти из суперадминки
          </button>
        </div>
      </aside>

      <main className="min-h-screen md:ml-[280px]">
        <Outlet />
      </main>
    </div>
  )
}
