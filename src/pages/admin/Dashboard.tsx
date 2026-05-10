import { addDays, format, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUpcomingBookings } from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { loadStudentRequests, studentRequestStatusLabels, updateStudentRequestStatusAdminConfirmed } from '../../services/studentProfile'
import { db } from '../../services/storage'

function getSchool() {
  return db.schools.all()[0] ?? null
}

type SetupTone = 'identity' | 'branch' | 'staff' | 'schedule'

const tone: Record<SetupTone, { bg: string; border: string; text: string; chip: string; rail: string }> = {
  identity: { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', chip: '#DBEAFE', rail: '#2563EB' },
  branch: { bg: '#FFFBEB', border: '#FBBF24', text: '#B45309', chip: '#FEF3C7', rail: '#F59E0B' },
  staff: { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9', chip: '#EDE9FE', rail: '#7C3AED' },
  schedule: { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', chip: '#DCFCE7', rail: '#16A34A' },
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
      .slice(0, 5)

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
        helper: 'Телефон, название, публичная ссылка',
        missing: !school.name ? 'Нет названия школы' : !school.phone ? 'Нет телефона для записи' : '',
        done: Boolean(school.name && school.phone),
        to: `${ADMIN_BASE_PATH}/settings`,
        action: school.name && school.phone ? 'Проверить' : 'Заполнить',
        tone: 'identity' as SetupTone,
      },
      {
        label: 'Филиалы и точки встречи',
        helper: 'Адреса, где начинается занятие',
        missing: 'Нет активного филиала с адресом встречи',
        done: branches.some((branch) => branch.isActive && branch.address),
        to: `${ADMIN_BASE_PATH}/branches`,
        action: 'Добавить',
        tone: 'branch' as SetupTone,
      },
      {
        label: 'Инструкторы',
        helper: 'Кто ведёт занятия, машина, категории',
        missing: 'Нет активного инструктора для расписания',
        done: instructors.some((instructor) => instructor.isActive),
        to: `${ADMIN_BASE_PATH}/instructors`,
        action: 'Добавить',
        tone: 'staff' as SetupTone,
      },
      {
        label: 'Окна для записи',
        helper: 'Свободное время на ближайшие дни',
        missing: 'Нет свободных окон на ближайшие 7 дней',
        done: freeSlots7d.length > 0,
        to: `${ADMIN_BASE_PATH}/slots`,
        action: 'Создать',
        tone: 'schedule' as SetupTone,
      },
    ]

    return { branches, instructors, freeSlots7d, setupItems, todayBookings, upcoming, requests }
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

  const configuredCount = data.setupItems.filter((item) => item.done).length
  const missingItems = data.setupItems.filter((item) => !item.done)
  const openRequests = data.requests.filter((request) => request.status === 'new' || request.status === 'reviewing').slice(0, 4)
  const activeInstructors = data.instructors.filter((i) => i.isActive).length
  const firstInstructor = data.instructors.find((i) => i.isActive && i.token)
  const mainBlocker = missingItems[0]
  const nextAction = mainBlocker
    ? { title: mainBlocker.label, text: mainBlocker.missing, to: mainBlocker.to, action: mainBlocker.action, tone: mainBlocker.tone }
    : { title: 'Принять первую запись', text: 'Школа готова. Можно записывать учеников вручную или через сайт.', to: `${ADMIN_BASE_PATH}/bookings`, action: 'Записать', tone: 'schedule' as SetupTone }

  async function patchRequest(requestId: string, status: 'reviewing' | 'resolved' | 'rejected') {
    const result = await updateStudentRequestStatusAdminConfirmed(school.id, requestId, status)
    if (!result.ok) return
    setRequestRefresh((value) => value + 1)
  }

  return (
    <div className="v-admin-page space-y-4">
      <section className="overflow-hidden rounded-[18px] border border-[#111827] bg-[#111827] text-white">
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/55">{school.name || 'Новая автошкола'}</p>
          <h1 className="mt-1 text-[31px] font-black leading-[0.95] tracking-[-0.055em] text-white">Пульт директора</h1>
          <p className="mt-2 text-[14px] font-bold leading-5 text-white/68">Не “дашборд ради цифр”, а список того, что мешает школе работать прямо сейчас.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate(nextAction.to)}
          className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left active:bg-white/5"
        >
          <span className="grid h-11 w-11 place-items-center rounded-[12px] text-[18px] font-black" style={{ background: tone[nextAction.tone].rail }}>!</span>
          <span className="min-w-0">
            <span className="block text-[11px] font-black uppercase tracking-[0.1em] text-white/50">следующее действие</span>
            <span className="mt-1 block text-[17px] font-black leading-5 text-white">{nextAction.title}</span>
            <span className="mt-1 block text-[13px] font-bold leading-5 text-white/62">{nextAction.text}</span>
          </span>
          <span className="rounded-[10px] bg-white px-3 py-2 text-[12px] font-black text-[#111827]">{nextAction.action}</span>
        </button>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        {[
          { label: 'сегодня', value: data.todayBookings.length, sub: 'занятий', color: data.todayBookings.length ? '#2563EB' : '#DC2626', bg: data.todayBookings.length ? '#EFF6FF' : '#FEF2F2', border: data.todayBookings.length ? '#93C5FD' : '#FCA5A5', to: `${ADMIN_BASE_PATH}/bookings` },
          { label: 'на 7 дней', value: data.freeSlots7d.length, sub: 'свободных окон', color: data.freeSlots7d.length ? '#15803D' : '#B45309', bg: data.freeSlots7d.length ? '#F0FDF4' : '#FFFBEB', border: data.freeSlots7d.length ? '#86EFAC' : '#FBBF24', to: `${ADMIN_BASE_PATH}/slots` },
          { label: 'в штате', value: activeInstructors, sub: 'инструкторов', color: activeInstructors ? '#6D28D9' : '#B45309', bg: activeInstructors ? '#F5F3FF' : '#FFFBEB', border: activeInstructors ? '#C4B5FD' : '#FBBF24', to: `${ADMIN_BASE_PATH}/instructors` },
          { label: 'готовность', value: `${configuredCount}/4`, sub: 'запуск школы', color: configuredCount === 4 ? '#15803D' : '#DC2626', bg: configuredCount === 4 ? '#F0FDF4' : '#FEF2F2', border: configuredCount === 4 ? '#86EFAC' : '#FCA5A5', to: mainBlocker?.to ?? `${ADMIN_BASE_PATH}/settings` },
        ].map((card) => (
          <button key={card.label} type="button" onClick={() => navigate(card.to)} className="min-h-[92px] rounded-[15px] border px-3 py-3 text-left" style={{ background: card.bg, borderColor: card.border }}>
            <strong className="block text-[27px] font-black leading-none tracking-[-0.05em]" style={{ color: card.color }}>{card.value}</strong>
            <span className="mt-1 block text-[11px] font-black uppercase tracking-[0.06em] text-[#334155]">{card.sub}</span>
            <span className="mt-0.5 block text-[11px] font-bold text-[#64748B]">{card.label}</span>
          </button>
        ))}
      </section>

      {missingItems.length > 0 ? (
        <section className="rounded-[18px] border border-[#FCA5A5] bg-[#FEF2F2] p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#DC2626] text-[18px] font-black text-white">!</div>
            <div>
              <h2 className="text-[20px] font-black leading-tight text-[#111418]">Блокеры запуска</h2>
              <p className="mt-1 text-[13px] font-bold leading-5 text-[#7F1D1D]">Пока это не заполнено, админка будет пустой, а инструктор и ученик не увидят нормальный рабочий сценарий.</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {missingItems.map((item) => {
              const c = tone[item.tone]
              return (
                <button key={item.label} type="button" onClick={() => navigate(item.to)} className="relative grid min-h-[80px] w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-[14px] border px-3 text-left" style={{ background: c.bg, borderColor: c.border }}>
                  <span className="absolute left-0 top-0 h-full w-1.5" style={{ background: c.rail }} />
                  <span className="grid h-10 w-10 place-items-center rounded-[11px] text-[15px] font-black" style={{ background: c.chip, color: c.text }}>!</span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-black leading-5 text-[#111418]">{item.label}</span>
                    <span className="mt-0.5 block text-[12px] font-bold leading-4 text-[#475569]">{item.missing}</span>
                  </span>
                  <span className="grid min-h-10 place-items-center rounded-[10px] border bg-white px-3 text-[12px] font-black" style={{ borderColor: c.border, color: c.text }}>{item.action}</span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="grid gap-2.5 md:grid-cols-3">
        <button type="button" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="rounded-[16px] border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-4 text-left">
          <span className="block text-[15px] font-black text-[#15803D]">Принять звонок</span>
          <span className="mt-1 block text-[12px] font-bold leading-5 text-[#334155]">Создать ученика и записать его вручную: телефон, SMS, канал связи.</span>
        </button>
        <button type="button" onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)} className="rounded-[16px] border border-[#93C5FD] bg-[#EFF6FF] px-4 py-4 text-left">
          <span className="block text-[15px] font-black text-[#1D4ED8]">Собрать неделю</span>
          <span className="mt-1 block text-[12px] font-bold leading-5 text-[#334155]">Создать окна инструктора по дням, времени, филиалу.</span>
        </button>
        <button type="button" onClick={() => { window.location.href = firstInstructor ? `/instructor/${firstInstructor.token}` : `${ADMIN_BASE_PATH}/instructors` }} className="rounded-[16px] border border-[#C4B5FD] bg-[#F5F3FF] px-4 py-4 text-left">
          <span className="block text-[15px] font-black text-[#6D28D9]">Проверить инструктора</span>
          <span className="mt-1 block text-[12px] font-bold leading-5 text-[#334155]">Сегодняшний маршрут, звонок/SMS, провести занятие, комментарий.</span>
        </button>
      </section>

      {openRequests.length > 0 ? (
        <section className="overflow-hidden rounded-[18px] border border-[#FBBF24] bg-[#FFFBEB]">
          <div className="border-b border-[#FBBF24] px-4 py-4">
            <h2 className="text-[19px] font-black text-[#111418]">Очередь запросов учеников</h2>
            <p className="mt-1 text-[13px] font-bold text-[#7A5607]">Переносы и отмены не должны теряться в карточках.</p>
          </div>
          {openRequests.map((request) => {
            const student = db.students.byId(request.studentId)
            const booking = request.bookingId ? db.bookings.byId(request.bookingId) : null
            const slot = booking ? db.slots.byId(booking.slotId) : null
            return (
              <div key={request.id} className="border-b border-[#FDE68A] px-4 py-3 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-black text-[#111418]">{request.type === 'reschedule' ? 'Перенос' : 'Отмена'} · {student?.name ?? 'Ученик'}</p>
                    <p className="mt-1 text-[12px] font-bold leading-5 text-[#5F6875]">{slot ? `${format(new Date(`${slot.date}T${slot.time}:00`), 'd MMM, HH:mm', { locale: ru })} · ` : ''}{request.reason || request.comment || 'причина не указана'}</p>
                  </div>
                  <span className="rounded-[8px] bg-white px-2 py-1 text-[11px] font-black text-[#92400E]">{studentRequestStatusLabels[request.status]}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => void patchRequest(request.id, 'reviewing')} className="min-h-10 rounded-[9px] border border-[#FBBF24] bg-white px-2 text-[12px] font-black text-[#92400E]">В работу</button>
                  <button type="button" onClick={() => void patchRequest(request.id, 'resolved')} className="min-h-10 rounded-[9px] bg-[#111827] px-2 text-[12px] font-black text-white">Решено</button>
                  <button type="button" onClick={() => void patchRequest(request.id, 'rejected')} className="min-h-10 rounded-[9px] border border-[#FCA5A5] bg-white px-2 text-[12px] font-black text-[#DC2626]">Отклонить</button>
                </div>
              </div>
            )
          })}
        </section>
      ) : null}

      <section className="rounded-[18px] border border-[#D8DEE8] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-4">
          <div>
            <h2 className="text-[19px] font-black text-[#111418]">Ближайшие занятия</h2>
            <p className="mt-1 text-[13px] font-bold text-[#64748B]">Что реально будет происходить в школе.</p>
          </div>
          <button type="button" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="min-h-10 rounded-[10px] bg-[#EFF6FF] px-3 text-[12px] font-black text-[#1D4ED8]">Все</button>
        </div>

        {data.upcoming.length === 0 ? (
          <div className="px-4 py-5">
            <div className="rounded-[14px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-5">
              <p className="text-[16px] font-black text-[#111418]">Пока нет занятий</p>
              <p className="mt-1 text-[13px] font-bold leading-5 text-[#64748B]">Сначала добавьте филиал, инструктора и окна. После этого здесь будет рабочий день школы.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {data.upcoming.map((entry) => (
              <button key={entry.booking.id} type="button" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)} className="grid min-h-[72px] w-full grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 px-4 text-left active:bg-[#F8FAFC]">
                <div className="text-center">
                  <p className="text-[12px] font-black text-[#111418]">{entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'd MMM', { locale: ru }) : '—'}</p>
                  <p className="text-[12px] font-black text-[#1D4ED8]">{entry.slot ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'HH:mm', { locale: ru }) : '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-black text-[#111418]">{entry.booking.studentName}</p>
                  <p className="mt-0.5 truncate text-[12px] font-bold text-[#64748B]">{entry.instructor?.name ?? 'Инструктор'} · {entry.branch?.name ?? 'Филиал'}</p>
                </div>
                <span className="rounded-[8px] bg-[#F0FDF4] px-2 py-1 text-[11px] font-black text-[#15803D]">активно</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
