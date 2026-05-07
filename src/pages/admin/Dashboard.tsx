import { addDays, format, isAfter, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Copy01Icon, LinkSquare02Icon } from '@hugeicons/core-free-icons'
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

    const missingSetup = [
      { label: 'Заполнить данные школы', done: Boolean(school.name && school.phone && school.address), to: `${ADMIN_BASE_PATH}/settings` },
      { label: 'Добавить филиал', done: branches.some((branch) => branch.isActive), to: `${ADMIN_BASE_PATH}/branches` },
      { label: 'Добавить инструктора', done: instructors.some((instructor) => instructor.isActive), to: `${ADMIN_BASE_PATH}/instructors` },
      { label: 'Добавить свободное время', done: freeSlots7d.length > 0, to: `${ADMIN_BASE_PATH}/slots` },
    ].filter((item) => !item.done)

    return {
      branches,
      freeSlots7d,
      instructors,
      missingSetup,
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

  async function copyPublicLink(): Promise<void> {
    await navigator.clipboard.writeText(publicUrl)
    showToast('Ссылка для учеников скопирована.', 'success')
  }

  return (
    <div className="px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl space-y-3">
        <section className="rounded-[24px] bg-[#15120E] p-4 text-white md:rounded-[32px] md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-white/55">{school.name}</p>
              <h1 className="mt-1 text-[28px] font-black leading-tight tracking-[-0.04em] text-white md:text-[42px]">Панель автошколы</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-5 text-white/65 md:text-base">
                Здесь видно: кто сегодня учится, сколько свободного времени и что нужно сделать дальше.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)}>Добавить время</Button>
              <Button variant="secondary" onClick={() => navigate(`${ADMIN_BASE_PATH}/students`)}>Ученики</Button>
            </div>
          </div>
        </section>

        <section className="grid gap-2 md:grid-cols-3">
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="rounded-[22px] bg-white p-4 text-left shadow-[0_12px_34px_rgba(46,35,24,0.07)]">
            <p className="text-sm font-bold text-[#6F655C]">Сегодня занятий</p>
            <p className="mt-2 text-[42px] font-black leading-none tracking-[-0.06em] text-[#15120E]">{data.todayBookings.length}</p>
            <p className="mt-2 text-sm font-semibold text-[#8A8177]">Нажмите, чтобы открыть записи</p>
          </button>
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="rounded-[22px] bg-white p-4 text-left shadow-[0_12px_34px_rgba(46,35,24,0.07)]">
            <p className="text-sm font-bold text-[#6F655C]">Завтра занятий</p>
            <p className="mt-2 text-[42px] font-black leading-none tracking-[-0.06em] text-[#15120E]">{data.tomorrowBookings.length}</p>
            <p className="mt-2 text-sm font-semibold text-[#8A8177]">План на следующий день</p>
          </button>
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="rounded-[22px] bg-[#F0E5D5] p-4 text-left shadow-[0_12px_34px_rgba(46,35,24,0.07)]">
            <p className="text-sm font-bold text-[#6F655C]">Свободного времени</p>
            <p className="mt-2 text-[42px] font-black leading-none tracking-[-0.06em] text-[#15120E]">{data.freeSlots7d.length}</p>
            <p className="mt-2 text-sm font-semibold text-[#6F655C]">На ближайшие 7 дней</p>
          </button>
        </section>

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_12px_34px_rgba(46,35,24,0.07)] md:rounded-[30px]">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-4 md:px-5">
              <div>
                <h2 className="text-xl font-black tracking-[-0.03em] text-[#15120E]">Ближайшие занятия</h2>
                <p className="mt-1 text-sm font-semibold text-[#8A8177]">Кто, когда и с каким инструктором</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)}>Все записи</Button>
            </div>

            {data.upcoming.length === 0 ? (
              <div className="px-4 py-10">
                <StateView title="Занятий пока нет" description="Когда ученики запишутся, они появятся здесь понятным списком." />
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06]">
                {data.upcoming.map((entry) => (
                  <Link key={entry.booking.id} to={`/booking/${entry.booking.id}`} className="grid gap-2 px-4 py-4 hover:bg-[#F8F4ED] md:grid-cols-[145px_minmax(0,1fr)_minmax(160px,0.7fr)_110px] md:items-center md:px-5">
                    <div>
                      <p className="text-base font-black text-[#15120E]">
                        {entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'd MMM, HH:mm', { locale: ru }) : 'Время не найдено'}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-[#8A8177]">{entry.branch?.name ?? 'Филиал не найден'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-[#15120E]">{entry.booking.studentName}</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#8A8177]">{entry.booking.studentPhone}</p>
                    </div>
                    <p className="truncate text-sm font-bold text-[#15120E]">{entry.instructor?.name ?? 'Инструктор не найден'}</p>
                    <StatusBadge status={entry.booking.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <section className="rounded-[24px] bg-white p-4 shadow-[0_12px_34px_rgba(46,35,24,0.07)] md:rounded-[30px] md:p-5">
              <h2 className="text-xl font-black tracking-[-0.03em] text-[#15120E]">Что сделать дальше</h2>
              {data.missingSetup.length === 0 ? (
                <div className="mt-4 rounded-[20px] bg-[#EAF7EE] p-4">
                  <p className="text-base font-black text-[#14532D]">Всё готово</p>
                  <p className="mt-1 text-sm font-semibold text-[#166534]">Можно отправлять ссылку ученикам.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {data.missingSetup.map((item) => (
                    <button key={item.label} onClick={() => navigate(item.to)} className="flex w-full items-center justify-between rounded-[18px] bg-[#F6F1EA] px-4 py-3 text-left">
                      <span className="text-sm font-black text-[#15120E]">{item.label}</span>
                      <span className="text-sm font-black text-[#15120E]">→</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[24px] bg-white p-4 shadow-[0_12px_34px_rgba(46,35,24,0.07)] md:rounded-[30px] md:p-5">
              <h2 className="text-xl font-black tracking-[-0.03em] text-[#15120E]">Ссылка для учеников</h2>
              <p className="mt-2 text-sm font-semibold leading-5 text-[#8A8177]">Отправьте её ученику. Запись доступна только после входа в кабинет.</p>
              <p className="mt-3 break-all rounded-[18px] bg-[#F6F1EA] px-3 py-3 text-sm font-bold leading-5 text-[#15120E]">{publicUrl}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => void copyPublicLink()}><Copy size={16} />Скопировать</Button>
                <Button variant="secondary" onClick={() => window.open(publicUrl, '_blank')}><ExternalLink size={16} />Открыть</Button>
              </div>
            </section>

            <section className="rounded-[24px] bg-[#15120E] p-4 text-white shadow-[0_12px_34px_rgba(46,35,24,0.12)] md:rounded-[30px] md:p-5">
              <h2 className="text-xl font-black tracking-[-0.03em] text-white">Быстрые действия</h2>
              <div className="mt-4 grid gap-2">
                <Button variant="secondary" onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)}>Добавить свободное время</Button>
                <Button variant="secondary" onClick={() => navigate(`${ADMIN_BASE_PATH}/instructors`)}>Добавить инструктора</Button>
                <Button variant="secondary" onClick={() => navigate(`${ADMIN_BASE_PATH}/branches`)}>Добавить филиал</Button>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  )
}
