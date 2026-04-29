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
          'fixed inset-0 z-30 bg-product-main/20 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-product-border bg-white/95 shadow-card backdrop-blur-xl transition-transform duration-200 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-product-border px-5 py-5">
          <button onClick={() => navigate(ADMIN_BASE_PATH)} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-product-primary shadow-soft">
              <Car size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-product-main">DriveDesk</p>
              <p className="text-xs font-medium text-product-muted">Панель автошколы</p>
            </div>
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-product-muted transition hover:bg-product-alt hover:text-product-main md:hidden"
            aria-label="Закрыть меню"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-product-border px-5 py-4">
          <p className="ui-kicker">Автошкола</p>
          <p className="mt-1 text-sm font-bold text-product-main">Вираж</p>
          <p className="mt-1 text-sm text-product-secondary">Рабочая панель</p>
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
                    ? 'bg-product-primary-soft text-product-primary shadow-soft'
                    : 'text-product-secondary hover:bg-product-alt hover:text-product-main',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-product-primary' : 'text-product-muted'} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-product-border px-3 py-4">
          <button
            onClick={() => {
              navigate('/school/virazh')
              onClose()
            }}
            className="flex w-full min-h-11 items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold text-product-secondary transition hover:bg-product-alt hover:text-product-main"
          >
            <ExternalLink size={17} className="text-product-muted" />
            Страница школы
          </button>
          <button
            onClick={() => {
              clearAccess('admin')
              navigate('/')
              onClose()
            }}
            className="flex w-full min-h-11 items-center gap-3 rounded-2xl px-3.5 py-3 text-base text-product-error transition hover:bg-product-error-soft"
          >
            <X size={17} />
            Выйти
          </button>
        </div>
      </aside>
    </>
  )
}
