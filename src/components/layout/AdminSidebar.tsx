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
          'fixed inset-0 z-30 bg-stone-950/20 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-stone-200 bg-white transition-transform duration-200 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-5">
          <button onClick={() => navigate(ADMIN_BASE_PATH)} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-700">
              <Car size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-stone-900">DriveDesk</p>
              <p className="text-xs text-stone-400">Панель автошколы</p>
            </div>
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-stone-100 px-5 py-4">
          <p className="text-sm font-medium text-stone-500">Автошкола</p>
          <p className="mt-1 text-sm font-semibold text-stone-900">Вираж</p>
          <p className="mt-1 text-sm text-stone-500">Рабочая панель</p>
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
                  'flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-3 text-base font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-blue-700' : 'text-stone-400'} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-stone-100 px-3 py-4">
          <button
            onClick={() => {
              navigate('/school/virazh')
              onClose()
            }}
            className="flex w-full min-h-11 items-center gap-3 rounded-xl px-3.5 py-3 text-base text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <ExternalLink size={17} className="text-stone-400" />
            Страница школы
          </button>
          <button
            onClick={() => {
              clearAccess('admin')
              navigate('/')
              onClose()
            }}
            className="flex w-full min-h-11 items-center gap-3 rounded-xl px-3.5 py-3 text-base text-red-600 transition hover:bg-red-50"
          >
            <X size={17} />
            Выйти
          </button>
        </div>
      </aside>
    </>
  )
}
