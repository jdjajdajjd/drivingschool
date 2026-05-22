import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, isSameDay } from 'date-fns'
import { CalendarPlus, Clock, NavArrowRight, Phone, Search, UserPlus, WarningTriangle } from 'iconoir-react'
import { db } from '../../services/storage'
import { getSlotDateTime } from '../../services/bookingService'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { formatDuration } from '../../lib/utils'
import { loadStudentRequests } from '../../services/studentProfile'
import type { Slot } from '../../types'

function plural(value: number, one: string, few: string, many: string) {
  const mod10 = Math.abs(value) % 10
  const mod100 = Math.abs(value) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function shortName(name: string): string {
  const [lastName = name, firstName = ''] = name.trim().split(/\s+/)
  return [lastName, firstName].filter(Boolean).join(' ')
}

function useTodayWorkspace(schoolId: string) {
  return useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const slots = db.slots.bySchool(schoolId)
    const bookings = db.bookings.bySchool(schoolId)
    const students = db.students.bySchool(schoolId)
    const todayBookings = bookings
      .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
      .filter((entry): entry is { booking: typeof bookings[number]; slot: Slot } => Boolean(entry.slot && entry.booking.status === 'active' && isSameDay(getSlotDateTime(entry.slot), now)))
      .sort((left, right) => left.slot.time.localeCompare(right.slot.time))
    const freeToday = slots
      .filter((slot) => slot.date === today && slot.status === 'available')
      .sort((left, right) => left.time.localeCompare(right.time))
    const futureStudentIds = new Set(
      bookings
        .filter((booking) => booking.status === 'active')
        .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
        .filter((entry) => entry.slot && getSlotDateTime(entry.slot) >= now)
        .map((entry) => entry.booking.studentId)
        .filter(Boolean),
    )
    const requests = loadStudentRequests(schoolId).filter((request) => request.status === 'new' || request.status === 'reviewing')
    const cancelledToday = bookings
      .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
      .filter((entry) => entry.slot && entry.booking.status === 'cancelled' && isSameDay(getSlotDateTime(entry.slot), now)).length

    return {
      todayBookings,
      freeToday,
      requests,
      studentsWithoutNext: students.filter((student) => !futureStudentIds.has(student.id)).length,
      studentsWithoutInstructor: students.filter((student) => !student.assignedInstructorId).length,
      cancelledToday,
    }
  }, [schoolId])
}

function FreeWindowLine({ slot, to }: { slot: Slot; to: string }) {
  const instructor = db.instructors.byId(slot.instructorId)
  const branch = db.branches.byId(slot.branchId)
  return (
    <Link to={to} className="v-home-line is-free">
      <span className="v-home-time">{slot.time}</span>
      <span className="v-home-line-main">
        <strong>{shortName(instructor?.name ?? 'Инструктор')}</strong>
        <small>{branch?.name ?? 'Филиал'} · {formatDuration(slot.duration)}</small>
      </span>
      <NavArrowRight width={17} height={17} aria-hidden="true" />
    </Link>
  )
}

export function AdminToday() {
  const school = db.schools.currentAdmin()
  const navigate = useNavigate()

  if (!school) {
    return <div className="v-admin-empty m-4"><strong>Школа не найдена</strong></div>
  }

  const basePath = getAdminBasePathForLocation()
  const data = useTodayWorkspace(school.id)
  const nextLesson = data.todayBookings.find(({ slot }) => getSlotDateTime(slot) >= new Date()) ?? data.todayBookings[0]
  const actionItems = [
    { label: 'Новые заявки', value: data.requests.length, to: `${basePath}/bookings`, tone: 'blue' },
    { label: 'Без следующей записи', value: data.studentsWithoutNext, to: `${basePath}/students`, tone: 'amber' },
    { label: 'Без инструктора', value: data.studentsWithoutInstructor, to: `${basePath}/students`, tone: 'gray' },
    { label: 'Отмены сегодня', value: data.cancelledToday, to: `${basePath}/schedule`, tone: 'red' },
  ].filter((item) => item.value > 0)

  return (
    <div className="v-admin-workspace v-admin-simple-page vroom-admin-today-minimal v-saas-home">
      <section className="v-home-hero">
        <div className="min-w-0">
          <p className="v-home-kicker">{format(new Date(), 'dd.MM')}</p>
          <h1>Главная</h1>
          <span>{data.todayBookings.length} {plural(data.todayBookings.length, 'занятие', 'занятия', 'занятий')} · {data.freeToday.length} {plural(data.freeToday.length, 'свободное окно', 'свободных окна', 'свободных окон')}</span>
        </div>
        <button type="button" className="v-home-primary" onClick={() => navigate(`${basePath}/bookings`)}>
          <UserPlus width={19} height={19} aria-hidden="true" />
          Записать ученика
        </button>
      </section>

      <button type="button" className="v-home-search" onClick={() => navigate(`${basePath}/students`)}>
        <Search width={18} height={18} aria-hidden="true" />
        <span>Найти ученика или телефон</span>
      </button>

      <section className="v-home-grid">
        <div className="v-home-panel v-home-attention">
          <div className="v-home-panel-head">
            <span><WarningTriangle width={18} height={18} aria-hidden="true" /> Требует действия</span>
          </div>
          {actionItems.length ? (
            <div className="v-home-action-list">
              {actionItems.slice(0, 4).map((item) => (
                <Link key={item.label} to={item.to} className={`v-home-action-row is-${item.tone}`}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                  <NavArrowRight width={17} height={17} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="v-home-empty">Нет срочных задач</div>
          )}
        </div>

        <div className="v-home-panel">
          <div className="v-home-panel-head">
            <span><Clock width={18} height={18} aria-hidden="true" /> Куда записать</span>
            <Link to={`${basePath}/schedule`}>Все</Link>
          </div>
          {data.freeToday.length ? (
            <div className="v-home-lines">
              {data.freeToday.slice(0, 3).map((slot) => <FreeWindowLine key={slot.id} slot={slot} to={`${basePath}/bookings`} />)}
            </div>
          ) : (
            <div className="v-home-empty"><span>Нет свободных окон</span><Link to={`${basePath}/schedule?create=slot`}>Создать окно</Link></div>
          )}
        </div>

        <div className="v-home-panel">
          <div className="v-home-panel-head">
            <span>Ближайшее занятие</span>
            <Link to={`${basePath}/schedule`}>Запись</Link>
          </div>
          {nextLesson ? (
            <Link to={`${basePath}/schedule`} className="v-home-next">
              <strong>{nextLesson.slot.time}</strong>
              <span>
                <b>{shortName(nextLesson.booking.studentName)}</b>
                <small>{shortName(db.instructors.byId(nextLesson.booking.instructorId)?.name ?? 'Инструктор')} · {db.branches.byId(nextLesson.booking.branchId)?.name ?? 'Филиал'}</small>
              </span>
              <Phone width={18} height={18} aria-hidden="true" />
            </Link>
          ) : (
            <div className="v-home-empty">Сегодня занятий нет</div>
          )}
        </div>

        <div className="v-home-panel v-home-secondary-actions">
          <Link to={`${basePath}/schedule?create=slot`}><CalendarPlus width={18} height={18} aria-hidden="true" /> Создать окно</Link>
          <Link to={`${basePath}/students`}><Search width={18} height={18} aria-hidden="true" /> Ученики</Link>
        </div>
      </section>
    </div>
  )
}
