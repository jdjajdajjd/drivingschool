import { NavLink, useNavigate } from 'react-router-dom'
import {
  Calendar03Icon,
  Car03Icon,
  ClipboardIcon,
  DashboardSquare03Icon,
  LinkSquare02Icon,
  Location01Icon,
  Settings02Icon,
  User03Icon,
  UserMultipleIcon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '../../lib/utils'
import { createHugeIcon } from '../ui/HugeIcon'
import { ADMIN_BASE_PATH, clearAccess } from '../../services/accessControl'
import { db } from '../../services/storage'

const CalendarDays = createHugeIcon(Calendar03Icon)
const Car = createHugeIcon(Car03Icon)
const ClipboardList = createHugeIcon(ClipboardIcon)
const ExternalLink = createHugeIcon(LinkSquare02Icon)
const LayoutDashboard = createHugeIcon(DashboardSquare03Icon)
const Location = createHugeIcon(Location01Icon)
const Settings2 = createHugeIcon(Settings02Icon)
const UserRound = createHugeIcon(User03Icon)
const Users = createHugeIcon(UserMultipleIcon)
const X = createHugeIcon(Cancel01Icon)

const NAV = [
  { to: ADMIN_BASE_PATH, label: 'Сегодня', icon: LayoutDashboard, end: true, color: 'bg-[#EAF7EE] text-[#188447]' },
  { to: `${ADMIN_BASE_PATH}/bookings`, label: 'Записи', icon: ClipboardList, color: 'bg-[#EAF0FF] text-[#3156D4]' },
  { to: `${ADMIN_BASE_PATH}/slots`, label: 'Расписание', icon: CalendarDays, color: 'bg-[#F2EAFF] text-[#7B3FD6]' },
  { to: `${ADMIN_BASE_PATH}/students`, label: 'Ученики', icon: UserRound, color: 'bg-[#FFF0D8] text-[#C26A00]' },
  { to: `${ADMIN_BASE_PATH}/instructors`, label: 'Инструкторы', icon: Users, color: 'bg-[#EAF7EE] text-[#188447]' },
  { to: `${ADMIN_BASE_PATH}/branches`, label: 'Филиалы', icon: Location, color: 'bg-[#FFECEA] text-[#D94A38]' },
  { to: `${ADMIN_BASE_PATH}/settings`, label: 'Настройки', icon: Settings2, color: 'bg-[#F0ECE6] text-[#334155]' },
]

interface AdminSidebarProps {
  open: boolean
  onClose: () => void
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const navigate = useNavigate()
  const school = db.schools.all()[0] ?? null
  const schoolName = school?.name || 'Новая автошкола'
  const publicPath = `/school/${school?.slug ?? 'workspace'}`

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-[#0F172A]/45 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[292px] flex-col border-r border-[#CBD5E1] bg-[#F3F6FB] transition-transform duration-200 md:w-[300px] md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-[#D8E0EC] px-3 py-3 md:px-4 md:py-4">
          <button onClick={() => navigate(ADMIN_BASE_PATH)} className="flex items-center gap-3">
            <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-[10px] bg-[#10231C]">
              <Car size={19} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-base font-black text-[#15120E]">vroom</p>
              <p className="text-xs font-bold text-[#667085]">Панель автошколы</p>
            </div>
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-2xl #9EA3A8 transition hover:bg-white hover:text-[#1026D8] md:hidden"
            aria-label="Закрыть меню"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-2.5 mt-2.5 rounded-[10px] border border-[#D8E0EC] bg-white px-3 py-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#667085]">Автошкола</p>
          <p className="mt-1 text-[15px] font-black leading-5 text-[#15120E]">{schoolName}</p>
          <p className="mt-1 text-sm font-semibold text-[#334155]">Управление школой</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
          {NAV.map(({ to, label, icon: Icon, end, color }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex min-h-10 items-center gap-3 rounded-[12px] px-2.5 py-2 text-[14px] font-black transition-colors md:min-h-10 md:rounded-[12px] md:py-2 md:text-[14px]',
                  isActive
                    ? 'bg-[#1026D8] text-white'
                    : 'text-[#1F2937] hover:bg-white hover:text-[#1026D8]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`grid h-8 w-8 place-items-center rounded-[10px] ${isActive ? color : 'bg-white text-[#667085]'}`}><Icon size={17} /></span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-[#D8E0EC] px-2.5 py-2.5">
          <button
            onClick={() => {
              navigate(publicPath)
              onClose()
            }}
            className="flex w-full min-h-11 items-center gap-3 rounded-[12px] px-3 py-2 text-[14px] font-black text-[#1F2937] transition hover:bg-white hover:text-[#1026D8]"
          >
            <ExternalLink size={17} className="text-[#667085]" />
            Страница школы
          </button>
          <button
            onClick={() => {
              clearAccess('admin')
              navigate('/')
              onClose()
            }}
            className="flex w-full min-h-11 items-center gap-3 rounded-[12px] px-3 py-2 text-[14px] font-black text-[#D94A38] transition hover:bg-[#FFECEA]"
          >
            <X size={17} />
            Выйти
          </button>
        </div>
      </aside>
    </>
  )
}
