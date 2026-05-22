import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, isSameDay } from 'date-fns'
import { CalendarPlus, CheckCircle, Clock, NavArrowRight, Search, UserPlus, WarningTriangle } from '@/components/icons/lucide'
import { db } from '../../services/storage'
import { getSlotDateTime } from '../../services/bookingService'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { loadStudentRequests } from '../../services/studentProfile'

function plural(value: number, one: string, few: string, many: string) {
  const mod10 = Math.abs(value) % 10
  const mod100 = Math.abs(value) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function useControlWorkspace(schoolId: string) {
  return useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const weekLimit = new Date(now)
    weekLimit.setDate(now.getDate() + 7)

    const students = db.students.bySchool(schoolId)
    const bookings = db.bookings.bySchool(schoolId)
    const slots = db.slots.bySchool(schoolId)
    const activeInstructors = db.instructors.bySchool(schoolId).filter((instructor) => instructor.isActive)

    const entries = bookings.map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) })).filter((entry) => entry.slot)
    const todayEntries = entries.filter((entry) => entry.slot && isSameDay(getSlotDateTime(entry.slot), now))
    const lessonsToday = todayEntries.filter((entry) => entry.booking.status !== 'cancelled').length
    const completedToday = todayEntries.filter((entry) => entry.booking.status === 'completed').length
    const noShowsToday = todayEntries.filter((entry) => entry.booking.status === 'no_show').length
    const cancelledToday = todayEntries.filter((entry) => entry.booking.status === 'cancelled').length
    const activePastToday = todayEntries.filter((entry) => entry.booking.status === 'active' && entry.slot && getSlotDateTime(entry.slot) < now).length
    const futureStudentIds = new Set(
      entries
        .filter((entry) => entry.booking.status === 'active' && entry.slot && getSlotDateTime(entry.slot) >= now)
        .map((entry) => entry.booking.studentId)
        .filter(Boolean),
    )
    const studentsWithoutNext = students.filter((student) => !futureStudentIds.has(student.id)).length
    const studentsWithoutInstructor = students.filter((student) => !student.assignedInstructorId).length
    const freeToday = slots.filter((slot) => slot.status === 'available' && slot.date === today).length
    const freeWeek = slots.filter((slot) => slot.status === 'available' && getSlotDateTime(slot) >= now && getSlotDateTime(slot) <= weekLimit).length
    const openRequests = loadStudentRequests(schoolId).filter((request) => request.status === 'new' || request.status === 'reviewing').length
    const instructorsWithTodayLesson = new Set(todayEntries.filter((entry) => entry.booking.status === 'active' || entry.booking.status === 'completed').map((entry) => entry.booking.instructorId))

    return {
      students,
      activeInstructors,
      lessonsToday,
      completedToday,
      noShowsToday,
      cancelledToday,
      activePastToday,
      studentsWithoutNext,
      studentsWithoutInstructor,
      freeToday,
      freeWeek,
      openRequests,
      instructorsBusyToday: instructorsWithTodayLesson.size,
    }
  }, [schoolId])
}

