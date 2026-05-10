import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Calendar03Icon,
  ClipboardIcon,
  DashboardSquare03Icon,
  LinkSquare02Icon,
  Logout03Icon,
  Settings02Icon,
  UserGroupIcon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons'
import { AdminBottomNav, AdminTopBar } from './AdminBottomNav'
import { createHugeIcon } from '../ui/HugeIcon'
import { ADMIN_BASE_PATH, clearAccess } from '../../services/accessControl'
import { setDataNamespace } from '../../services/storage'
import { seedIfNeeded } from '../../services/seed'
import { syncSupabaseSchoolToLocalDb } from '../../services/supabaseSync'
import { db } from '../../services/storage'

const ExternalLink = createHugeIcon(LinkSquare02Icon)
const LogOut = createHugeIcon(Logout03Icon)
const Home = createHugeIcon(DashboardSquare03Icon)
const Clipboard = createHugeIcon(ClipboardIcon)
const Calendar = createHugeIcon(Calendar03Icon)
const Students = createHugeIcon(UserMultipleIcon)
const Staff = createHugeIcon(UserGroupIcon)
const Settings = createHugeIcon(Settings02Icon)

const sidebar = [
  { to: ADMIN_BASE_PATH, label: 'Сегодня', hint: 'день и задачи', icon: Home, end: true },
  { to: `${ADMIN_BASE_PATH}/bookings`, label: 'Записи', hint: 'звонки и переносы', icon: Clipboard },
  { to: `${ADMIN_BASE_PATH}/slots`, label: 'График', hint: 'окна расписания', icon: Calendar },
  { to: `${ADMIN_BASE_PATH}/students`, label: 'Ученики', hint: 'карточки и прогресс', icon: Students },
  { to: `${ADMIN_BASE_PATH}/instructors`, label: 'Инструкторы', hint: 'доступ и машины', icon: Staff },
  { to: `${ADMIN_BASE_PATH}/settings`, label: 'Школа', hint: 'настройки и сайт', icon: Settings },
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
    <div className="v-admin-shell">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E4E7EC] bg-white/95 backdrop-blur md:hidden">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#111827] text-white">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 17h14M5 17l3-8h8l3 8M9 9V6m6 3V6M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <span className="block text-[16px] font-black tracking-[-0.05em] text-[#111827]">vroom</span>
            <span className="block text-[11px] font-bold text-[#667085]">кабинет школы</span>
          </div>
        </div>
        <button onClick={() => { if (school) window.location.href = publicPath }} className="mr-3 flex min-h-11 items-center gap-1.5 rounded-[12px] border border-[#E4E7EC] bg-white px-3 text-[12px] font-black text-[#111827]">
          <ExternalLink size={13} />
          Сайт
        </button>
      </header>

      <AdminTopBar />

      <aside className="fixed bottom-0 left-0 top-[60px] hidden w-[276px] flex-col border-r border-[#E4E7EC] bg-[#F9FAFB] p-3 md:flex">
        <div className="rounded-[16px] border border-[#E4E7EC] bg-white p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#667085]">школа</p>
          <p className="mt-1 truncate text-[15px] font-black text-[#111827]">{school?.name ?? 'Новая автошкола'}</p>
          <a href={publicPath} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[12px] border border-[#E4E7EC] bg-white px-3 text-[12px] font-black text-[#111827]">
            <ExternalLink size={14} /> Открыть сайт
          </a>
        </div>

        <nav className="mt-3 space-y-1">
          {sidebar.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `grid min-h-[58px] grid-cols-[34px_minmax(0,1fr)] items-center gap-3 rounded-[14px] px-3 transition ${isActive ? 'bg-[#111827] text-white' : 'text-[#344054] hover:bg-white'}`}
            >
              {({ isActive }) => (
                <>
                  <span className={`grid h-9 w-9 place-items-center rounded-[11px] ${isActive ? 'bg-white/12 text-white' : 'bg-white text-[#475467]'}`}>
                    <item.icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-black">{item.label}</span>
                    <span className={`block truncate text-[11px] font-bold ${isActive ? 'text-white/62' : 'text-[#667085]'}`}>{item.hint}</span>
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button onClick={() => { clearAccess('admin'); navigate('/') }} className="mt-auto flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-[13px] font-black text-[#DC2626] transition hover:bg-[#FEF2F2]">
          <LogOut size={14} />
          Выйти
        </button>
      </aside>

      <div className="pb-[calc(104px+env(safe-area-inset-bottom))] md:pb-0 md:pl-[276px]">
        <Outlet />
      </div>

      <AdminBottomNav />
    </div>
  )
}
