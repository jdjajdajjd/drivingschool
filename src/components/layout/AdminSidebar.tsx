import { NavLink, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Car,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  MapPin,
  Puzzle,
  Settings2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { ADMIN_BASE_PATH, SUPERADMIN_BASE_PATH, clearAccess } from '../../services/accessControl'

const NAV = [
  { to: ADMIN_BASE_PATH, label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: `${ADMIN_BASE_PATH}/bookings`, label: 'Записи', icon: CalendarDays },
  { to: `${ADMIN_BASE_PATH}/slots`, label: 'Слоты', icon: Clock3 },
  { to: `${ADMIN_BASE_PATH}/students`, label: 'Ученики', icon: UserRound },
  { to: `${ADMIN_BASE_PATH}/instructors`, label: 'Инструкторы', icon: Users },
  { to: `${ADMIN_BASE_PATH}/branches`, label: 'Филиалы', icon: MapPin },
  { to: `${ADMIN_BASE_PATH}/modules`, label: 'Модули', icon: Puzzle },
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
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-700">
              <Car size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-stone-900">DriveDesk</p>
              <p className="text-xs text-stone-400">Панель школы</p>
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
          <p className="mt-1 text-sm text-stone-500">Демо-школа · virazh</p>
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
                  'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-forest-50 text-forest-700'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
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

        <div className="space-y-2 border-t border-stone-100 px-3 py-4">
          <button
            onClick={() => {
              navigate('/school/virazh')
              onClose()
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <ExternalLink size={15} className="text-stone-400" />
            Страница записи
          </button>
          <button
            onClick={() => {
              navigate(SUPERADMIN_BASE_PATH)
              onClose()
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <Puzzle size={15} className="text-stone-400" />
            Суперадмин
          </button>
          <button
            onClick={() => {
              clearAccess('admin')
              navigate('/')
              onClose()
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-red-600 transition hover:bg-red-50"
          >
            <X size={15} />
            Выйти из админки
          </button>
        </div>
      </aside>
    </>
  )
}
