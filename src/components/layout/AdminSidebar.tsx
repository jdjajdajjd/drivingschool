import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Users,
  MapPin,
  Puzzle,
  ExternalLink,
  ChevronRight,
  Car,
} from 'lucide-react'
import { cn } from '../../lib/utils'

const NAV = [
  { to: '/admin', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Записи', icon: CalendarDays },
  { to: '/admin/slots', label: 'Слоты', icon: Clock },
  { to: '/admin/instructors', label: 'Инструкторы', icon: Users },
  { to: '/admin/branches', label: 'Филиалы', icon: MapPin },
  { to: '/admin/modules', label: 'Модули', icon: Puzzle },
]

export function AdminSidebar() {
  const navigate = useNavigate()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-stone-100 flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-stone-100">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 bg-forest-800 rounded-lg flex items-center justify-center">
            <Car size={16} className="text-white" />
          </div>
          <span className="font-sans text-lg font-medium text-stone-900">DriveDesk</span>
        </button>
      </div>

      {/* School info */}
      <div className="px-5 py-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-forest-100 rounded-lg flex items-center justify-center">
            <span className="text-xs font-sans font-semibold text-forest-800">В</span>
          </div>
          <div>
            <p className="text-xs font-medium text-stone-900 leading-tight">Автошкола «Вираж»</p>
            <p className="text-xs text-stone-400 leading-tight">virazh</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-forest-50 text-forest-800'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={isActive ? 'text-forest-700' : 'text-stone-400'}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-stone-100 space-y-1">
        <button
          onClick={() => navigate('/school/virazh')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors group"
        >
          <ExternalLink size={15} className="text-stone-400" />
          Страница записи
          <ChevronRight size={12} className="ml-auto text-stone-300 group-hover:text-stone-500 transition-colors" />
        </button>
        <button
          onClick={() => navigate('/superadmin')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors"
        >
          <div className="w-4 h-4 bg-stone-200 rounded-full" />
          Суперадмин
        </button>
      </div>
    </aside>
  )
}