function ControlRow({ value, label, to, tone = 'blue' }: { value: number; label: string; to: string; tone?: 'blue' | 'amber' | 'red' | 'gray' | 'green' }) {
  return (
    <Link to={to} className={`v-home-action-row is-${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
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
  const data = useControlWorkspace(school.id)
  const problems = data.activePastToday + data.noShowsToday + data.cancelledToday + data.studentsWithoutNext + data.studentsWithoutInstructor + data.openRequests

  return (
    <div className="v-admin-workspace v-admin-simple-page vroom-admin-today-minimal v-saas-home v-control-home">
      <section className="v-home-hero">
        <div className="min-w-0">
          <p className="v-home-kicker">{format(new Date(), 'dd.MM')}</p>
          <h1>Контроль обучения</h1>
          <span>{problems ? `${problems} ${plural(problems, 'пункт', 'пункта', 'пунктов')} требуют внимания` : 'Серьёзных задач нет'}</span>
        </div>
        <button type="button" className="v-home-primary" onClick={() => navigate(`${basePath}/students`)}>
          <Search width={19} height={19} aria-hidden="true" />
          Найти ученика
        </button>
      </section>

      <section className="v-control-strip">
        <div>
          <strong>{data.activePastToday}</strong>
          <span>не отмечено</span>
        </div>
        <div>
          <strong>{data.lessonsToday}</strong>
          <span>занятий сегодня</span>
        </div>
        <div>
          <strong>{data.freeWeek}</strong>
          <span>окон на неделю</span>
        </div>
      </section>

      <button type="button" className="v-home-search" onClick={() => navigate(`${basePath}/students`)}>
        <Search width={18} height={18} aria-hidden="true" />
        <span>Найти ученика, телефон или инструктора</span>
      </button>

      <section className="v-home-grid">
        <div className="v-home-panel v-home-attention">
          <div className="v-home-panel-head">
            <span><WarningTriangle width={18} height={18} aria-hidden="true" /> Что проверить</span>
          </div>
          <div className="v-home-action-list">
            {data.activePastToday > 0 ? <ControlRow value={data.activePastToday} label="Прошедшие занятия не отмечены" to={`${basePath}/schedule`} tone="red" /> : null}
            {data.noShowsToday > 0 ? <ControlRow value={data.noShowsToday} label="Неявки сегодня" to={`${basePath}/schedule`} tone="red" /> : null}
            {data.cancelledToday > 0 ? <ControlRow value={data.cancelledToday} label="Отмены сегодня" to={`${basePath}/schedule`} tone="amber" /> : null}
            {data.studentsWithoutNext > 0 ? <ControlRow value={data.studentsWithoutNext} label="Ученики без следующей записи" to={`${basePath}/students`} tone="amber" /> : null}
            {data.studentsWithoutInstructor > 0 ? <ControlRow value={data.studentsWithoutInstructor} label="Ученики без инструктора" to={`${basePath}/students`} tone="gray" /> : null}
            {data.openRequests > 0 ? <ControlRow value={data.openRequests} label="Заявки ждут ответа" to={`${basePath}/bookings`} tone="blue" /> : null}
            {problems === 0 ? <div className="v-home-ok"><CheckCircle width={20} height={20} aria-hidden="true" /> Всё в порядке</div> : null}
          </div>
        </div>

        <div className="v-home-panel">
          <div className="v-home-panel-head">
            <span><Clock width={18} height={18} aria-hidden="true" /> Процесс сегодня</span>
            <Link to={`${basePath}/schedule`}>Запись</Link>
          </div>
          <div className="v-control-process">
            <div><strong>{data.completedToday}</strong><span>проведено</span></div>
            <div><strong>{data.noShowsToday}</strong><span>неявок</span></div>
            <div><strong>{data.cancelledToday}</strong><span>отмен</span></div>
            <div><strong>{data.instructorsBusyToday}/{data.activeInstructors.length}</strong><span>инструкторов в работе</span></div>
          </div>
        </div>

        <div className="v-home-panel">
          <div className="v-home-panel-head">
            <span>Запись учеников</span>
            <Link to={`${basePath}/bookings`}>Заявки</Link>
          </div>
          <div className="v-home-action-list">
            <ControlRow value={data.openRequests} label="Заявки ждут обработки" to={`${basePath}/bookings`} tone="blue" />
            <ControlRow value={data.freeToday} label="Свободные окна сегодня" to={`${basePath}/schedule`} tone="green" />
            <ControlRow value={data.freeWeek} label="Свободные окна на неделю" to={`${basePath}/schedule`} tone="green" />
          </div>
        </div>

        <div className="v-home-panel v-home-secondary-actions">
          <Link to={`${basePath}/students`}><UserPlus width={18} height={18} aria-hidden="true" /> Ученики</Link>
          <Link to={`${basePath}/schedule`}><CalendarPlus width={18} height={18} aria-hidden="true" /> Запись</Link>
        </div>
      </section>
    </div>
  )
}
