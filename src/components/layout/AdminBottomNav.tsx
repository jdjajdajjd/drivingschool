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
  color: string
}

const TABS: Tab[] = [
  { key: 'today', to: ADMIN_BASE_PATH, label: 'Пульт', icon: Home, color: '#2563EB' },
  { key: 'bookings', to: `${ADMIN_BASE_PATH}/bookings`, label: 'Записи', icon: Clipboard, color: '#16A34A' },
  { key: 'slots', to: `${ADMIN_BASE_PATH}/slots`, label: 'Окна', icon: Calendar, color: '#D97706' },
  { key: 'people', to: `${ADMIN_BASE_PATH}/students`, label: 'Люди', icon: Users, color: '#7C3AED' },
  { key: 'school', to: `${ADMIN_BASE_PATH}/settings`, label: 'Школа', icon: Settings, color: '#0F172A' },
]

function activeKey(path: string): string {
  if (path === ADMIN_BASE_PATH || path === ADMIN_BASE_PATH + '/') return 'today'
  if (path.includes('/bookings')) return 'bookings'
  if (path.includes('/slots')) return 'slots'
  if (path.includes('/students') || path.includes('/instructors')) return 'people'
  if (path.includes('/branches') || path.includes('/modules') || path.includes('/settings')) return 'school'
  return 'today'
}

export function AdminBottomNav() {
  const location = useLocation()
  const current = activeKey(location.pathname)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#D8DEE8] bg-white/96 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {TABS.map((tab) => {
          const isActive = current === tab.key
          return (
            <NavLink
              key={tab.key}
              to={tab.to}
              end={tab.key === 'today'}
              className={cn(
                'flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-[10px] text-center transition-colors',
                isActive ? 'bg-[#F4F7FB]' : 'text-[#8B929C] active:bg-[#F7F8FA]',
              )}
              style={{ color: isActive ? tab.color : undefined }}
            >
              <span className="grid h-7 w-7 place-items-center rounded-[8px]" style={{ background: isActive ? `${tab.color}18` : 'transparent' }}>
                <tab.icon size={16} />
              </span>
              <span className="text-[10px] font-black leading-none tracking-tight">{tab.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export function AdminTopBar() {
  const location = useLocation()
  const current = useMemo(() => activeKey(location.pathname), [location.pathname])

  return (
    <header className="hidden border-b border-[#D8DEE8] bg-white md:block">
      <div className="flex h-[58px] items-center gap-2 px-5">
        <span className="mr-3 text-[15px] font-black tracking-[-0.04em] text-[#111418]">vroom</span>
        <span className="mr-2 rounded-[7px] bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#1D4ED8]">операционный пульт</span>
        <div className="flex flex-1 items-center gap-1">
          {TABS.map((tab) => {
            const isActive = current === tab.key
            return (
              <NavLink
                key={tab.key}
                to={tab.to}
                end={tab.key === 'today'}
                className={cn(
                  'flex min-h-10 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-black transition-colors',
                  isActive ? 'bg-[#111827] text-white' : 'text-[#5F6875] hover:bg-[#F8FAFC] hover:text-[#111418]',
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </NavLink>
            )
          })}
        </div>
      </div>
    </header>
  )
}
