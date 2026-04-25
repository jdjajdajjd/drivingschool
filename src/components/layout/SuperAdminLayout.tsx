import { Outlet, useNavigate } from 'react-router-dom'
import { Building2, Car, Menu, Plus, Shield } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/superadmin', label: 'Обзор', icon: Shield, end: true },
  { to: '/superadmin/schools', label: 'Автошколы', icon: Building2 },
  { to: '/superadmin/schools/new', label: 'Создать автошколу', icon: Plus },
]

export function SuperAdminLayout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="md:hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur-xl">
          <button
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-700"
          >
            <Menu size={18} />
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-forest-700 shadow-soft">
              <Car size={16} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-stone-900">DriveDesk</span>
          </button>
        </header>
      </div>

      <div
        className={cn(
          'fixed inset-0 z-30 bg-stone-950/20 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-stone-200 bg-white transition-transform duration-200 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b border-stone-100 px-5 py-5">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-700 shadow-soft">
              <Car size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-stone-900">DriveDesk</p>
              <p className="text-xs text-stone-400">Superadmin</p>
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
                  'flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-forest-50 text-forest-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-forest-700' : 'text-stone-400'} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-stone-100 px-3 py-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <Building2 size={15} className="text-stone-400" />
            Открыть админку школы
          </button>
        </div>
      </aside>

      <main className="min-h-screen md:ml-[280px]">
        <Outlet />
      </main>
    </div>
  )
}
