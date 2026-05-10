import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ADMIN_BASE_PATH, clearAccess } from '../../services/accessControl'
import { setDataNamespace } from '../../services/storage'
import { seedIfNeeded } from '../../services/seed'
import { syncSupabaseSchoolToLocalDb } from '../../services/supabaseSync'
import { db } from '../../services/storage'

const navItems = [
  {
    to: `${ADMIN_BASE_PATH}/today`,
    label: 'Сегодня',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: `${ADMIN_BASE_PATH}/schedule`,
    label: 'Расписание',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: `${ADMIN_BASE_PATH}/bookings`,
    label: 'Записи',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: `${ADMIN_BASE_PATH}/people`,
    label: 'Люди',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    to: `${ADMIN_BASE_PATH}/school`,
    label: 'Школа',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    to: `${ADMIN_BASE_PATH}/money`,
    label: 'Деньги',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 7v10M15 9.5a3 3 0 100 5h-3a3 3 0 010-5c0-1.5 1-2 2-1.5s1 1 0 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let disposed = false
    setDataNamespace('workspace')
    seedIfNeeded({ mode: 'workspace' })
    syncSupabaseSchoolToLocalDb('workspace')
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

  return (
    <div className="v-admin-shell flex min-h-dvh flex-col">
      {/* Top bar - always visible on mobile */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/95 backdrop-blur-sm px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-ink text-white">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 17h14M5 17l3-8h8l3 8M9 9V6m6 3V6M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <span className="block text-[16px] font-black tracking-[-0.05em] text-ink">vroom</span>
            <span className="block text-[11px] font-bold text-text-muted">кабинет школы</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (school) window.location.href = publicPath }}
            className="flex min-h-10 items-center gap-1.5 rounded-[12px] border border-border bg-surface px-3 text-[12px] font-black text-ink"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Сайт
          </button>
          <button
            onClick={() => { clearAccess('admin'); navigate('/') }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-border bg-surface text-error"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-auto pb-[calc(72px+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      {/* Bottom tab bar - mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === `${ADMIN_BASE_PATH}/today`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-2 transition-colors ${
                  isActive ? 'text-ink' : 'text-text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`transition-colors ${isActive ? 'text-ink' : 'text-text-muted'}`}>
                    {item.icon}
                  </span>
                  <span className={`text-[10px] font-bold ${isActive ? 'text-ink' : 'text-text-muted'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-1 h-1 w-5 rounded-full bg-ink" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default AdminLayout
