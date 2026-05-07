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

function setupTone(done: number, total: number) {
  if (done === 0) return 'bg-[#FFE9E7] text-[#D94A38] border-[#F4B2AA]'
  if (done === total) return 'bg-[#EAF7EE] text-[#188447] border-[#A7E0BA]'
  if (done >= Math.ceil(total / 2)) return 'bg-[#FFF4D8] text-[#9A6A00] border-[#F1D27C]'
  return 'bg-[#FFE9E7] text-[#D94A38] border-[#F4B2AA]'
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
      .slice(0, 6)

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
      { label: 'Данные школы', done: Boolean(school.name && school.phone && school.address), to: `${ADMIN_BASE_PATH}/settings`, icon: Settings },
      { label: 'Филиал', done: branches.some((branch) => branch.isActive), to: `${ADMIN_BASE_PATH}/branches`, icon: Location },
      { label: 'Инструктор', done: instructors.some((instructor) => instructor.isActive), to: `${ADMIN_BASE_PATH}/instructors`, icon: Users },
      { label: 'Расписание', done: freeSlots7d.length > 0, to: `${ADMIN_BASE_PATH}/slots`, icon: Calendar },
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
      <div className="p-3 md:p-5">
        <StateView kind="error" title="Школа не найдена" description="Откройте страницу школы или проверьте подключение данных." />
      </div>
    )
  }

  const publicUrl = `${window.location.origin}/school/${school.slug}`
  const activeInstructors = data.instructors.filter((item) => item.isActive).length
  const configuredCount = data.setupItems.filter((item) => item.done).length
  const configuredTotal = data.setupItems.length
  const configuredTone = setupTone(configuredCount, configuredTotal)

  async function copyPublicLink(): Promise<void> {
    await navigator.clipboard.writeText(publicUrl)
    showToast('Ссылка для учеников скопирована.', 'success')
  }

  return (
    <div className="min-h-screen bg-[#F3F6FB] px-2.5 py-2.5 md:px-5 md:py-5">
      <div className="mx-auto grid max-w-[1220px] gap-2.5 md:gap-3 lg:grid-cols-[minmax(0,1fr)_76px]">
        <main className="space-y-2.5 md:space-y-3">
          <section className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[#5DA2FF] via-[#1F67F2] to-[#4539F5] p-3 text-white shadow-[0_14px_34px_rgba(31,103,242,0.22)] md:rounded-[24px] md:p-4">
            <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
            <div className="relative grid gap-3 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold text-white/70">{school.name}</p>
                <h1 className="mt-1 text-[23px] font-black leading-none tracking-[-0.045em] text-white md:text-[34px]">Панель школы</h1>
                <p className="mt-1.5 max-w-xl text-[12px] font-semibold leading-4 text-white/72 md:text-[14px] md:leading-5">
                  Записи, расписание, ученики и инструкторы в одном месте.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="rounded-[13px] bg-white px-3 py-2 text-[13px] font-black text-[#1F67F2]">Добавить время</button>
                  <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="rounded-[13px] bg-white/16 px-3 py-2 text-[13px] font-black text-white">Открыть записи</button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
                <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="rounded-[15px] bg-white/16 p-2.5 text-left backdrop-blur-md">
                  <Calendar size={16} className="text-white/85" />
                  <p className="mt-1.5 text-[24px] font-black leading-none tracking-[-0.04em] text-white">{data.todayBookings.length}</p>
                  <p className="mt-0.5 text-[10px] font-bold leading-3 text-white/70">сегодня</p>
                </button>
                <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="rounded-[15px] bg-white p-2.5 text-left text-[#111827]">
                  <Calendar size={16} className="text-[#3156D4]" />
                  <p className="mt-1.5 text-[24px] font-black leading-none tracking-[-0.04em]">{data.tomorrowBookings.length}</p>
                  <p className="mt-0.5 text-[10px] font-bold leading-3 text-[#7C8799]">завтра</p>
                </button>
                <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="rounded-[15px] bg-[#59BAB9] p-2.5 text-left text-white">
                  <Check size={16} className="text-white/90" />
                  <p className="mt-1.5 text-[24px] font-black leading-none tracking-[-0.04em]">{data.freeSlots7d.length}</p>
                  <p className="mt-0.5 text-[10px] font-bold leading-3 text-white/76">свободно</p>
                </button>
                <button onClick={() => navigate(`${ADMIN_BASE_PATH}/instructors`)} className="rounded-[15px] bg-white/16 p-2.5 text-left text-white backdrop-blur-md">
                  <Users size={16} className="text-white/85" />
                  <p className="mt-1.5 text-[24px] font-black leading-none tracking-[-0.04em]">{activeInstructors}</p>
                  <p className="mt-0.5 text-[10px] font-bold leading-3 text-white/70">инстр.</p>
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="rounded-[18px] bg-white p-3 shadow-[0_12px_30px_rgba(35,47,78,0.07)] md:rounded-[22px] md:p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-[17px] font-black tracking-[-0.035em] text-[#111827] md:text-[20px]">Ближайшие занятия</h2>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#8B95A7] md:text-[13px]">дата, ученик, инструктор</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)}>Все</Button>
              </div>

              {data.upcoming.length === 0 ? (
                <div className="py-5 md:py-7">
                  <StateView title="Занятий пока нет" description="Добавьте свободное время или отправьте ссылку ученикам." />
                </div>
              ) : (
                <div className="mt-2.5 divide-y divide-black/[0.06] overflow-hidden rounded-[14px] border border-black/[0.05]">
                  {data.upcoming.map((entry) => (
                    <Link key={entry.booking.id} to={`/booking/${entry.booking.id}`} className="grid grid-cols-[82px_minmax(0,1fr)] gap-2 bg-[#F8FAFE] px-2.5 py-2 transition hover:bg-[#EEF4FF] md:grid-cols-[122px_minmax(0,1fr)_minmax(120px,0.55fr)_92px] md:items-center md:px-3">
                      <div>
                        <p className="text-[12px] font-black text-[#111827] md:text-[13px]">{entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'd MMM', { locale: ru }) : '—'}</p>
                        <p className="text-[11px] font-bold text-[#3156D4]">{entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'HH:mm', { locale: ru }) : '—'}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-black text-[#111827] md:text-[14px]">{entry.booking.studentName}</p>
                        <p className="truncate text-[11px] font-semibold text-[#8B95A7] md:text-[12px]">{entry.booking.studentPhone}</p>
                      </div>
                      <p className="hidden truncate text-[12px] font-bold text-[#111827] md:block">{entry.instructor?.name ?? 'Инструктор'}</p>
                      <div className="col-start-2 md:col-start-auto"><StatusBadge status={entry.booking.status} /></div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <aside className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              <section className={`rounded-[18px] border p-3 shadow-[0_12px_30px_rgba(35,47,78,0.07)] md:rounded-[22px] ${configuredTone}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[16px] font-black tracking-[-0.03em]">Настроено: {configuredCount}/{configuredTotal}</h2>
                    <p className="mt-0.5 text-[11px] font-bold opacity-75">школа, филиал, инструктор, расписание</p>
                  </div>
                  <Check size={20} />
                </div>
                <div className="mt-2 grid gap-1.5">
                  {data.setupItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <button key={item.label} onClick={() => navigate(item.to)} className="flex items-center justify-between gap-2 rounded-[12px] bg-white/72 px-2.5 py-2 text-left">
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon size={14} className="shrink-0" />
                          <span className="truncate text-[12px] font-black">{item.label}</span>
                        </span>
                        <span className="text-[11px] font-black">{item.done ? '✓' : '!'}</span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="rounded-[18px] bg-[#111827] p-3 text-white shadow-[0_12px_30px_rgba(17,24,39,0.14)] md:rounded-[22px]">
                <div className="flex items-center gap-2">
                  <ExternalLink size={18} />
                  <div>
                    <h2 className="text-[16px] font-black tracking-[-0.03em] text-white">Ссылка ученикам</h2>
                    <p className="text-[11px] font-semibold text-white/55">для входа в кабинет</p>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 break-all rounded-[12px] bg-white/10 px-2.5 py-2 text-[11px] font-bold leading-4 text-white/82">{publicUrl}</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button onClick={() => void copyPublicLink()} className="rounded-[12px] bg-white px-2 py-2 text-[12px] font-black text-[#111827]"><Copy size={13} className="mr-1 inline" />Копировать</button>
                  <button onClick={() => window.open(publicUrl, '_blank')} className="rounded-[12px] bg-white/12 px-2 py-2 text-[12px] font-black text-white">Открыть</button>
                </div>
              </section>
            </aside>
          </section>
        </main>

        <aside className="hidden lg:flex flex-col items-center gap-3 rounded-[24px] bg-[#1026D8] px-2.5 py-4 text-white shadow-[0_18px_50px_rgba(16,38,216,0.22)]">
          <button onClick={() => navigate(ADMIN_BASE_PATH)} className="grid h-12 w-12 place-items-center rounded-[18px] bg-white text-[#1026D8]"><Car size={22} /></button>
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="grid h-10 w-10 place-items-center rounded-[16px] bg-white/15 text-white"><Calendar size={19} /></button>
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="grid h-10 w-10 place-items-center rounded-[16px] bg-white/15 text-white"><Check size={19} /></button>
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/students`)} className="grid h-10 w-10 place-items-center rounded-[16px] bg-white/15 text-white"><Users size={19} /></button>
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/branches`)} className="grid h-10 w-10 place-items-center rounded-[16px] bg-white/15 text-white"><Location size={19} /></button>
        </aside>
      </div>
    </div>
  )
}
