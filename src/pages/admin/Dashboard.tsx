import { addDays, format, isAfter, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Calendar03Icon, CheckmarkCircle02Icon, Copy01Icon, LinkSquare02Icon, Location01Icon, Settings02Icon, UserMultipleIcon } from '@hugeicons/core-free-icons'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CompactChecklistRow } from '../../components/ui/CompactAdmin'
import { StateView } from '../../components/ui/StateView'
import { useToast } from '../../components/ui/Toast'
import { createHugeIcon } from '../../components/ui/HugeIcon'
import { getUpcomingBookings } from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { db } from '../../services/storage'

const Calendar = createHugeIcon(Calendar03Icon)
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
      { label: 'Данные школы', done: Boolean(school.name && school.phone && school.address), to: `${ADMIN_BASE_PATH}/settings`, icon: Settings, action: 'заполнить' },
      { label: 'Филиал', done: branches.some((branch) => branch.isActive), to: `${ADMIN_BASE_PATH}/branches`, icon: Location, action: 'создать' },
      { label: 'Инструктор', done: instructors.some((instructor) => instructor.isActive), to: `${ADMIN_BASE_PATH}/instructors`, icon: Users, action: 'создать' },
      { label: 'Расписание', done: freeSlots7d.length > 0, to: `${ADMIN_BASE_PATH}/slots`, icon: Calendar, action: 'добавить' },
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
    <div className="min-h-screen bg-[#E9EEF7] px-2.5 py-2.5 md:px-5 md:py-5">
      <div className="mx-auto grid max-w-[1220px] gap-2.5 md:gap-3 ">
        <main className="space-y-2.5 md:space-y-3">
          <section className="rounded-[16px] border border-[#D8E0EC] bg-white p-2.5 text-[#111827] md:p-3">
            <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-[#667085]">{school.name}</p>
                <h1 className="mt-0.5 text-[22px] font-black leading-none tracking-[-0.04em] text-[#111827] md:text-[28px]">Панель школы</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="rounded-[12px] bg-[#2436D9] px-3 py-2 text-[13px] font-black text-white">Добавить время</button>
                  <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="rounded-[12px] border border-[#D8E0EC] bg-white px-3 py-2 text-[13px] font-black text-[#2436D9]">Открыть записи</button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
                <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="rounded-[12px] border border-[#E5EAF1] bg-[#F8FAFC] p-2 text-left text-[#111827]">
                  <Calendar size={16} className="text-[#3156D4]" />
                  <p className="mt-1.5 text-[24px] font-black leading-none tracking-[-0.04em] text-[#111827]">{data.todayBookings.length}</p>
                  <p className="mt-0.5 text-[10px] font-black leading-3 text-[#4B5A70]">занятий сегодня</p>
                </button>
                <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="rounded-[12px] border border-[#E5EAF1] bg-[#F8FAFC] p-2 text-left text-[#111827]">
                  <Calendar size={16} className="text-[#3156D4]" />
                  <p className="mt-1.5 text-[24px] font-black leading-none tracking-[-0.04em]">{data.tomorrowBookings.length}</p>
                  <p className="mt-0.5 text-[10px] font-bold leading-3 text-[#4B5A70]">занятий завтра</p>
                </button>
                <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="rounded-[12px] border border-[#C7E8E7] bg-[#ECFDFD] p-2 text-left text-[#0F766E]">
                  <Check size={16} className="text-white/90" />
                  <p className="mt-1.5 text-[24px] font-black leading-none tracking-[-0.04em]">{data.freeSlots7d.length}</p>
                  <p className="mt-0.5 text-[10px] font-bold leading-3 text-[#0F766E]">свободных окон</p>
                </button>
                <button onClick={() => navigate(`${ADMIN_BASE_PATH}/instructors`)} className="rounded-[12px] border border-[#D8E0EC] bg-[#EEF2FF] p-2 text-left text-[#2436D9]">
                  <Users size={16} className="text-white/85" />
                  <p className="mt-1.5 text-[24px] font-black leading-none tracking-[-0.04em]">{activeInstructors}</p>
                  <p className="mt-0.5 text-[10px] font-bold leading-3 text-[#2436D9]">активных инструкторов</p>
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="rounded-[16px] border border-[#D8E0EC] bg-white p-2.5 md:p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-[16px] font-black tracking-[-0.03em] text-[#111827] md:text-[18px]">Ближайшие занятия</h2>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#8B95A7] md:text-[13px]">дата, ученик, инструктор</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)}>Все</Button>
              </div>

              {data.upcoming.length === 0 ? (
                <div className="mt-2">
                  <StateView title="Занятий пока нет" description="Добавьте свободное время или отправьте ссылку ученикам." />
                </div>
              ) : (
                <div className="mt-2.5 divide-y divide-black/[0.06] overflow-hidden rounded-[14px] border border-[#D8E0EC]">
                  {data.upcoming.map((entry) => (
                    <Link key={entry.booking.id} to={`/booking/${entry.booking.id}`} className="grid grid-cols-[82px_minmax(0,1fr)] gap-2 bg-white px-2.5 py-2 transition hover:bg-[#EEF4FF] md:grid-cols-[122px_minmax(0,1fr)_minmax(120px,0.55fr)_92px] md:items-center md:px-3">
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
              <section className={`overflow-hidden rounded-[16px] border shadow-none ${configuredTone}`}>
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div>
                    <h2 className="text-[16px] font-black tracking-[-0.03em]">Настроено: {configuredCount}/{configuredTotal}</h2>
                    <p className="mt-0.5 text-[11px] font-bold opacity-75">что нужно сделать дальше</p>
                  </div>
                  <Check size={18} />
                </div>
                <div className="border-t border-black/10 bg-white">
                  {data.setupItems.map((item) => (
                    <CompactChecklistRow
                      key={item.label}
                      title={item.label}
                      status={item.done ? 'готово' : 'нужно настроить'}
                      action={item.done ? 'открыть' : item.action}
                      done={item.done}
                      onClick={() => navigate(item.to)}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-[16px] border border-[#D8E0EC] bg-white p-2.5 text-[#111827]">
                <div className="flex items-center gap-2">
                  <ExternalLink size={18} />
                  <div>
                    <h2 className="text-[15px] font-black tracking-[-0.03em] text-[#111827]">Ссылка ученикам</h2>
                    <p className="text-[11px] font-semibold text-[#667085]">для входа в кабинет</p>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 break-all rounded-[12px] bg-[#F8FAFC] px-2.5 py-1.5 text-[11px] font-bold leading-4 text-[#4B5A70]">{publicUrl}</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button onClick={() => void copyPublicLink()} className="rounded-[10px] bg-[#2436D9] px-2 py-1.5 text-[12px] font-black text-white"><Copy size={13} className="mr-1 inline" />Копировать</button>
                  <button onClick={() => window.open(publicUrl, '_blank')} className="rounded-[10px] border border-[#D8E0EC] bg-white px-2 py-1.5 text-[12px] font-black text-[#2436D9]">Открыть</button>
                </div>
              </section>
            </aside>
          </section>
        </main>
      </div>
    </div>
  )
}
