import React, { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Calendar, ClipboardCheck, Dashboard, Group, Settings } from 'iconoir-react'
import { cn } from '../../lib/utils'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { BrandMark } from './BrandMark'

const Home = Dashboard
const Clipboard = ClipboardCheck
const Users = Group

interface Tab {
  key: string
  to: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const TABS: Tab[] = [
  { key: 'today', to: ADMIN_BASE_PATH, label: 'Сегодня', icon: Home },
  { key: 'bookings', to: `${ADMIN_BASE_PATH}/bookings`, label: 'Записи', icon: Clipboard },
  { key: 'slots', to: `${ADMIN_BASE_PATH}/schedule`, label: 'График', icon: Calendar },
  { key: 'people', to: `${ADMIN_BASE_PATH}/students`, label: 'Ученики', icon: Users },
  { key: 'school', to: `${ADMIN_BASE_PATH}/settings`, label: 'Школа', icon: Settings },
]

function activeKey(path: string): string {
  if (path === ADMIN_BASE_PATH || path === ADMIN_BASE_PATH + '/') return 'today'
  if (path.includes('/bookings')) return 'bookings'
  if (path.includes('/slots') || path.includes('/schedule')) return 'slots'
  if (path.includes('/students') || path.includes('/instructors')) return 'people'
  if (path.includes('/branches') || path.includes('/modules') || path.includes('/settings')) return 'school'
  return 'today'
}

export function AdminBottomNav() {
  const location = useLocation()
  const current = activeKey(location.pathname)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E4E7EC] bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {TABS.map((tab) => {
          const isActive = current === tab.key
          return (
            <NavLink
              key={tab.key}
              to={tab.to}
              end={tab.key === 'today'}
              className={cn(
                'flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-[12px] text-center transition-colors',
                isActive ? 'bg-[#111827] text-white' : 'text-[#667085] active:bg-[#F2F4F7]',
              )}
            >
              <span className="grid h-7 w-7 place-items-center rounded-[8px]">
                <tab.icon width={16} height={16} />
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
    <header className="hidden border-b border-[#E4E7EC] bg-white md:block">
      <div className="flex h-[60px] items-center gap-2 px-5">
        <BrandMark size="sm" className="mr-3" />
        <div className="flex flex-1 items-center gap-1">
          {TABS.map((tab) => {
            const isActive = current === tab.key
            return (
              <NavLink
                key={tab.key}
                to={tab.to}
                end={tab.key === 'today'}
                className={cn(
                  'flex min-h-10 items-center gap-1.5 rounded-[12px] px-3 text-[13px] font-black transition-colors',
                  isActive ? 'bg-[#111827] text-white' : 'text-[#667085] hover:bg-[#F9FAFB] hover:text-[#111827]',
                )}
              >
                <tab.icon width={14} height={14} />
                {tab.label}
              </NavLink>
            )
          })}
        </div>
      </div>
    </header>
  )
}
