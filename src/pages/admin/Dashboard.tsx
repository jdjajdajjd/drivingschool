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
  critical: { row: 'border-[#CBD5E1] bg-white', tag: 'bg-[#0F172A] text-white', rail: 'bg-[#0F172A]' },
  warning: { row: 'border-[#CBD5E1] bg-white', tag: 'bg-[#334155] text-white', rail: 'bg-[#64748B]' },
  normal: { row: 'border-[#CBD5E1] bg-white', tag: 'bg-[#E2E8F0] text-[#0F172A]', rail: 'bg-[#94A3B8]' },
  ready: { row: 'border-[#CBD5E1] bg-white', tag: 'bg-[#16A34A] text-white', rail: 'bg-[#16A34A]' },
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
    const setupTasks = [
      !school.phone ? { code: 'SCHOOL_PHONE', title: 'Телефон школы', detail: 'Добавьте номер, который увидит ученик.', to: `${ADMIN_BASE_PATH}/settings`, action: 'Заполнить', severity: 'critical' as Severity } : null,
      !branches.some((b) => b.isActive && b.address) ? { code: 'BRANCH', title: 'Филиал и адрес', detail: 'Точка встречи для начала занятия.', to: `${ADMIN_BASE_PATH}/branches`, action: 'Создать', severity: 'critical' as Severity } : null,
      !instructors.some((i) => i.isActive) ? { code: 'INSTRUCTOR', title: 'Инструктор', detail: 'Кто ведёт занятия и принимает записи.', to: `${ADMIN_BASE_PATH}/instructors`, action: 'Добавить', severity: 'critical' as Severity } : null,
      freeSlots7d.length === 0 ? { code: 'SLOTS', title: 'Окна расписания', detail: 'Соберите неделю: даты, время, филиал, инструктор.', to: `${ADMIN_BASE_PATH}/slots`, action: 'Собрать', severity: 'warning' as Severity } : null,
    ].filter(Boolean) as Array<{ code: string; title: string; detail: string; to: string; action: string; severity: Severity }>
    return { branches, instructors, slots, bookings, requests, upcoming, todayBookings, freeSlots7d, setupTasks }
  }, [school, requestRefresh])

  if (!school || !data) {
    return <div className="v-admin-page"><div className="border border-[#CBD5E1] bg-white p-4 font-black">Данные школы не загружены</div></div>
  }

  const activeInstructors = data.instructors.filter((i) => i.isActive).length
  const activeBranches = data.branches.filter((b) => b.isActive).length
  const newRequests = data.requests.filter((r) => r.status === 'new' || r.status === 'reviewing')
  const firstInstructor = data.instructors.find((i) => i.isActive && i.token)
  const isEmptyWorkspace = data.branches.length === 0 && data.instructors.length === 0 && data.slots.length === 0 && data.bookings.length === 0
  const setupDone = 4 - data.setupTasks.length

  const queue = [
    ...data.setupTasks,
    ...newRequests.slice(0, 4).map((request) => ({
      code: request.id,
      title: `${request.type === 'reschedule' ? 'Перенос' : 'Отмена'} от ученика`,
      detail: request.reason || request.comment || 'Разобрать запрос ученика',
      to: `${ADMIN_BASE_PATH}/students/${request.studentId}`,
      action: 'Открыть',
      severity: 'warning' as Severity,
    })),
    data.todayBookings.length === 0 && !isEmptyWorkspace ? { code: 'NO_TODAY', title: 'Сегодня нет занятий', detail: 'Если школа работает сегодня — проверьте расписание и свободные окна.', to: `${ADMIN_BASE_PATH}/slots`, action: 'Окна', severity: 'normal' as Severity } : null,
  ].filter(Boolean) as Array<{ code: string; title: string; detail: string; to: string; action: string; severity: Severity }>

  async function patchRequest(requestId: string, status: 'reviewing' | 'resolved' | 'rejected') {
    const result = await updateStudentRequestStatusAdminConfirmed(school.id, requestId, status)
    if (!result.ok) return
    setRequestRefresh((value) => value + 1)
  }

  if (isEmptyWorkspace) {
    const nextTask = data.setupTasks[0]
    return (
      <div className="min-h-dvh bg-[#F1F5F9] pb-4 text-[#0F172A]">
        <div className="mx-auto max-w-[1180px] p-3 md:p-5">
          <section className="border border-[#0F172A] bg-white">
            <div className="border-b border-[#CBD5E1] p-4 md:p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#64748B]">{school.name || 'Новая автошкола'} · старт настройки</p>
              <h1 className="mt-2 max-w-[720px] text-[28px] font-black leading-none tracking-[-0.055em] text-[#0F172A] md:text-[52px]">Сначала соберите основу школы</h1>
              <p className="mt-3 max-w-[620px] text-[14px] font-bold leading-5 text-[#475569] md:text-[16px]">Пока данных нет, показывать красную “аварию” бессмысленно. Это мастер запуска: телефон, филиал, инструктор, расписание.</p>
            </div>
            <div className="grid border-b border-[#CBD5E1] md:grid-cols-[1fr_300px]">
              <div className="grid grid-cols-4 divide-x divide-[#E2E8F0]">
                {[1, 2, 3, 4].map((step) => <div key={step} className={`min-h-[72px] p-3 ${step <= setupDone ? 'bg-[#DCFCE7]' : 'bg-white'}`}><strong className="block text-[24px] font-black leading-none">{step <= setupDone ? '✓' : step}</strong><span className="text-[10px] font-black uppercase text-[#64748B]">шаг</span></div>)}
              </div>
              <button onClick={() => navigate(nextTask?.to ?? `${ADMIN_BASE_PATH}/settings`)} className="min-h-[72px] bg-[#0F172A] px-4 text-left text-white">
                <span className="block text-[11px] font-black uppercase text-white/50">следующее действие</span>
                <span className="block text-[16px] font-black">{nextTask?.action ?? 'Открыть'} · {nextTask?.title ?? 'Настройки'}</span>
              </button>
            </div>
            <div className="grid md:grid-cols-4">
              {data.setupTasks.map((task, index) => (
                <button key={task.code} onClick={() => navigate(task.to)} className="min-h-[138px] border-b border-r border-[#E2E8F0] p-4 text-left last:border-r-0">
                  <span className="grid h-8 w-8 place-items-center bg-[#0F172A] text-[13px] font-black text-white">{index + 1}</span>
                  <strong className="mt-3 block text-[16px] font-black text-[#0F172A]">{task.title}</strong>
                  <span className="mt-1 block text-[12px] font-bold leading-4 text-[#64748B]">{task.detail}</span>
                  <span className="mt-3 inline-block border border-[#CBD5E1] px-2 py-1 text-[11px] font-black text-[#0F172A]">{task.action}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#E9EDF2] pb-4 text-[#0F172A]">
      <div className="mx-auto grid max-w-[1280px] gap-3 p-3 md:grid-cols-[minmax(0,1fr)_360px] md:p-5">
        <section className="overflow-hidden border border-[#0F172A] bg-[#0F172A] text-white">
          <div className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-[1fr_auto] md:p-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/45">{school.name || 'Новая автошкола'} · оперативная сводка</p>
              <h1 className="mt-2 text-[30px] font-black leading-none tracking-[-0.055em] text-white md:text-[42px]">Пульт смены</h1>
            </div>
            <button type="button" onClick={() => navigate(queue[0]?.to ?? `${ADMIN_BASE_PATH}/bookings`)} className="min-h-[54px] border border-white/10 bg-white px-4 text-left text-[#0F172A]">
              <span className="block text-[11px] font-black uppercase tracking-[0.08em] text-[#64748B]">в работе</span>
              <span className="block text-[15px] font-black">{queue.length ? `${queue.length} действий` : 'всё спокойно'}</span>
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
              <span className="bg-white px-2 py-1 text-[11px] font-black text-[#0F172A]">{queue.length} пунктов</span>
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
            <div className="border-b border-[#CBD5E1] px-4 py-3"><h2 className="text-[16px] font-black">Быстрые операции</h2></div>
            <div className="grid divide-y divide-[#E2E8F0]">
              <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="min-h-[64px] px-4 text-left"><span className="block text-[14px] font-black">Принять звонок</span><span className="block text-[12px] font-bold text-[#64748B]">Создать ученика и запись</span></button>
              <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="min-h-[64px] px-4 text-left"><span className="block text-[14px] font-black">Собрать неделю</span><span className="block text-[12px] font-bold text-[#64748B]">Окна по инструктору и филиалу</span></button>
              <button onClick={() => { window.location.href = firstInstructor ? `/instructor/${firstInstructor.token}` : `${ADMIN_BASE_PATH}/instructors` }} className="min-h-[64px] px-4 text-left"><span className="block text-[14px] font-black">Открыть инструктора</span><span className="block text-[12px] font-bold text-[#64748B]">Маршрут, звонок, SMS, отметка</span></button>
            </div>
          </section>

          <section className="border border-[#CBD5E1] bg-white">
            <div className="border-b border-[#CBD5E1] px-4 py-3"><h2 className="text-[16px] font-black">Ближайшие занятия</h2></div>
            {data.upcoming.length === 0 ? <div className="p-4 text-[13px] font-bold leading-5 text-[#64748B]">Пока пусто. После создания окон и записей здесь будет рабочая лента дня.</div> : (
              <div className="divide-y divide-[#E2E8F0]">{data.upcoming.map((entry) => <button key={entry.booking.id} onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="grid min-h-[64px] w-full grid-cols-[50px_minmax(0,1fr)] gap-2 px-4 py-2 text-left"><span className="text-[12px] font-black text-[#1D4ED8]">{entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'HH:mm', { locale: ru }) : '—'}</span><span className="min-w-0"><span className="block truncate text-[13px] font-black">{entry.booking.studentName}</span><span className="block truncate text-[12px] font-bold text-[#64748B]">{entry.instructor?.name ?? 'Инструктор'} · {entry.branch?.name ?? 'Филиал'}</span></span></button>)}</div>
            )}
          </section>

          {newRequests.length > 0 ? (
            <section className="border border-[#CBD5E1] bg-white">
              <div className="border-b border-[#CBD5E1] px-4 py-3"><h2 className="text-[16px] font-black">Запросы учеников</h2></div>
              {newRequests.slice(0, 3).map((request) => <div key={request.id} className="border-b border-[#E2E8F0] px-4 py-3 last:border-b-0"><p className="text-[13px] font-black">{request.type === 'reschedule' ? 'Перенос' : 'Отмена'}</p><p className="mt-1 text-[12px] font-bold text-[#64748B]">{request.reason || request.comment || 'Без причины'}</p><div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => void patchRequest(request.id, 'reviewing')} className="min-h-9 border border-[#CBD5E1] bg-white text-[12px] font-black text-[#334155]">В работу</button><button onClick={() => void patchRequest(request.id, 'resolved')} className="min-h-9 bg-[#0F172A] text-[12px] font-black text-white">Решено</button></div></div>)}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
