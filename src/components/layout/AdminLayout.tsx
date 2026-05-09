import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { LinkSquare02Icon, Logout03Icon } from '@hugeicons/core-free-icons'
import { AdminBottomNav, AdminTopBar } from './AdminBottomNav'
import { createHugeIcon } from '../ui/HugeIcon'
import { clearAccess } from '../../services/accessControl'
import { setDataNamespace } from '../../services/storage'
import { seedIfNeeded } from '../../services/seed'
import { syncSupabaseSchoolToLocalDb } from '../../services/supabaseSync'
import { db } from '../../services/storage'

const ExternalLink = createHugeIcon(LinkSquare02Icon)
const LogOut = createHugeIcon(Logout03Icon)

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

  if (!ready) return <div className="min-h-screen" style={{ background: 'var(--page-bg)' }} />

  const school = db.schools.all()[0]
  const publicPath = school ? `/school/${school.slug}` : '/'

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b md:hidden"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#1F2BD8]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M5 17h14M5 17l3-8h8l3 8M9 9V6m6 3V6M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-black text-[#050609]">vroom</span>
        </div>
        <button
          onClick={() => { if (school) window.location.href = publicPath }}
          className="mr-3 flex items-center gap-1.5 text-[12px] font-black text-[#6F747A] hover:text-[#050609]"
        >
          <ExternalLink size={13} />
          Страница
        </button>
      </header>

      {/* Desktop top bar */}
      <AdminTopBar />

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex"
        style={{
          position: 'fixed',
          top: 57,
          left: 0,
          bottom: 0,
          width: 240,
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRight: '1px solid rgba(0,0,0,0.06)',
          padding: '16px 12px',
          gap: '8px',
        }}
      >
        <a
          href={publicPath}
          className="mt-auto flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-bold text-[#6F747A] transition hover:bg-[rgba(0,0,0,0.03)] hover:text-[#050609]"
        >
          <ExternalLink size={14} />
          Страница школы
        </a>
        <button
          onClick={() => { clearAccess('admin'); navigate('/') }}
          className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-bold text-[#E5534B] transition hover:bg-[rgba(229,83,75,0.06)]"
        >
          <LogOut size={14} />
          Выйти
        </button>
      </aside>

      {/* Main content area */}
      <div className="pb-20 md:pb-0 md:pl-[240px]">
        <Outlet />
      </div>

      {/* Mobile bottom navigation */}
      <AdminBottomNav />
    </div>
  )
}
