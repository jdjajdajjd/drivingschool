import { addDays, format, isBefore, isSameDay, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { getSlotDateTime, getUpcomingBookings } from '../../services/bookingService'
import { loadStudentRequests, updateStudentRequestStatusAdminConfirmed } from '../../services/studentProfile'
import { db } from '../../services/storage'

function getSchool() {
  return db.schools.all()[0] ?? null
}

type SetupStep = {
  id: string
  title: string
  text: string
  done: boolean
  to: string
  action: string
}

type AttentionItem = {
  id: string
  title: string
  text: string
  to: string
  action: string
  tone?: 'default' | 'warning' | 'danger'
}

export function AdminDashboard() {
  const school = getSchool()
  const navigate = useNavigate()
  const [requestRefresh, setRequestRefresh] = useState(0)

  const data = useMemo(() => {
    if (!school) return null
    const now = new Date()
    const branches = db.branches.bySchool(school.id)
    const instructors = db.instructors.bySchool(school.id)
    const slots = db.slots.bySchool(school.id)
    const bookings = db.bookings.bySchool(school.id)
    const requests = loadStudentRequests(school.id)
    const upcoming = getUpcomingBookings(school.id).filter((entry) => entry.booking.status === 'active')
    const today = upcoming.filter((entry) => entry.slot && isSameDay(getSlotDateTime(entry.slot), now))
    const freeWeek = slots.filter((slot) => {
      const startsAt = getSlotDateTime(slot)
      return slot.status === 'available' && startsAt > now && startsAt <= addDays(now, 7)
    })
    const overdue = bookings.filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return booking.status === 'active' && slot && isBefore(getSlotDateTime(slot), startOfDay(now))
    })
    const setup: SetupStep[] = [
      { id: 'contacts', title: 'Контакты школы', text: 'Телефон и публичная страница, чтобы ученики понимали куда обращаться.', done: Boolean(school.phone), to: `${ADMIN_BASE_PATH}/settings`, action: 'Заполнить' },
      { id: 'branch', title: 'Филиал и место встречи', text: 'Адрес начала занятия, который увидят ученик и инструктор.', done: branches.some((branch) => branch.isActive && branch.address), to: `${ADMIN_BASE_PATH}/branches`, action: 'Создать' },
      { id: 'instructor', title: 'Инструктор', text: 'Кто проводит занятия, принимает звонки и закрывает уроки.', done: instructors.some((instructor) => instructor.isActive), to: `${ADMIN_BASE_PATH}/instructors`, action: 'Добавить' },
      { id: 'schedule', title: 'Первые окна расписания', text: 'Свободное время, куда можно записать ученика.', done: freeWeek.length > 0, to: `${ADMIN_BASE_PATH}/slots`, action: 'Собрать' },
    ]
    return { branches, instructors, slots, bookings, requests, upcoming, today, freeWeek, overdue, setup }
  }, [school, requestRefresh])

  if (!school || !data) {
    return <div className="v-admin-page"><div className="v-panel p-4 font-black">Данные школы не загружены</div></div>
  }

  const doneSteps = data.setup.filter((step) => step.done).length
  const nextStep = data.setup.find((step) => !step.done)
  const isSetupMode = doneSteps < data.setup.length
  const openRequests = data.requests.filter((request) => request.status === 'new' || request.status === 'reviewing')
  const nextLesson = data.upcoming[0]
  const firstInstructor = data.instructors.find((i) => i.isActive && i.token)

  const attention: AttentionItem[] = [
    ...data.overdue.slice(0, 3).map((booking) => ({
      id: `overdue-${booking.id}`,
      title: 'Прошедшее занятие не закрыто',
      text: `${booking.studentName} · нужно отметить проведено или отменить`,
      to: `${ADMIN_BASE_PATH}/bookings`,
      action: 'Открыть',
      tone: 'danger' as const,
    })),
    ...openRequests.slice(0, 4).map((request) => ({
      id: request.id,
      title: request.type === 'reschedule' ? 'Ученик просит перенос' : 'Ученик просит отмену',
      text: request.reason || request.comment || 'Разберите запрос и ответьте ученику',
      to: `${ADMIN_BASE_PATH}/students/${request.studentId}`,
      action: 'Разобрать',
      tone: 'warning' as const,
    })),
    data.freeWeek.length === 0 ? { id: 'no-slots', title: 'Нет свободных окон на 7 дней', text: 'Запись остановится, если не собрать расписание.', to: `${ADMIN_BASE_PATH}/slots`, action: 'Собрать', tone: 'warning' as const } : null,
  ].filter(Boolean) as AttentionItem[]

  async function patchRequest(requestId: string, status: 'reviewing' | 'resolved' | 'rejected') {
    const result = await updateStudentRequestStatusAdminConfirmed(school.id, requestId, status)
    if (!result.ok) return
    setRequestRefresh((value) => value + 1)
  }

  if (isSetupMode) {
    return (
      <div className="v-admin-page">
        <section className="overflow-hidden rounded-[18px] border border-[#E4E7EC] bg-white">
          <div className="p-5 md:p-8">
            <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#667085]">Новая автошкола</p>
            <h1 className="mt-2 max-w-[760px] text-[32px] font-black leading-[0.95] tracking-[-0.055em] text-[#111827] md:text-[56px]">Запуск школы</h1>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => navigate(nextStep?.to ?? `${ADMIN_BASE_PATH}/bookings`)} className="min-h-12 rounded-[12px] bg-[#111827] px-5 text-[14px] font-black text-white">{nextStep ? `${nextStep.action}: ${nextStep.title}` : 'Перейти к работе'}</button>
              <a href={`/school/${school.slug}`} className="inline-flex min-h-12 items-center rounded-[12px] border border-[#E4E7EC] bg-white px-5 text-[14px] font-black text-[#111827]">Посмотреть страницу</a>
            </div>
          </div>
          <div className="border-t border-[#E4E7EC] bg-[#F9FAFB] p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-black text-[#111827]">План запуска</h2>
                <p className="mt-1 text-[13px] font-semibold text-[#667085]">{doneSteps} из 4 готово</p>
              </div>
              <div className="h-2 w-[120px] overflow-hidden rounded-full bg-[#E4E7EC]"><div className="h-full rounded-full bg-[#111827]" style={{ width: `${(doneSteps / 4) * 100}%` }} /></div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {data.setup.map((step, index) => (
                <button key={step.id} onClick={() => navigate(step.to)} className="grid min-h-[112px] grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 rounded-[14px] border border-[#E4E7EC] bg-white p-4 text-left transition hover:border-[#C7CED8]">
                  <span className={`grid h-10 w-10 place-items-center rounded-full text-[14px] font-black ${step.done ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F2F4F7] text-[#475467]'}`}>{step.done ? '✓' : index + 1}</span>
                  <span>
                    <strong className="block text-[15px] font-black text-[#111827]">{step.title}</strong>
                    <span className="mt-1 block text-[13px] font-semibold leading-5 text-[#667085]">{step.text}</span>
                  </span>
                  <span className="rounded-[10px] border border-[#E4E7EC] px-3 py-2 text-[12px] font-black text-[#111827]">{step.done ? 'Открыть' : step.action}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="v-admin-page space-y-4">
      <section className="grid gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[18px] border border-[#E4E7EC] bg-white p-5 md:p-6">
          <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#667085]">{school.name}</p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[34px] font-black leading-none tracking-[-0.055em] text-[#111827] md:text-[48px]">Сегодня</h1>
            </div>
            <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="min-h-12 rounded-[12px] bg-[#111827] px-5 text-[14px] font-black text-white">Записать ученика</button>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-3">
            <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="rounded-[14px] border border-[#E4E7EC] bg-[#F9FAFB] p-4 text-left">
              <strong className="block text-[28px] font-black leading-none text-[#111827]">{data.today.length}</strong>
              <span className="mt-2 block text-[12px] font-black uppercase text-[#667085]">занятий сегодня</span>
            </button>
            <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="rounded-[14px] border border-[#E4E7EC] bg-[#F9FAFB] p-4 text-left">
              <strong className="block text-[28px] font-black leading-none text-[#111827]">{data.freeWeek.length}</strong>
              <span className="mt-2 block text-[12px] font-black uppercase text-[#667085]">окон на 7 дней</span>
            </button>
            <button onClick={() => navigate(attention[0]?.to ?? `${ADMIN_BASE_PATH}/bookings`)} className="rounded-[14px] border border-[#E4E7EC] bg-[#F9FAFB] p-4 text-left">
              <strong className="block text-[28px] font-black leading-none text-[#111827]">{attention.length}</strong>
              <span className="mt-2 block text-[12px] font-black uppercase text-[#667085]">требует внимания</span>
            </button>
          </div>
        </div>

        <div className="rounded-[18px] border border-[#E4E7EC] bg-white p-5">
          <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#667085]">Ближайшее</p>
          {nextLesson?.slot ? (
            <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="mt-4 w-full rounded-[16px] bg-[#111827] p-4 text-left text-white">
              <span className="block text-[32px] font-black leading-none">{format(getSlotDateTime(nextLesson.slot), 'HH:mm', { locale: ru })}</span>
              <strong className="mt-3 block text-[16px] font-black">{nextLesson.booking.studentName}</strong>
              <span className="mt-1 block text-[13px] font-semibold text-white/70">{nextLesson.instructor?.name ?? 'Инструктор'} · {nextLesson.branch?.name ?? 'Филиал'}</span>
            </button>
          ) : (
            <div className="mt-4 rounded-[16px] border border-dashed border-[#D0D5DD] bg-[#F9FAFB] p-4">
              <strong className="block text-[16px] font-black text-[#111827]">Сегодня записей нет</strong>
              <span className="mt-1 block text-[13px] font-semibold leading-5 text-[#667085]">Если школа работает сегодня — проверьте расписание.</span>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[18px] border border-[#E4E7EC] bg-white">
          <div className="border-b border-[#E4E7EC] p-4"><h2 className="text-[18px] font-black text-[#111827]">Требует внимания</h2></div>
          {attention.length === 0 ? <div className="p-4 text-[14px] font-semibold text-[#667085]">Сейчас критичных действий нет.</div> : (
            <div className="divide-y divide-[#E4E7EC]">
              {attention.map((item) => (
                <button key={item.id} onClick={() => navigate(item.to)} className="grid min-h-[76px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-left hover:bg-[#F9FAFB]">
                  <span>
                    <strong className={`block text-[15px] font-black ${item.tone === 'danger' ? 'text-[#B42318]' : 'text-[#111827]'}`}>{item.title}</strong>
                    <span className="mt-1 block text-[13px] font-semibold leading-5 text-[#667085]">{item.text}</span>
                  </span>
                  <span className="rounded-[10px] border border-[#E4E7EC] px-3 py-2 text-[12px] font-black text-[#111827]">{item.action}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-[18px] border border-[#E4E7EC] bg-white">
            <div className="border-b border-[#E4E7EC] p-4"><h2 className="text-[18px] font-black text-[#111827]">Быстрые действия</h2></div>
            <div className="grid divide-y divide-[#E4E7EC]">
              <button onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="min-h-[62px] p-4 text-left hover:bg-[#F9FAFB]"><strong className="block text-[14px] font-black text-[#111827]">Записать ученика</strong><span className="text-[13px] font-semibold text-[#667085]">Звонок → окно → запись</span></button>
              <button onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="min-h-[62px] p-4 text-left hover:bg-[#F9FAFB]"><strong className="block text-[14px] font-black text-[#111827]">Создать окна</strong><span className="text-[13px] font-semibold text-[#667085]">Собрать неделю инструктору</span></button>
              <button onClick={() => { window.location.href = firstInstructor ? `/instructor/${firstInstructor.token}` : `${ADMIN_BASE_PATH}/instructors` }} className="min-h-[62px] p-4 text-left hover:bg-[#F9FAFB]"><strong className="block text-[14px] font-black text-[#111827]">Открыть инструктора</strong><span className="text-[13px] font-semibold text-[#667085]">Мобильный день занятий</span></button>
            </div>
          </section>

          {openRequests.length > 0 ? (
            <section className="rounded-[18px] border border-[#E4E7EC] bg-white">
              <div className="border-b border-[#E4E7EC] p-4"><h2 className="text-[18px] font-black text-[#111827]">Запросы учеников</h2></div>
              {openRequests.slice(0, 3).map((request) => <div key={request.id} className="border-b border-[#E4E7EC] p-4 last:border-b-0"><p className="text-[14px] font-black text-[#111827]">{request.type === 'reschedule' ? 'Перенос' : 'Отмена'}</p><p className="mt-1 text-[13px] font-semibold text-[#667085]">{request.reason || request.comment || 'Без причины'}</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => void patchRequest(request.id, 'reviewing')} className="min-h-10 rounded-[10px] border border-[#E4E7EC] text-[12px] font-black text-[#111827]">В работу</button><button onClick={() => void patchRequest(request.id, 'resolved')} className="min-h-10 rounded-[10px] bg-[#111827] text-[12px] font-black text-white">Решено</button></div></div>)}
            </section>
          ) : null}
        </aside>
      </section>
    </div>
  )
}
