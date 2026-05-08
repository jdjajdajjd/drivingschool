import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Calendar03Icon,
  ClipboardIcon,
  DashboardSquare03Icon,
  Settings02Icon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons'
import { cn } from '../../lib/utils'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { createHugeIcon } from '../ui/HugeIcon'

const Home = createHugeIcon(DashboardSquare03Icon)
const Clipboard = createHugeIcon(ClipboardIcon)
const Calendar = createHugeIcon(Calendar03Icon)
const Users = createHugeIcon(UserMultipleIcon)
const Settings = createHugeIcon(Settings02Icon)

interface Tab {
  key: string
  to: string
  label: string
  icon: ReturnType<typeof createHugeIcon>
}

const TABS: Tab[] = [
  { key: 'today', to: ADMIN_BASE_PATH, label: 'Сегодня', icon: Home },
  { key: 'bookings', to: `${ADMIN_BASE_PATH}/bookings`, label: 'Записи', icon: Clipboard },
  { key: 'slots', to: `${ADMIN_BASE_PATH}/slots`, label: 'Расписание', icon: Calendar },
  { key: 'people', to: `${ADMIN_BASE_PATH}/students`, label: 'Ученики', icon: Users },
  { key: 'school', to: `${ADMIN_BASE_PATH}/settings`, label: 'Школа', icon: Settings },
]

export function AdminBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t md:hidden"
      style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)',
        borderColor: 'rgba(0,0,0,0.08)',
      }}
    >
      <div className="grid grid-cols-5">
        {TABS.map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.to}
            end={tab.key === 'today'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 py-2.5 text-center transition-colors',
                isActive
                  ? 'text-[#111418]'
                  : 'text-[#9EA3A8] hover:text-[#6F747A]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'grid h-7 w-7 place-items-center rounded-[10px] transition-all',
                    isActive
                      ? 'bg-[#111418] text-white'
                      : 'text-current',
                  )}
                >
                  <tab.icon size={16} />
                </span>
                <span
                  className={cn(
                    'text-[10px] font-extrabold leading-none tracking-tight',
                    isActive ? 'text-[#111418]' : '',
                  )}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function AdminTopBar() {
  const location = useLocation()
  const activeTab = useMemo(() => {
    const path = location.pathname
    if (path === ADMIN_BASE_PATH || path === ADMIN_BASE_PATH + '/') return 'today'
    if (path.includes('/bookings')) return 'bookings'
    if (path.includes('/slots')) return 'slots'
    if (path.includes('/students')) return 'people'
    if (path.includes('/instructors')) return 'people'
    if (path.includes('/branches')) return 'school'
    if (path.includes('/modules')) return 'school'
    if (path.includes('/settings')) return 'school'
    return 'today'
  }, [location.pathname])

  return (
    <header
      className="hidden border-b md:block"
      style={{ background: '#FFFFFF', borderColor: 'rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center gap-1 px-3 py-2">
        <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#111418]">
          <Home size={13} className="text-white" />
        </div>
        <span className="text-sm font-black text-[#111418]">vroom</span>
        <span className="mx-3 h-4 w-px bg-[rgba(0,0,0,0.08)]" />
        {TABS.map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.to}
            end={tab.key === 'today'}
            className={cn(
              'flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-extrabold transition-colors',
              activeTab === tab.key
                ? 'bg-[#111418] text-white'
                : 'text-[#6F747A] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#111418]',
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </NavLink>
        ))}
      </div>
    </header>
  )
}
