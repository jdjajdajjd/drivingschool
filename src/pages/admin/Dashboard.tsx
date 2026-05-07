import { addDays, format, isAfter, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Calendar03Icon, Car04Icon, CheckmarkCircle02Icon, Copy01Icon, LinkSquare02Icon, Location01Icon, Settings02Icon, UserMultipleIcon } from '@hugeicons/core-free-icons'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { StateView } from '../../components/ui/StateView'
import { useToast } from '../../components/ui/Toast'
import { createHugeIcon } from '../../components/ui/HugeIcon'
import { getUpcomingBookings } from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { db } from '../../services/storage'

const Calendar = createHugeIcon(Calendar03Icon)
const Car = createHugeIcon(Car04Icon)
const Check = createHugeIcon(CheckmarkCircle02Icon)
const Copy = createHugeIcon(Copy01Icon)
const ExternalLink = createHugeIcon(LinkSquare02Icon)
const Location = createHugeIcon(Location01Icon)
const Settings = createHugeIcon(Settings02Icon)
const Users = createHugeIcon(UserMultipleIcon)

function getSchool() {
  return db.schools.all()[0] ?? null
}

export function AdminDashboard() {
  const school = getSchool()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const data = useMemo(() => {
    if (!school) return null

    const now = new Date()
    const tomorrow = addDays(now, 1)
    const weekAhead = addDays(now, 7)
    const branches = db.branches.bySchool(school.id)
    const instructors = db.instructors.bySchool(school.id)
    const slots = db.slots.bySchool(school.id)
    const bookings = db.bookings.bySchool(school.id)
    const activeBookings = bookings.filter((booking) => booking.status === 'active')
    const upcoming = getUpcomingBookings(school.id)
      .filter((entry) => entry.booking.status === 'active')
      .slice(0, 8)

    const todayBookings = activeBookings.filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return slot ? isSameDay(new Date(`${slot.date}T${slot.time}:00`), now) : false
    })

    const tomorrowBookings = activeBookings.filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return slot ? isSameDay(new Date(`${slot.date}T${slot.time}:00`), tomorrow) : false
    })

    const freeSlots7d = slots.filter((slot) => {
      const startsAt = new Date(`${slot.date}T${slot.time}:00`)
      return slot.status === 'available' && isAfter(startsAt, now) && startsAt <= weekAhead
    })

    const setupItems = [
      { label: 'Данные школы', hint: 'название, адрес, телефон', done: Boolean(school.name && school.phone && school.address), to: `${ADMIN_BASE_PATH}/settings`, icon: Settings, tone: 'bg-[#EAF0FF] text-[#3156D4]' },
      { label: 'Филиал', hint: 'где проходят занятия', done: branches.some((branch) => branch.isActive), to: `${ADMIN_BASE_PATH}/branches`, icon: Location, tone: 'bg-[#EAF7EE] text-[#188447]' },
      { label: 'Инструктор', hint: 'кто ведёт учеников', done: instructors.some((instructor) => instructor.isActive), to: `${ADMIN_BASE_PATH}/instructors`, icon: Users, tone: 'bg-[#FFF0D8] text-[#C26A00]' },
      { label: 'Расписание', hint: 'свободное время для записи', done: freeSlots7d.length > 0, to: `${ADMIN_BASE_PATH}/slots`, icon: Calendar, tone: 'bg-[#F2EAFF] text-[#7B3FD6]' },
    ]

    return {
      branches,
      freeSlots7d,
      instructors,
      setupItems,
      todayBookings,
      tomorrowBookings,
      upcoming,
    }
  }, [school])

  if (!school || !data) {
    return (
      <div className="p-4 md:p-6">
        <StateView kind="error" title="Школа не найдена" description="Откройте страницу школы или проверьте подключение данных." />
      </div>
    )
  }

  const publicUrl = `${window.location.origin}/school/${school.slug}`
  const readyCount = data.setupItems.filter((item) => item.done).length

  async function copyPublicLink(): Promise<void> {
    await navigator.clipboard.writeText(publicUrl)
    showToast('Ссылка для учеников скопирована.', 'success')
  }

  return (
    <div className="px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="relative overflow-hidden rounded-[34px] bg-[#10231C] p-5 text-white shadow-[0_24px_70px_rgba(16,35,28,0.24)] md:p-7">
            <div className="absolute right-[-60px] top-[-70px] h-48 w-48 rounded-full bg-[#65D987]/20 blur-2xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/70">
                <Car size={15} /> {school.name}
              </div>
              <h1 className="mt-5 max-w-xl text-[34px] font-black leading-[0.95] tracking-[-0.06em] text-white md:text-[54px]">
                Управление автошколой
              </h1>
              <p className="mt-4 max-w-xl text-[15px] font-semibold leading-6 text-white/68">
                Записи, расписание, ученики и инструкторы — в одном месте, без лишних настроек.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)}><Calendar size={17} /> Добавить время</Button>
                <Button variant="secondary" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)}>Открыть записи</Button>
              </div>
            </div>
          </div>

          <div className="rounded-[34px] bg-[#F4D35E] p-5 text-[#15120E] shadow-[0_24px_70px_rgba(196,139,24,0.18)] md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#7A5A00]">Сегодня</p>
                <h2 className="mt-2 text-[30px] font-black leading-none tracking-[-0.05em]">{data.todayBookings.length} занятий</h2>
              </div>
              <div className="grid h-14 w-14 place-items-center rounded-[22px] bg-white/70 text-[#15120E]"><Calendar size={26} /></div>
            </div>
            <p className="mt-4 text-sm font-bold leading-5 text-[#6E5300]">Если занятий нет — добавьте свободное время или отправьте ссылку ученикам.</p>
            <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="mt-5 w-full rounded-[20px] bg-[#15120E] px-4 py-3 text-sm font-black text-white">Посмотреть записи</button>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="group rounded-[28px] bg-white p-4 text-left shadow-[0_16px_44px_rgba(41,34,26,0.08)] transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[19px] bg-[#EAF0FF] text-[#3156D4]"><Calendar size={22} /></span>
              <span className="text-2xl font-black text-[#15120E]">{data.tomorrowBookings.length}</span>
            </div>
            <p className="mt-4 text-base font-black text-[#15120E]">Завтра</p>
            <p className="mt-1 text-sm font-semibold text-[#7C736A]">занятий запланировано</p>
          </button>
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="group rounded-[28px] bg-white p-4 text-left shadow-[0_16px_44px_rgba(41,34,26,0.08)] transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[19px] bg-[#EAF7EE] text-[#188447]"><Check size={22} /></span>
              <span className="text-2xl font-black text-[#15120E]">{data.freeSlots7d.length}</span>
            </div>
            <p className="mt-4 text-base font-black text-[#15120E]">Свободное время</p>
            <p className="mt-1 text-sm font-semibold text-[#7C736A]">на ближайшие 7 дней</p>
          </button>
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/instructors`)} className="group rounded-[28px] bg-white p-4 text-left shadow-[0_16px_44px_rgba(41,34,26,0.08)] transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[19px] bg-[#FFF0D8] text-[#C26A00]"><Users size={22} /></span>
              <span className="text-2xl font-black text-[#15120E]">{data.instructors.filter((item) => item.isActive).length}</span>
            </div>
            <p className="mt-4 text-base font-black text-[#15120E]">Инструкторы</p>
            <p className="mt-1 text-sm font-semibold text-[#7C736A]">активны сейчас</p>
          </button>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_16px_44px_rgba(41,34,26,0.08)]">
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-5">
              <div>
                <h2 className="text-[22px] font-black tracking-[-0.04em] text-[#15120E]">Ближайшие занятия</h2>
                <p className="mt-1 text-sm font-semibold text-[#7C736A]">Дата, ученик, телефон, инструктор</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)}>Все записи</Button>
            </div>

            {data.upcoming.length === 0 ? (
              <div className="px-5 py-10">
                <StateView title="Занятий пока нет" description="Когда ученик запишется, занятие появится здесь." />
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06]">
                {data.upcoming.map((entry) => (
                  <Link key={entry.booking.id} to={`/booking/${entry.booking.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-[#F8F4ED] md:grid-cols-[145px_minmax(0,1fr)_minmax(150px,0.7fr)_110px] md:items-center">
                    <div>
                      <p className="text-base font-black text-[#15120E]">{entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'd MMM, HH:mm', { locale: ru }) : 'Время не найдено'}</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#7C736A]">{entry.branch?.name ?? 'Филиал не найден'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-[#15120E]">{entry.booking.studentName}</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#7C736A]">{entry.booking.studentPhone}</p>
                    </div>
                    <p className="truncate text-sm font-bold text-[#15120E]">{entry.instructor?.name ?? 'Инструктор не найден'}</p>
                    <StatusBadge status={entry.booking.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-[32px] bg-white p-5 shadow-[0_16px_44px_rgba(41,34,26,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[22px] font-black tracking-[-0.04em] text-[#15120E]">Что настроено</h2>
                  <p className="mt-1 text-sm font-semibold text-[#7C736A]">{readyCount} из {data.setupItems.length} пунктов готовы</p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-[19px] bg-[#EAF7EE] text-[#188447]"><Check size={22} /></div>
              </div>
              <div className="mt-4 grid gap-2">
                {data.setupItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button key={item.label} onClick={() => navigate(item.to)} className="flex items-center gap-3 rounded-[20px] bg-[#F8F4ED] p-3 text-left transition hover:bg-[#F0E5D5]">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[17px] ${item.tone}`}><Icon size={20} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-[#15120E]">{item.label}</span>
                        <span className="block text-xs font-semibold text-[#7C736A]">{item.hint}</span>
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.done ? 'bg-[#EAF7EE] text-[#188447]' : 'bg-white text-[#9A6A00]'}`}>{item.done ? 'готово' : 'нужно'}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="rounded-[32px] bg-[#EAF0FF] p-5 shadow-[0_16px_44px_rgba(41,34,26,0.08)]">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-[19px] bg-white text-[#3156D4]"><ExternalLink size={22} /></span>
                <div>
                  <h2 className="text-[22px] font-black tracking-[-0.04em] text-[#15120E]">Ссылка ученикам</h2>
                  <p className="text-sm font-semibold text-[#53627C]">для входа в кабинет</p>
                </div>
              </div>
              <p className="mt-4 break-all rounded-[18px] bg-white/75 px-3 py-3 text-sm font-bold leading-5 text-[#15120E]">{publicUrl}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => void copyPublicLink()}><Copy size={16} />Скопировать</Button>
                <Button variant="secondary" onClick={() => window.open(publicUrl, '_blank')}><ExternalLink size={16} />Открыть</Button>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  )
}
