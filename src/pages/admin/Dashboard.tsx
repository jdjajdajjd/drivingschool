import { addDays, format, isAfter, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Calendar03Icon, Car04Icon, CheckmarkCircle02Icon, Copy01Icon, LinkSquare02Icon, Location01Icon, Search01Icon, UserMultipleIcon, Wallet02Icon } from '@hugeicons/core-free-icons'
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
const Search = createHugeIcon(Search01Icon)
const Users = createHugeIcon(UserMultipleIcon)
const Wallet = createHugeIcon(Wallet02Icon)

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
      .slice(0, 4)

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

    return {
      branches,
      freeSlots7d,
      instructors,
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
  const activeInstructors = data.instructors.filter((item) => item.isActive).length

  async function copyPublicLink(): Promise<void> {
    await navigator.clipboard.writeText(publicUrl)
    showToast('Ссылка для учеников скопирована.', 'success')
  }

  return (
    <div className="min-h-screen bg-[#F3F6FB] px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto grid max-w-[1180px] gap-4 lg:grid-cols-[minmax(0,1fr)_86px]">
        <main className="space-y-3">
          <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#5DA2FF] via-[#1F67F2] to-[#4539F5] p-4 text-white shadow-[0_20px_48px_rgba(31,103,242,0.24)] md:rounded-[32px] md:p-6">
            <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute right-8 bottom-7 h-20 w-20 rounded-full bg-[#81C8FF]/25 blur-xl" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-bold text-white/70">{school.name}</p>
                <h1 className="mt-2 max-w-[520px] text-[28px] font-black leading-[0.96] tracking-[-0.055em] text-white md:text-[46px]">
                  Панель школы
                </h1>
                <p className="mt-2 max-w-xl text-[13px] font-semibold leading-5 text-white/72 md:text-[15px] md:leading-6">
                  Записи, расписание, ученики и инструкторы в одном месте.
                </p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/18 text-white backdrop-blur">
                <Search size={20} />
              </button>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2 md:mt-6 md:gap-3">
              <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="rounded-[20px] bg-white/18 p-3 text-left backdrop-blur-md transition hover:bg-white/24">
                <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-white text-[#1F67F2]"><Calendar size={18} /></div>
                <p className="mt-3 text-[28px] font-black leading-none tracking-[-0.055em] md:text-[34px] text-white">{data.todayBookings.length}</p>
                <p className="mt-1 text-[12px] font-bold md:text-sm text-white/70">занятий сегодня</p>
              </button>
              <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="rounded-[20px] bg-white p-3 text-left text-[#131722] shadow-[0_16px_36px_rgba(10,28,80,0.14)] transition hover:-translate-y-0.5">
                <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-[#EAF0FF] text-[#3156D4]"><Check size={18} /></div>
                <p className="mt-3 text-[28px] font-black leading-none tracking-[-0.055em] md:text-[34px]">{data.freeSlots7d.length}</p>
                <p className="mt-1 text-[12px] font-bold md:text-sm text-[#7C8799]">свободных окон</p>
              </button>
              <button onClick={() => navigate(`${ADMIN_BASE_PATH}/instructors`)} className="rounded-[20px] bg-[#59BAB9] p-3 text-left text-white shadow-[0_16px_36px_rgba(89,186,185,0.26)] transition hover:-translate-y-0.5">
                <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-white/24 text-white"><Users size={18} /></div>
                <p className="mt-3 text-[28px] font-black leading-none tracking-[-0.055em] md:text-[34px]">{activeInstructors}</p>
                <p className="mt-1 text-[12px] font-bold md:text-sm text-white/78">инструкторов</p>
              </button>
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(290px,0.65fr)]">
            <div className="rounded-[24px] bg-white p-3.5 shadow-[0_14px_38px_rgba(35,47,78,0.08)] md:rounded-[30px] md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-black md:text-[22px] tracking-[-0.04em] text-[#111827]">Ближайшие занятия</h2>
                  <p className="mt-0.5 text-[12px] font-semibold md:mt-1 md:text-sm text-[#8B95A7]">Кто едет, куда и к какому инструктору</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)}>Все</Button>
              </div>

              {data.upcoming.length === 0 ? (
                <div className="py-8">
                  <StateView title="Занятий пока нет" description="Добавьте свободное время или отправьте ссылку ученикам." />
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {data.upcoming.map((entry) => (
                    <Link key={entry.booking.id} to={`/booking/${entry.booking.id}`} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 rounded-[18px] bg-[#F6F8FC] p-2.5 md:rounded-[24px] md:p-3 transition hover:bg-[#EEF4FF] md:grid-cols-[52px_minmax(0,1fr)_auto] md:items-center">
                      <div className="grid h-10 w-10 place-items-center rounded-[15px] bg-[#EAF0FF] text-[#3156D4]"><Car size={22} /></div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-black md:text-[15px] text-[#111827]">{entry.booking.studentName}</p>
                        <p className="mt-0.5 text-sm font-semibold text-[#8B95A7]">
                          {entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'd MMM, HH:mm', { locale: ru }) : 'Время не найдено'} · {entry.instructor?.name ?? 'Инструктор'}
                        </p>
                      </div>
                      <div className="col-start-2 md:col-start-auto"><StatusBadge status={entry.booking.status} /></div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <section className="rounded-[24px] bg-white p-3.5 shadow-[0_14px_38px_rgba(35,47,78,0.08)] md:rounded-[30px] md:p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-[19px] bg-[#FFF0D8] text-[#C26A00]"><Wallet size={22} /></div>
                  <div>
                    <h2 className="text-[21px] font-black tracking-[-0.04em] text-[#111827]">Завтра</h2>
                    <p className="text-sm font-semibold text-[#8B95A7]">план на следующий день</p>
                  </div>
                </div>
                <div className="mt-3 rounded-[20px] bg-[#F7F8FC] p-3">
                  <p className="text-[32px] font-black leading-none tracking-[-0.055em] md:text-[42px] text-[#111827]">{data.tomorrowBookings.length}</p>
                  <p className="mt-1 text-[12px] font-bold md:text-sm text-[#8B95A7]">занятий запланировано</p>
                </div>
              </section>

              <section className="rounded-[30px] bg-[#111827] p-4 text-white shadow-[0_20px_55px_rgba(17,24,39,0.18)] md:p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-[19px] bg-white/12 text-white"><ExternalLink size={22} /></div>
                  <div>
                    <h2 className="text-[21px] font-black tracking-[-0.04em] text-white">Ссылка ученикам</h2>
                    <p className="text-sm font-semibold text-white/55">для входа в кабинет</p>
                  </div>
                </div>
                <p className="mt-3 break-all rounded-[16px] bg-white/10 px-3 py-2.5 text-sm font-bold leading-5 text-white/82">{publicUrl}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button onClick={() => void copyPublicLink()} className="rounded-[15px] bg-white px-3 py-2.5 text-sm font-black text-[#111827]"><Copy size={15} className="mr-1 inline" />Копировать</button>
                  <button onClick={() => window.open(publicUrl, '_blank')} className="rounded-[15px] bg-white/12 px-3 py-2.5 text-sm font-black text-white">Открыть</button>
                </div>
              </section>
            </div>
          </section>
        </main>

        <aside className="hidden lg:flex flex-col items-center gap-4 rounded-[32px] bg-[#1026D8] px-3 py-5 text-white shadow-[0_24px_70px_rgba(16,38,216,0.25)]">
          <button onClick={() => navigate(ADMIN_BASE_PATH)} className="grid h-14 w-14 place-items-center rounded-[22px] bg-white text-[#1026D8]"><Car size={24} /></button>
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="grid h-12 w-12 place-items-center rounded-[20px] bg-white/15 text-white"><Calendar size={22} /></button>
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="grid h-12 w-12 place-items-center rounded-[20px] bg-white/15 text-white"><Check size={22} /></button>
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/students`)} className="grid h-12 w-12 place-items-center rounded-[20px] bg-white/15 text-white"><Users size={22} /></button>
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/branches`)} className="grid h-12 w-12 place-items-center rounded-[20px] bg-white/15 text-white"><Location size={22} /></button>
        </aside>
      </div>
    </div>
  )
}
