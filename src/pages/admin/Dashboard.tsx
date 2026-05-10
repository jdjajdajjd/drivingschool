import { addDays, format, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUpcomingBookings } from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { loadStudentRequests, updateStudentRequestStatusAdminConfirmed } from '../../services/studentProfile'
import { db } from '../../services/storage'

function getSchool() {
  return db.schools.all()[0] ?? null
}

type Severity = 'critical' | 'warning' | 'normal' | 'ready'

const severityClass: Record<Severity, { row: string; tag: string; rail: string }> = {
  critical: { row: 'border-[#DC2626] bg-[#FFF1F1]', tag: 'bg-[#DC2626] text-white', rail: 'bg-[#DC2626]' },
  warning: { row: 'border-[#D97706] bg-[#FFF7E6]', tag: 'bg-[#D97706] text-white', rail: 'bg-[#D97706]' },
  normal: { row: 'border-[#CBD5E1] bg-white', tag: 'bg-[#E2E8F0] text-[#0F172A]', rail: 'bg-[#64748B]' },
  ready: { row: 'border-[#16A34A] bg-[#F0FDF4]', tag: 'bg-[#16A34A] text-white', rail: 'bg-[#16A34A]' },
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
    const upcoming = getUpcomingBookings(school.id).filter((entry) => entry.booking.status === 'active').slice(0, 8)
    const todayBookings = activeBookings.filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return slot ? isSameDay(new Date(`${slot.date}T${slot.time}:00`), now) : false
    })
    const freeSlots7d = slots.filter((slot) => {
      const startsAt = new Date(`${slot.date}T${slot.time}:00`)
      return slot.status === 'available' && startsAt.getTime() > now.getTime() && startsAt <= weekAhead
    })
    const missing = [
      !school.phone ? { code: 'SCHOOL_PHONE', title: 'Нет телефона школы', detail: 'Ученику некуда звонить. Заполнить в настройках.', to: `${ADMIN_BASE_PATH}/settings`, action: 'Настройки', severity: 'critical' as Severity } : null,
      !branches.some((b) => b.isActive && b.address) ? { code: 'BRANCH', title: 'Нет рабочей точки встречи', detail: 'Филиал нужен для адреса начала занятия.', to: `${ADMIN_BASE_PATH}/branches`, action: 'Филиалы', severity: 'critical' as Severity } : null,
      !instructors.some((i) => i.isActive) ? { code: 'INSTRUCTOR', title: 'Нет активного инструктора', detail: 'Без инструктора нельзя собрать расписание.', to: `${ADMIN_BASE_PATH}/instructors`, action: 'Инструкторы', severity: 'critical' as Severity } : null,
      freeSlots7d.length === 0 ? { code: 'SLOTS', title: 'Нет свободных окон на неделю', detail: 'Создайте окна: дата, время, инструктор, филиал.', to: `${ADMIN_BASE_PATH}/slots`, action: 'Создать окна', severity: 'warning' as Severity } : null,
    ].filter(Boolean) as Array<{ code: string; title: string; detail: string; to: string; action: string; severity: Severity }>
    return { branches, instructors, slots, bookings, requests, upcoming, todayBookings, freeSlots7d, missing }
  }, [school, requestRefresh])

  if (!school || !data) {
    return <div className="v-admin-page"><div className="border border-[#CBD5E1] bg-white p-4 font-black">Данные школы не загружены</div></div>
  }

  const activeInstructors = data.instructors.filter((i) => i.isActive).length
  const activeBranches = data.branches.filter((b) => b.isActive).length
  const newRequests = data.requests.filter((r) => r.status === 'new' || r.status === 'reviewing')
  const firstInstructor = data.instructors.find((i) => i.isActive && i.token)
  const shiftState = data.missing.length > 0 ? 'НЕ ГОТОВА К ЗАПИСИ' : 'ГОТОВА К РАБОТЕ'
  const shiftSeverity: Severity = data.missing.some((m) => m.severity === 'critical') ? 'critical' : data.missing.length ? 'warning' : 'ready'

  const queue = [
    ...data.missing,
    ...newRequests.slice(0, 4).map((request) => ({
      code: request.id,
      title: `${request.type === 'reschedule' ? 'Перенос' : 'Отмена'} от ученика`,
      detail: request.reason || request.comment || 'Разобрать запрос ученика',
      to: `${ADMIN_BASE_PATH}/students/${request.studentId}`,
      action: 'Открыть',
      severity: 'warning' as Severity,
    })),
    data.todayBookings.length === 0 ? { code: 'NO_TODAY', title: 'Сегодня нет занятий', detail: 'Если школа работает сегодня — проверьте расписание и свободные окна.', to: `${ADMIN_BASE_PATH}/slots`, action: 'Окна', severity: 'normal' as Severity } : null,
  ].filter(Boolean) as Array<{ code: string; title: string; detail: string; to: string; action: string; severity: Severity }>

  async function patchRequest(requestId: string, status: 'reviewing' | 'resolved' | 'rejected') {
    const result = await updateStudentRequestStatusAdminConfirmed(school.id, requestId, status)
    if (!result.ok) return
    setRequestRefresh((value) => value + 1)
  }

  return (
    <div className="min-h-dvh bg-[#E9EDF2] pb-4 text-[#0F172A]">
      <div className="mx-auto grid max-w-[1280px] gap-3 p-3 md:grid-cols-[minmax(0,1fr)_360px] md:p-5">
        <section className="overflow-hidden border border-[#0F172A] bg-[#0F172A] text-white">
          <div className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-[1fr_auto] md:p-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/45">{school.name || 'Новая автошкола'} · оперативная сводка</p>
              <h1 className="mt-2 text-[30px] font-black leading-none tracking-[-0.055em] text-white md:text-[42px]">Смена автошколы</h1>
            </div>
            <button type="button" onClick={() => navigate(data.missing[0]?.to ?? `${ADMIN_BASE_PATH}/bookings`)} className={`min-h-[54px] border px-4 text-left ${severityClass[shiftSeverity].tag}`}>
              <span className="block text-[11px] font-black uppercase tracking-[0.08em] opacity-70">статус</span>
              <span className="block text-[15px] font-black">{shiftState}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 border-b border-white/10 md:grid-cols-4">
            {[
              ['Сегодня', data.todayBookings.length, 'занятий'],
              ['Окна', data.freeSlots7d.length, 'свободно'],
              ['Инструкторы', activeInstructors, 'в работе'],
              ['Филиалы', activeBranches, 'активно'],
            ].map(([label, value, sub]) => (
              <button key={label} type="button" onClick={() => navigate(label === 'Окна' ? `${ADMIN_BASE_PATH}/slots` : label === 'Инструкторы' ? `${ADMIN_BASE_PATH}/instructors` : label === 'Филиалы' ? `${ADMIN_BASE_PATH}/branches` : `${ADMIN_BASE_PATH}/bookings`)} className="min-h-[92px] border-r border-t border-white/10 p-4 text-left last:border-r-0 md:border-t-0">
                <strong className="block text-[34px] font-black leading-none tracking-[-0.05em] text-white">{value}</strong>
                <span className="mt-2 block text-[11px] font-black uppercase tracking-[0.08em] text-white/48">{label}</span>
                <span className="block text-[12px] font-bold text-white/68">{sub}</span>
              </button>
            ))}
          </div>

          <div className="p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-black text-white">Очередь действий</h2>
              <span className="rounded-none bg-white px-2 py-1 text-[11px] font-black text-[#0F172A]">{queue.length} пунктов</span>
            </div>
            <div className="space-y-2">
              {queue.map((item, index) => {
                const s = severityClass[item.severity]
                return (
                  <button key={item.code} type="button" onClick={() => navigate(item.to)} className={`relative grid min-h-[74px] w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border px-3 text-left ${s.row}`}>
                    <span className={`absolute left-0 top-0 h-full w-1 ${s.rail}`} />
                    <span className={`grid h-8 w-8 place-items-center text-[13px] font-black ${s.tag}`}>{index + 1}</span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-black leading-5 text-[#0F172A]">{item.title}</span>
                      <span className="mt-0.5 block text-[12px] font-bold leading-4 text-[#475569]">{item.detail}</span>
                    </span>
                    <span className="border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] font-black text-[#0F172A]">{item.action}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-3">
          <section className="border border-[#CBD5E1] bg-white">
            <div className="border-b border-[#CBD5E1] px-4 py-3">
              <h2 className="text-[16px] font-black">Быстрые операции</h2>
            </div>
            <div className="grid divide-y divide-[#E2E8F0]">
              <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="min-h-[64px] px-4 text-left">
                <span className="block text-[14px] font-black">Принять звонок</span>
                <span className="block text-[12px] font-bold text-[#64748B]">Создать ученика и запись</span>
              </button>
              <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="min-h-[64px] px-4 text-left">
                <span className="block text-[14px] font-black">Собрать неделю</span>
                <span className="block text-[12px] font-bold text-[#64748B]">Окна по инструктору и филиалу</span>
              </button>
              <button onClick={() => { window.location.href = firstInstructor ? `/instructor/${firstInstructor.token}` : `${ADMIN_BASE_PATH}/instructors` }} className="min-h-[64px] px-4 text-left">
                <span className="block text-[14px] font-black">Открыть инструктора</span>
                <span className="block text-[12px] font-bold text-[#64748B]">Маршрут, звонок, SMS, отметка</span>
              </button>
            </div>
          </section>

          <section className="border border-[#CBD5E1] bg-white">
            <div className="border-b border-[#CBD5E1] px-4 py-3">
              <h2 className="text-[16px] font-black">Ближайшие занятия</h2>
            </div>
            {data.upcoming.length === 0 ? (
              <div className="p-4 text-[13px] font-bold leading-5 text-[#64748B]">Пока пусто. После создания окон и записей здесь будет рабочая лента дня.</div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {data.upcoming.map((entry) => (
                  <button key={entry.booking.id} onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="grid min-h-[64px] w-full grid-cols-[50px_minmax(0,1fr)] gap-2 px-4 py-2 text-left">
                    <span className="text-[12px] font-black text-[#1D4ED8]">{entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'HH:mm', { locale: ru }) : '—'}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-black">{entry.booking.studentName}</span>
                      <span className="block truncate text-[12px] font-bold text-[#64748B]">{entry.instructor?.name ?? 'Инструктор'} · {entry.branch?.name ?? 'Филиал'}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {newRequests.length > 0 ? (
            <section className="border border-[#D97706] bg-[#FFFBEB]">
              <div className="border-b border-[#FBBF24] px-4 py-3">
                <h2 className="text-[16px] font-black">Запросы учеников</h2>
              </div>
              {newRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="border-b border-[#FDE68A] px-4 py-3 last:border-b-0">
                  <p className="text-[13px] font-black">{request.type === 'reschedule' ? 'Перенос' : 'Отмена'}</p>
                  <p className="mt-1 text-[12px] font-bold text-[#64748B]">{request.reason || request.comment || 'Без причины'}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button onClick={() => void patchRequest(request.id, 'reviewing')} className="min-h-9 border border-[#D97706] bg-white text-[12px] font-black text-[#92400E]">В работу</button>
                    <button onClick={() => void patchRequest(request.id, 'resolved')} className="min-h-9 bg-[#0F172A] text-[12px] font-black text-white">Решено</button>
                  </div>
                </div>
              ))}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
