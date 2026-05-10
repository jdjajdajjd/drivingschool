import { addDays, format, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/Badge'
import { getUpcomingBookings } from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { loadStudentRequests, studentRequestStatusLabels, updateStudentRequestStatusAdminConfirmed } from '../../services/studentProfile'
import { db } from '../../services/storage'

function getSchool() {
  return db.schools.all()[0] ?? null
}

export function AdminDashboard() {
  const school = getSchool()
  const navigate = useNavigate()
  const [requestRefresh, setRequestRefresh] = useState(0)

  const data = useMemo(() => {
    if (!school) return null

    const now = new Date()
    const weekAhead = addDays(now, 7)
    const branches = db.branches.bySchool(school.id)
    const instructors = db.instructors.bySchool(school.id)
    const slots = db.slots.bySchool(school.id)
    const bookings = db.bookings.bySchool(school.id)
    const requests = loadStudentRequests(school.id)
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
      return slot.status === 'available' && startsAt.getTime() > now.getTime() && startsAt <= weekAhead
    })

    const setupItems = [
      {
        label: 'Данные школы',
        helper: 'Название, телефон и ссылка для учеников',
        missing: !school.name ? 'Нет названия школы' : !school.phone ? 'Нет телефона для записи' : '',
        done: Boolean(school.name && school.phone),
        to: `${ADMIN_BASE_PATH}/settings`,
        action: school.name && school.phone ? 'Проверить' : 'Заполнить',
        color: 'blue',
      },
      {
        label: 'Филиалы',
        helper: 'Где проходят занятия',
        missing: 'Нет активного филиала с адресом встречи',
        done: branches.some((branch) => branch.isActive),
        to: `${ADMIN_BASE_PATH}/branches`,
        action: 'Добавить',
        color: 'amber',
      },
      {
        label: 'Инструкторы',
        helper: 'Кто ведёт занятия',
        missing: 'Нет активного инструктора для расписания',
        done: instructors.some((instructor) => instructor.isActive),
        to: `${ADMIN_BASE_PATH}/instructors`,
        action: 'Добавить',
        color: 'violet',
      },
      {
        label: 'Расписание',
        helper: 'Свободные окна для записи',
        missing: 'Нет свободных окон на ближайшие 7 дней',
        done: freeSlots7d.length > 0,
        to: `${ADMIN_BASE_PATH}/slots`,
        action: 'Создать',
        color: 'green',
      },
    ]

    return {
      branches,
      freeSlots7d,
      instructors,
      requests,
      setupItems,
      todayBookings,
      upcoming,
    }
  }, [school, requestRefresh])

  if (!school || !data) {
    return (
      <div className="v-admin-page">
        <div className="v-empty">
          <strong>Данные школы не загружены</strong>
          <span>Проверьте подключение и обновите страницу.</span>
        </div>
      </div>
    )
  }

  const activeInstructors = data.instructors.filter((i) => i.isActive).length
  const configuredCount = data.setupItems.filter((item) => item.done).length
  const publicPath = `/school/${school.slug}`
  const openRequests = data.requests.filter((request) => request.status === 'new' || request.status === 'reviewing').slice(0, 4)
  const missingItems = data.setupItems.filter((item) => !item.done)
  const colorMap: Record<string, { card: string; icon: string; action: string; rail: string }> = {
    blue: { card: 'border-[#BFDBFE] bg-[#EFF6FF]', icon: 'bg-[#DBEAFE] text-[#1D4ED8]', action: 'border-[#93C5FD] bg-white text-[#1D4ED8]', rail: 'bg-[#2563EB]' },
    amber: { card: 'border-[#FCD34D] bg-[#FFFBEB]', icon: 'bg-[#FEF3C7] text-[#B45309]', action: 'border-[#FBBF24] bg-white text-[#92400E]', rail: 'bg-[#F59E0B]' },
    violet: { card: 'border-[#DDD6FE] bg-[#F5F3FF]', icon: 'bg-[#EDE9FE] text-[#6D28D9]', action: 'border-[#C4B5FD] bg-white text-[#5B21B6]', rail: 'bg-[#7C3AED]' },
    green: { card: 'border-[#BBF7D0] bg-[#F0FDF4]', icon: 'bg-[#DCFCE7] text-[#15803D]', action: 'border-[#86EFAC] bg-white text-[#166534]', rail: 'bg-[#16A34A]' },
  }

  async function patchRequest(requestId: string, status: 'reviewing' | 'resolved' | 'rejected') {
    const result = await updateStudentRequestStatusAdminConfirmed(school.id, requestId, status)
    if (!result.ok) return
    setRequestRefresh((value) => value + 1)
  }

  return (
    <div className="v-admin-page">
      <section className="v-admin-hero">
        <p className="v-admin-eyebrow">{school.name}</p>
        <h1 className="v-admin-title">Операционный день</h1>
        <p className="v-admin-subtitle">Записи, свободные окна и готовность школы к онлайн-записи.</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button type="button" className="v-primary min-h-[48px] px-4 text-[14px]" onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)}>Создать окно</button>
          <button type="button" className="v-secondary min-h-[48px] px-4 text-[14px]" onClick={() => { window.location.href = publicPath }}>Публичная страница</button>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className={`min-h-[84px] rounded-[12px] border px-3 py-3 text-left ${data.todayBookings.length ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-[#FECACA] bg-[#FEF2F2]'}`}>
          <strong className={`block text-[24px] leading-none ${data.todayBookings.length ? 'text-[#1D4ED8]' : 'text-[#DC2626]'}`}>{data.todayBookings.length}</strong>
          <span className="mt-1 block text-[11px] font-black uppercase tracking-[0.06em] text-[#3F4854]">занятий сегодня</span>
        </button>
        <button type="button" onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className={`min-h-[84px] rounded-[12px] border px-3 py-3 text-left ${data.freeSlots7d.length ? 'border-[#BBF7D0] bg-[#F0FDF4]' : 'border-[#FCD34D] bg-[#FFFBEB]'}`}>
          <strong className={`block text-[24px] leading-none ${data.freeSlots7d.length ? 'text-[#15803D]' : 'text-[#B45309]'}`}>{data.freeSlots7d.length}</strong>
          <span className="mt-1 block text-[11px] font-black uppercase tracking-[0.06em] text-[#3F4854]">свободных окон</span>
        </button>
        <button type="button" onClick={() => navigate(`${ADMIN_BASE_PATH}/instructors`)} className={`min-h-[84px] rounded-[12px] border px-3 py-3 text-left ${activeInstructors ? 'border-[#DDD6FE] bg-[#F5F3FF]' : 'border-[#FCD34D] bg-[#FFFBEB]'}`}>
          <strong className={`block text-[24px] leading-none ${activeInstructors ? 'text-[#6D28D9]' : 'text-[#B45309]'}`}>{activeInstructors}</strong>
          <span className="mt-1 block text-[11px] font-black uppercase tracking-[0.06em] text-[#3F4854]">инструкторов</span>
        </button>
        <button type="button" onClick={() => navigate(`${ADMIN_BASE_PATH}/branches`)} className={`min-h-[84px] rounded-[12px] border px-3 py-3 text-left ${data.branches.some((b) => b.isActive) ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-[#FCD34D] bg-[#FFFBEB]'}`}>
          <strong className={`block text-[24px] leading-none ${data.branches.some((b) => b.isActive) ? 'text-[#1D4ED8]' : 'text-[#B45309]'}`}>{data.branches.filter((b) => b.isActive).length}</strong>
          <span className="mt-1 block text-[11px] font-black uppercase tracking-[0.06em] text-[#3F4854]">филиалов</span>
        </button>
      </section>

      {missingItems.length > 0 ? (
        <section className="mt-4 rounded-[14px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-[#DC2626] text-[18px] font-black text-white">!</div>
            <div>
              <h2 className="text-[18px] font-black leading-tight text-[#111418]">Сначала закрыть незаполненное</h2>
              <p className="mt-1 text-[13px] font-bold leading-5 text-[#7F1D1D]">Без этих пунктов админка выглядит пустой, а ученик/инструктор не понимают, что делать.</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {missingItems.map((item) => {
              const c = colorMap[item.color] ?? colorMap.amber
              return (
                <button key={item.label} type="button" onClick={() => navigate(item.to)} className={`relative grid min-h-[76px] w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-[12px] border px-3 text-left ${c.card}`}>
                  <span className={`absolute left-0 top-0 h-full w-1.5 ${c.rail}`} />
                  <span className={`grid h-9 w-9 place-items-center rounded-[9px] text-[15px] font-black ${c.icon}`}>!</span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-black text-[#111418]">{item.label}</span>
                    <span className="mt-0.5 block text-[12px] font-bold leading-4 text-[#5F6875]">{item.missing || item.helper}</span>
                  </span>
                  <span className={`grid min-h-10 place-items-center rounded-[8px] border px-3 text-[12px] font-black ${c.action}`}>{item.action}</span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-4 grid gap-2.5">
        <button type="button" className="min-h-[76px] rounded-[12px] border border-[#BFDBFE] bg-[#EFF6FF] px-4 text-left" onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)}>
          <span className="block text-[15px] font-black text-[#1D4ED8]">Создать расписание</span>
          <span className="mt-1 block text-[12px] font-bold text-[#3F4854]">Серия окон на неделю или месяц</span>
        </button>
        <button type="button" className="min-h-[76px] rounded-[12px] border border-[#BBF7D0] bg-[#F0FDF4] px-4 text-left" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)}>
          <span className="block text-[15px] font-black text-[#15803D]">Записать ученика</span>
          <span className="mt-1 block text-[12px] font-bold text-[#3F4854]">Звонок, SMS или ручная запись администратора</span>
        </button>
      </section>

      {openRequests.length > 0 ? (
        <section className="mt-5 overflow-hidden v-panel border-[#F6D99D]">
          <div className="border-b border-[#F6D99D] bg-[#FFF8E6] px-4 py-4">
            <h2 className="text-[19px] font-black leading-tight tracking-[-0.035em] text-[#111418]">Запросы учеников</h2>
            <p className="mt-1 text-[13px] font-bold text-[#7A5607]">То, что администратор должен разобрать: переносы и отмены.</p>
          </div>
          <div>
            {openRequests.map((request) => {
              const student = db.students.byId(request.studentId)
              const booking = request.bookingId ? db.bookings.byId(request.bookingId) : null
              const slot = booking ? db.slots.byId(booking.slotId) : null
              return (
                <div key={request.id} className="border-b border-[#EEF0F4] px-4 py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-black text-[#111418]">{request.type === 'reschedule' ? 'Перенос' : 'Отмена'} · {student?.name ?? 'Ученик'}</p>
                      <p className="mt-1 text-[12px] font-bold leading-5 text-[#5F6875]">{slot ? `${format(new Date(`${slot.date}T${slot.time}:00`), 'd MMM, HH:mm', { locale: ru })} · ` : ''}{request.reason || request.comment || 'причина не указана'}</p>
                    </div>
                    <span className="shrink-0 rounded-[7px] bg-[#F1F2F5] px-2 py-1 text-[11px] font-black text-[#3F4854]">{studentRequestStatusLabels[request.status]}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => void patchRequest(request.id, 'reviewing')} className="min-h-10 rounded-[8px] border border-[#D8DEE8] bg-white px-2 text-[12px] font-black text-[#111418]">В работу</button>
                    <button type="button" onClick={() => void patchRequest(request.id, 'resolved')} className="min-h-10 rounded-[8px] bg-[#1F3A8A] px-2 text-[12px] font-black text-white">Решено</button>
                    <button type="button" onClick={() => void patchRequest(request.id, 'rejected')} className="min-h-10 rounded-[8px] border border-[#F3B7B3] bg-white px-2 text-[12px] font-black text-[#C6372E]">Отклонить</button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {configuredCount < data.setupItems.length ? (
        <section className="mt-5 overflow-hidden rounded-[14px] border border-[#D8DEE8] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#D8DEE8] bg-[#F8FAFC] px-4 py-4">
            <div>
              <h2 className="text-[19px] font-black leading-tight tracking-[-0.035em] text-[#111418]">Готовность системы</h2>
              <p className="mt-1 text-[13px] font-bold text-[#5F6875]">{configuredCount}/{data.setupItems.length} параметра настроены</p>
            </div>
            <div className="grid h-10 w-14 place-items-center rounded-[8px] border border-[#D8DEE8] bg-white text-[13px] font-black text-[#111418]">{configuredCount}/{data.setupItems.length}</div>
          </div>
          <div className="space-y-2 p-3">
            {data.setupItems.map((item) => {
              const c = colorMap[item.color] ?? colorMap.amber
              return (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => navigate(item.to)}
                  className={`relative grid min-h-[72px] w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-[12px] border px-3 text-left ${item.done ? 'border-[#BBF7D0] bg-[#F0FDF4]' : c.card}`}
                >
                  <span className={`absolute left-0 top-0 h-full w-1 ${item.done ? 'bg-[#16A34A]' : c.rail}`} />
                  <span className={`grid h-8 w-8 place-items-center rounded-[8px] text-[14px] font-black ${item.done ? 'bg-[#DCFCE7] text-[#15803D]' : c.icon}`}>
                    {item.done ? '✓' : '!'}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-black text-[#111418]">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[12px] font-bold text-[#5F6875]">{item.done ? item.helper : item.missing}</span>
                  </span>
                  <span className={`grid min-h-10 place-items-center rounded-[8px] border px-3 text-[12px] font-black ${item.done ? 'border-[#86EFAC] bg-white text-[#166534]' : c.action}`}>{item.action}</span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      <section>
        <div className="v-section-head">
          <h2 className="v-section-title">Ближайшие занятия</h2>
          <button type="button" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="v-section-link">Все записи</button>
        </div>

        {data.upcoming.length === 0 ? (
          <div className="v-empty">
            <strong>Занятий пока нет</strong>
            <span>Добавьте расписание, и ученики смогут записаться онлайн.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.upcoming.map((entry) => (
              <Link
                key={entry.booking.id}
                to={`/booking/${entry.booking.id}`}
                className="grid min-h-[74px] grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] border border-[#E7E9EF] bg-white px-3.5 shadow-[0_10px_30px_rgba(15,20,25,0.045)] active:scale-[0.995]"
              >
                <div className="text-center">
                  <p className="text-[12px] font-black text-[#111418]">
                    {entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'd MMM', { locale: ru }) : '—'}
                  </p>
                  <p className="text-[12px] font-black text-[#2442D8]">
                    {entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'HH:mm', { locale: ru }) : '—'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-black text-[#111418]">{entry.booking.studentName}</p>
                  <p className="mt-0.5 truncate text-[12px] font-bold text-[#737985]">
                    {entry.instructor?.name ?? 'Инструктор'} · {entry.branch?.name ?? 'Филиал'}
                  </p>
                </div>
                <StatusBadge status={entry.booking.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
