import { addDays, format, isAfter, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ArrowRight01Icon, Copy01Icon, LinkSquare02Icon } from '@hugeicons/core-free-icons'
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

const ArrowRight = createHugeIcon(ArrowRight01Icon)
const Copy = createHugeIcon(Copy01Icon)
const ExternalLink = createHugeIcon(LinkSquare02Icon)

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

    const launchItems = [
      { label: 'Данные школы', text: 'Название, адрес, телефон', done: Boolean(school.name && school.phone && school.address), to: `${ADMIN_BASE_PATH}/settings` },
      { label: 'Филиалы', text: 'Где начинаются занятия', done: branches.some((branch) => branch.isActive), to: `${ADMIN_BASE_PATH}/branches` },
      { label: 'Инструкторы', text: 'Кто ведет учеников', done: instructors.some((instructor) => instructor.isActive), to: `${ADMIN_BASE_PATH}/instructors` },
      { label: 'Расписание', text: 'Свободные окна на дни', done: freeSlots7d.length > 0, to: `${ADMIN_BASE_PATH}/slots` },
      { label: 'Вход ученикам', text: 'Страница для входа', done: Boolean(school.slug), to: `/school/${school.slug}`, external: true },
    ]

    return {
      branches,
      freeSlots7d,
      instructors,
      launchItems,
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
  const doneCount = data.launchItems.filter((item) => item.done).length
  const nextAction = data.launchItems.find((item) => !item.done) ?? data.launchItems[data.launchItems.length - 1]

  async function copyPublicLink(): Promise<void> {
    await navigator.clipboard.writeText(publicUrl)
    showToast('Ссылка для учеников скопирована.', 'success')
  }

  return (
    <div className="admin-workspace px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[28px] bg-[#15120E] p-4 text-white shadow-[0_24px_70px_rgba(21,18,14,0.24)] md:rounded-[36px] md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">{school.name}</p>
              <h1 className="mt-2 text-[30px] font-black leading-[0.96] tracking-[-0.06em] text-white md:text-[48px]">Рабочий день</h1>
              <p className="mt-3 max-w-xl text-[14px] font-semibold leading-5 text-white/62 md:text-[16px] md:leading-6">
                Главное на одном экране: ближайшие занятия, расписание и что мешает запуску школы.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-[24px] bg-white/[0.07] p-2 md:min-w-[430px] md:gap-3 md:p-3">
              <div className="rounded-[18px] bg-white px-3 py-3 text-[#15120E] md:px-4 md:py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8A8177]">Сегодня</p>
                <p className="mt-1 text-[30px] font-black leading-none tracking-[-0.06em]">{data.todayBookings.length}</p>
              </div>
              <div className="rounded-[18px] bg-white/[0.08] px-3 py-3 md:px-4 md:py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/42">Завтра</p>
                <p className="mt-1 text-[30px] font-black leading-none tracking-[-0.06em] text-white">{data.tomorrowBookings.length}</p>
              </div>
              <div className="rounded-[18px] bg-white/[0.08] px-3 py-3 md:px-4 md:py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/42">Свободно</p>
                <p className="mt-1 text-[30px] font-black leading-none tracking-[-0.06em] text-white">{data.freeSlots7d.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)]">
          <section className="overflow-hidden rounded-[26px] border border-black/[0.06] bg-white shadow-[0_16px_50px_rgba(46,35,24,0.08)] md:rounded-[32px]">
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-4 md:px-6 md:py-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#A09488]">Очередь</p>
                <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em] text-[#15120E] md:text-[26px]">Ближайшие занятия</h2>
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)}>Все записи</Button>
            </div>

            {data.upcoming.length === 0 ? (
              <div className="px-4 py-10 md:px-6">
                <StateView title="Занятий пока нет" description="Когда ученики запишутся, они появятся здесь списком по времени." />
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06]">
                {data.upcoming.map((entry, index) => (
                  <Link key={entry.booking.id} to={`/booking/${entry.booking.id}`} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 px-4 py-4 transition hover:bg-[#F8F4ED] md:grid-cols-[76px_150px_minmax(0,1fr)_120px] md:items-center md:px-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#15120E] text-sm font-black text-white md:h-12 md:w-12">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <p className="text-[15px] font-black tracking-[-0.02em] text-[#15120E]">
                        {entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'd MMM, HH:mm', { locale: ru }) : 'Время не найдено'}
                      </p>
                      <p className="mt-0.5 text-[13px] font-semibold text-[#8A8177]">{entry.branch?.name ?? 'Филиал не найден'}</p>
                    </div>
                    <div className="col-start-2 min-w-0 md:col-start-auto">
                      <p className="truncate text-[15px] font-black text-[#15120E]">{entry.booking.studentName}</p>
                      <p className="mt-0.5 truncate text-[13px] font-semibold text-[#8A8177]">{entry.instructor?.name ?? 'Инструктор не найден'}</p>
                    </div>
                    <div className="col-start-2 md:col-start-auto md:justify-self-end">
                      <StatusBadge status={entry.booking.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-3">
            <section className="rounded-[26px] bg-[#F0E5D5] p-4 shadow-[0_16px_50px_rgba(46,35,24,0.07)] md:rounded-[32px] md:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8D7052]">Готовность</p>
                  <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em] text-[#15120E]">Запуск школы</h2>
                </div>
                <div className="rounded-full bg-[#15120E] px-3 py-1.5 text-sm font-black text-white">{doneCount}/{data.launchItems.length}</div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/70">
                <div className="h-full rounded-full bg-[#15120E]" style={{ width: `${(doneCount / data.launchItems.length) * 100}%` }} />
              </div>
              <button
                type="button"
                onClick={() => nextAction.external ? window.open(nextAction.to, '_blank') : navigate(nextAction.to)}
                className="mt-4 flex w-full items-center justify-between gap-3 rounded-[22px] bg-white px-4 py-4 text-left shadow-[0_10px_30px_rgba(46,35,24,0.07)]"
              >
                <div>
                  <p className="text-sm font-black text-[#15120E]">{nextAction.done ? 'Проверить страницу школы' : nextAction.label}</p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-[#74685D]">{nextAction.text}</p>
                </div>
                <ArrowRight size={18} className="shrink-0 text-[#15120E]" />
              </button>
              <div className="mt-3 space-y-2">
                {data.launchItems.map((item) => (
                  <button key={item.label} type="button" onClick={() => item.external ? window.open(item.to, '_blank') : navigate(item.to)} className="flex w-full items-center gap-2.5 text-left">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.done ? 'bg-[#15120E]' : 'bg-white'}`} />
                    <span className="text-sm font-bold text-[#3B332B]">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[26px] bg-white p-4 shadow-[0_16px_50px_rgba(46,35,24,0.07)] md:rounded-[32px] md:p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#A09488]">Ученики</p>
              <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em] text-[#15120E]">Ссылка для входа</h2>
              <p className="mt-2 break-all rounded-[18px] bg-[#F6F1EA] px-3 py-3 text-sm font-bold leading-5 text-[#15120E]">{publicUrl}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => void copyPublicLink()}><Copy size={16} />Скопировать</Button>
                <Button variant="secondary" onClick={() => window.open(publicUrl, '_blank')}><ExternalLink size={16} />Открыть</Button>
              </div>
            </section>

            <section className="rounded-[26px] bg-white p-4 shadow-[0_16px_50px_rgba(46,35,24,0.07)] md:rounded-[32px] md:p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#A09488]">Основа</p>
              <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em] text-[#15120E]">Филиалы и инструкторы</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => navigate(`${ADMIN_BASE_PATH}/branches`)} className="rounded-[20px] bg-[#15120E] px-4 py-4 text-left text-white">
                  <p className="text-[28px] font-black leading-none">{data.branches.length}</p>
                  <p className="mt-1 text-xs font-bold text-white/55">филиалов</p>
                </button>
                <button onClick={() => navigate(`${ADMIN_BASE_PATH}/instructors`)} className="rounded-[20px] bg-[#F6F1EA] px-4 py-4 text-left text-[#15120E]">
                  <p className="text-[28px] font-black leading-none">{data.instructors.filter((item) => item.isActive).length}</p>
                  <p className="mt-1 text-xs font-bold text-[#8A8177]">инструкторов</p>
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
