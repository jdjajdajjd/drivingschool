import { addDays, format, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/Badge'
import { getUpcomingBookings } from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { db } from '../../services/storage'

function getSchool() {
  return db.schools.all()[0] ?? null
}

export function AdminDashboard() {
  const school = getSchool()
  const navigate = useNavigate()

  const data = useMemo(() => {
    if (!school) return null

    const now = new Date()
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

    const freeSlots7d = slots.filter((slot) => {
      const startsAt = new Date(`${slot.date}T${slot.time}:00`)
      return slot.status === 'available' && isAfter(startsAt, now) && startsAt <= weekAhead
    })

    function isAfter(d1: Date, d2: Date) {
      return d1.getTime() > d2.getTime()
    }

    const setupItems = [
      {
        label: 'Школа',
        done: Boolean(school.name && school.phone),
        to: `${ADMIN_BASE_PATH}/settings`,
        action: school.name ? 'открыть' : 'заполнить',
      },
      {
        label: 'Филиал',
        done: branches.some((branch) => branch.isActive),
        to: `${ADMIN_BASE_PATH}/branches`,
        action: 'создать',
      },
      {
        label: 'Инструктор',
        done: instructors.some((instructor) => instructor.isActive),
        to: `${ADMIN_BASE_PATH}/instructors`,
        action: 'создать',
      },
      {
        label: 'Расписание',
        done: freeSlots7d.length > 0,
        to: `${ADMIN_BASE_PATH}/slots`,
        action: 'добавить',
      },
    ]

    return {
      branches,
      freeSlots7d,
      instructors,
      setupItems,
      todayBookings,
      upcoming,
    }
  }, [school])

  if (!school || !data) {
    return (
      <div className="px-3 py-4 md:px-6 md:py-5">
        <div className="rounded-[14px] border border-[#D8E0EC] bg-white px-4 py-8 text-center">
          <p className="font-black text-[#111418]">Данные школы не загружены</p>
          <p className="mt-1 text-sm text-[#6F747A]">Проверьте подключение.</p>
        </div>
      </div>
    )
  }

  const activeInstructors = data.instructors.filter((i) => i.isActive).length
  const configuredCount = data.setupItems.filter((item) => item.done).length

  return (
    <div className="px-3 pb-24 pt-3 md:px-5 md:pt-4">
      {/* Header */}
      <div className="mb-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9EA3A8]">{school.name}</p>
        <h1 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-[#111418] md:text-[26px]">Сегодня</h1>
      </div>

      {/* Stat strip */}
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <button
          onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)}
          className="flex flex-col items-start gap-1 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3 text-left transition active:scale-[0.98]"
        >
          <p className="text-[22px] font-black leading-none tracking-[-0.04em] text-[#111418]">{data.todayBookings.length}</p>
          <p className="text-[11px] font-semibold text-[#6F747A]">занятий сегодня</p>
        </button>
        <button
          onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)}
          className="flex flex-col items-start gap-1 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3 text-left transition active:scale-[0.98]"
        >
          <p className="text-[22px] font-black leading-none tracking-[-0.04em] text-[#111418]">{data.freeSlots7d.length}</p>
          <p className="text-[11px] font-semibold text-[#6F747A]">свободных окон</p>
        </button>
        <button
          onClick={() => navigate(`${ADMIN_BASE_PATH}/instructors`)}
          className="flex flex-col items-start gap-1 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3 text-left transition active:scale-[0.98]"
        >
          <p className="text-[22px] font-black leading-none tracking-[-0.04em] text-[#111418]">{activeInstructors}</p>
          <p className="text-[11px] font-semibold text-[#6F747A]">инструкторов</p>
        </button>
        <button
          onClick={() => navigate(`${ADMIN_BASE_PATH}/branches`)}
          className="flex flex-col items-start gap-1 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3 text-left transition active:scale-[0.98]"
        >
          <p className="text-[22px] font-black leading-none tracking-[-0.04em] text-[#111418]">{data.branches.filter((b) => b.isActive).length}</p>
          <p className="text-[11px] font-semibold text-[#6F747A]">филиалов</p>
        </button>
      </div>

      {/* Quick actions */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)}
          className="flex items-center gap-2 rounded-[14px] bg-[#111418] px-4 py-3 text-[13px] font-black text-white transition active:scale-[0.97]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Добавить время
        </button>
        <button
          onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)}
          className="flex items-center gap-2 rounded-[14px] border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 text-[13px] font-black text-[#111418] transition active:scale-[0.97]"
        >
          Все записи
        </button>
      </div>

      {/* Setup checklist */}
      {configuredCount < data.setupItems.length && (
        <div className="mb-4 overflow-hidden rounded-[14px] border border-[#FDE68A] bg-[#FFFBEB]">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="text-[13px] font-black text-[#92400E]">Настроено: {configuredCount}/{data.setupItems.length}</span>
          </div>
          <div className="border-t border-[#FDE68A]">
            {data.setupItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className="flex w-full items-center gap-3 border-b border-[#FDE68A] px-3 py-2.5 text-left last:border-b-0 transition hover:bg-[rgba(251,191,36,0.10)]"
              >
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-[7px] border text-[11px] font-black ${item.done ? 'border-[#15803D] bg-[#F0FDF4] text-[#15803D]' : 'border-[#D0D5DD] bg-white text-transparent'}`}>
                  {item.done ? '✓' : ''}
                </span>
                <span className={`flex-1 text-[14px] font-black ${item.done ? 'text-[#111418]' : 'text-[#92400E]'}`}>{item.label}</span>
                <span className="text-[12px] font-semibold text-[#9EA3A8]">{item.action}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming lessons */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#111418]">Ближайшие занятия</h2>
          <button
            onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)}
            className="text-[12px] font-semibold text-[#3156D4]"
          >
            Все →
          </button>
        </div>

        {data.upcoming.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#CBD5E1] bg-white px-4 py-5 text-center">
            <p className="font-black text-[#111418]">Занятий пока нет</p>
            <p className="mt-1 text-sm text-[#9EA3A8]">Добавьте свободное время ученикам</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.upcoming.map((entry) => (
              <Link
                key={entry.booking.id}
                to={`/booking/${entry.booking.id}`}
                className="flex items-center gap-3 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2.5 transition hover:bg-[#F8FAFC] active:bg-[#F1F2F5]"
              >
                <div className="shrink-0 text-center">
                  <p className="text-[12px] font-black text-[#111418]">
                    {entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'd MMM', { locale: ru }) : '—'}
                  </p>
                  <p className="text-[11px] font-semibold text-[#3156D4]">
                    {entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'HH:mm', { locale: ru }) : '—'}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-black text-[#111418]">{entry.booking.studentName}</p>
                  <p className="truncate text-[12px] font-semibold text-[#6F747A]">
                    {entry.instructor?.name ?? 'Инструктор'} · {entry.branch?.name ?? 'Филиал'}
                  </p>
                </div>
                <StatusBadge status={entry.booking.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
