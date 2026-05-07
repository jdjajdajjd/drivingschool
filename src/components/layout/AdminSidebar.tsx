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
  { to: ADMIN_BASE_PATH, label: 'Сегодня', icon: LayoutDashboard, end: true },
  { to: `${ADMIN_BASE_PATH}/bookings`, label: 'Записи', icon: ClipboardList },
  { to: `${ADMIN_BASE_PATH}/slots`, label: 'Расписание', icon: CalendarDays },
  { to: `${ADMIN_BASE_PATH}/students`, label: 'Ученики', icon: UserRound },
  { to: `${ADMIN_BASE_PATH}/instructors`, label: 'Инструкторы', icon: Users },
  { to: `${ADMIN_BASE_PATH}/branches`, label: 'Филиалы', icon: Location },
  { to: `${ADMIN_BASE_PATH}/settings`, label: 'Настройки', icon: Settings2 },
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
          'fixed inset-0 z-30 bg-warm-main/20 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col border-r border-[rgba(55,38,20,0.08)] bg-white/82 backdrop-blur-2xl transition-transform duration-200 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-[rgba(55,38,20,0.08)] px-4 py-4 md:px-5 md:py-5">
          <button onClick={() => navigate(ADMIN_BASE_PATH)} className="flex items-center gap-3">
            <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-[20px] bg-[#15120E] shadow-[0_16px_34px_rgba(63,46,28,0.14)]">
              <Car size={19} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-base font-black text-[#15120E]">vroom</p>
              <p className="text-xs font-bold text-[#A09488]">Панель автошколы</p>
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

        <div className="mx-3 mt-3 rounded-[20px] border border-[rgba(55,38,20,0.08)] bg-[#F8F3EA] px-3.5 py-3 md:rounded-[24px] md:px-4 md:py-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#A09488]">Автошкола</p>
          <p className="mt-1 text-[15px] font-black leading-5 text-[#15120E]">{schoolName}</p>
          <p className="mt-1 text-sm font-semibold text-[#6F655C]">Рабочая панель директора</p>
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
                  'flex min-h-10 items-center gap-3 rounded-[16px] px-3.5 py-2.5 text-[14px] font-bold transition-colors md:min-h-12 md:rounded-[20px] md:py-3 md:text-[15px]',
                  isActive
                    ? 'bg-[#15120E] text-white shadow-[0_14px_34px_rgba(63,46,28,0.16)]'
                    : 'text-[#6F655C] hover:bg-[#F2ECE2] hover:text-[#15120E]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-white' : 'text-[#A09488]'} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1.5 border-t border-[rgba(55,38,20,0.08)] px-3 py-3 md:space-y-2 md:py-4">
          <button
            onClick={() => {
              navigate(publicPath)
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
