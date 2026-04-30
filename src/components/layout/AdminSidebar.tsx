import { NavLink, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Car,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  MapPin,
  Settings2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { ADMIN_BASE_PATH, clearAccess } from '../../services/accessControl'

const NAV = [
  { to: ADMIN_BASE_PATH, label: 'Сегодня', icon: LayoutDashboard, end: true },
  { to: `${ADMIN_BASE_PATH}/bookings`, label: 'Записи', icon: ClipboardList },
  { to: `${ADMIN_BASE_PATH}/slots`, label: 'Расписание', icon: CalendarDays },
  { to: `${ADMIN_BASE_PATH}/students`, label: 'Ученики', icon: UserRound },
  { to: `${ADMIN_BASE_PATH}/instructors`, label: 'Инструкторы', icon: Users },
  { to: `${ADMIN_BASE_PATH}/branches`, label: 'Филиалы', icon: MapPin },
  { to: `${ADMIN_BASE_PATH}/settings`, label: 'Настройки', icon: Settings2 },
]

interface AdminSidebarProps {
  open: boolean
  onClose: () => void
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const navigate = useNavigate()

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-warm-main/20 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r rgba(0,0,0,0.06) bg-white/95  backdrop-blur-xl transition-transform duration-200 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b rgba(0,0,0,0.06) px-5 py-5">
          <button onClick={() => navigate(ADMIN_BASE_PATH)} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent shadow-[0_20px_60px_rgba(15,20,25,0.08)]">
              <Car size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold #111418">DriveDesk</p>
              <p className="text-xs font-medium #9EA3A8">Панель автошколы</p>
            </div>
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-2xl #9EA3A8 transition hover:#F4F5F6 hover:#111418 md:hidden"
            aria-label="Закрыть меню"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b rgba(0,0,0,0.06) px-5 py-4">
          <p className="caption">Автошкола</p>
          <p className="mt-1 text-sm font-bold #111418">Вираж</p>
          <p className="mt-1 text-sm #6F747A">Рабочая панель</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold transition-colors',
                  isActive
                    ? 'rgba(246,184,77,0.12) #C97F10 shadow-[0_20px_60px_rgba(15,20,25,0.08)]'
                    : '#6F747A hover:#F4F5F6 hover:#111418',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? '#C97F10' : '#9EA3A8'} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t rgba(0,0,0,0.06) px-3 py-4">
          <button
            onClick={() => {
              navigate('/school/virazh')
              onClose()
            }}
            className="flex w-full min-h-11 items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold #6F747A transition hover:#F4F5F6 hover:#111418"
          >
            <ExternalLink size={17} className="#9EA3A8" />
            Страница школы
          </button>
          <button
            onClick={() => {
              clearAccess('admin')
              navigate('/')
              onClose()
            }}
            className="flex w-full min-h-11 items-center gap-3 rounded-2xl px-3.5 py-3 text-base #E5534B transition hover:#FEF2F2"
          >
            <X size={17} />
            Выйти
          </button>
        </div>
      </aside>
    </>
  )
}
