import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, isSameDay } from 'date-fns'
import { CalendarPlus, Clock, NavArrowDown, NavArrowRight } from 'iconoir-react'
import { PersonMarker } from '../../components/admin/PersonMarker'
import { db } from '../../services/storage'
import { getSlotDateTime } from '../../services/bookingService'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { formatDuration } from '../../lib/utils'
import type { Slot } from '../../types'

function plural(value: number, one: string, few: string, many: string) {
  const mod10 = Math.abs(value) % 10
  const mod100 = Math.abs(value) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function useBookingWorkspace(schoolId: string) {
  return useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const slots = db.slots.bySchool(schoolId)
    const bookings = db.bookings.bySchool(schoolId)
    const instructors = db.instructors.bySchool(schoolId)
    const students = db.students.bySchool(schoolId)
    const branches = db.branches.bySchool(schoolId)
    const todaySlots = slots.filter((slot) => slot.date === today)
    const futureSlots = slots
      .filter((slot) => getSlotDateTime(slot) >= now)
      .sort((left, right) => getSlotDateTime(left).getTime() - getSlotDateTime(right).getTime())
    const availableFutureSlots = futureSlots.filter((slot) => slot.status === 'available')
    const activeToday = bookings
      .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
      .filter((entry): entry is { booking: typeof bookings[number]; slot: NonNullable<ReturnType<typeof db.slots.byId>> } =>
        Boolean(entry.slot && entry.booking.status === 'active' && isSameDay(getSlotDateTime(entry.slot), now)),
      )
      .sort((left, right) => left.slot.time.localeCompare(right.slot.time))
    const freeToday = todaySlots.filter((slot) => slot.status === 'available').sort((left, right) => left.time.localeCompare(right.time))
    const activeInstructors = instructors.filter((instructor) => instructor.isActive)

    return {
      instructors,
      students,
      branches,
      activeInstructors,
      activeToday,
      freeToday,
      availableFutureSlots,
    }
  }, [schoolId])
}

type FreeSlotGroup = {
  time: string
  slots: Slot[]
}

function shortPersonName(name: string): string {
  const [lastName = name, firstName = ''] = name.trim().split(/\s+/)
  return [lastName, firstName].filter(Boolean).join(' ')
}

function groupFreeSlots(slots: Slot[]): FreeSlotGroup[] {
  const groups = new Map<string, Slot[]>()
  slots.forEach((slot) => groups.set(slot.time, [...(groups.get(slot.time) ?? []), slot]))
  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([time, groupedSlots]) => ({ time, slots: groupedSlots }))
}

type TodayLessonEntry = ReturnType<typeof useBookingWorkspace>['activeToday'][number]

function groupLessonsByTime(entries: TodayLessonEntry[]) {
  const groups = new Map<string, TodayLessonEntry[]>()
  entries.forEach((entry) => groups.set(entry.slot.time, [...(groups.get(entry.slot.time) ?? []), entry]))
  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([time, lessons]) => ({ time, lessons }))
}

function RouteSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="v-route-section">
      <div className="v-route-section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function FreeSlotGroupRow({ group, expanded, onToggle }: { group: FreeSlotGroup; expanded: boolean; onToggle: () => void }) {
  const instructorCount = new Set(group.slots.map((slot) => slot.instructorId)).size
  return (
    <div className="v-route-free-group">
      <button type="button" onClick={onToggle} className="v-route-node is-free">
        <span className="v-route-time">{group.time}</span>
        <span className="v-route-dot bg-[#34C759]" aria-hidden="true" />
        <span className="v-route-main">
          <strong>{group.slots.length} {plural(group.slots.length, 'свободное окно', 'свободных окна', 'свободных окон')}</strong>
          <small>{instructorCount} {plural(instructorCount, 'инструктор', 'инструктора', 'инструкторов')} · {formatDuration(group.slots[0]?.duration ?? 90)}</small>
        </span>
        {expanded ? <NavArrowDown width={16} height={16} aria-hidden="true" /> : <NavArrowRight width={16} height={16} aria-hidden="true" />}
      </button>
      {expanded ? (
        <div className="v-route-expanded">
          {group.slots.map((slot) => {
            const instructor = db.instructors.byId(slot.instructorId)
            const branch = db.branches.byId(slot.branchId)
            return (
              <div key={slot.id} className="v-route-expanded-row">
                <span>{shortPersonName(instructor?.name ?? 'Инструктор')}</span>
                <small>{branch?.name ?? 'Филиал'}</small>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function LessonTimeGroupRow({ group, expanded, onToggle, onOpen }: { group: ReturnType<typeof groupLessonsByTime>[number]; expanded: boolean; onToggle: () => void; onOpen: () => void }) {
  const first = group.lessons[0]
  const instructor = db.instructors.byId(first?.booking.instructorId ?? '')
  const branch = db.branches.byId(first?.booking.branchId ?? '')
  const title = group.lessons.length === 1
    ? shortPersonName(first.booking.studentName)
    : `${group.lessons.length} ${plural(group.lessons.length, 'занятие', 'занятия', 'занятий')}`
  return (
    <div className="v-route-free-group">
      <button type="button" onClick={group.lessons.length === 1 ? onOpen : onToggle} className="v-route-node is-booked">
        <span className="v-route-time">{group.time}</span>
        <span className="v-route-dot bg-[#0A84FF]" aria-hidden="true" />
        <span className="v-route-main">
          <strong>{title}</strong>
          <small>{shortPersonName(instructor?.name ?? 'Инструктор')} · {branch?.name ?? 'Филиал'}</small>
        </span>
        {group.lessons.length > 1 ? (expanded ? <NavArrowDown width={16} height={16} aria-hidden="true" /> : <NavArrowRight width={16} height={16} aria-hidden="true" />) : <NavArrowRight width={16} height={16} aria-hidden="true" />}
      </button>
      {expanded && group.lessons.length > 1 ? (
        <div className="v-route-expanded">
          {group.lessons.map((entry) => {
            const lessonInstructor = db.instructors.byId(entry.booking.instructorId)
            const lessonBranch = db.branches.byId(entry.booking.branchId)
            return (
              <button key={entry.booking.id} type="button" onClick={onOpen} className="v-route-expanded-row">
                <span>{shortPersonName(entry.booking.studentName)}</span>
                <small>{shortPersonName(lessonInstructor?.name ?? 'Инструктор')} · {lessonBranch?.name ?? 'Филиал'}</small>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function DesktopSlotLine({ slot }: { slot: Slot }) {
  const instructor = db.instructors.byId(slot.instructorId)
  const branch = db.branches.byId(slot.branchId)
  return (
    <div className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border border-[#E5EAF1] bg-white px-3 py-2.5">
      <strong className="text-[15px] font-semibold tabular-nums text-[#111827]">{slot.time}</strong>
      <span className="min-w-0">
        <PersonMarker role="instructor" name={instructor?.name ?? 'Инструктор'} compact />
        <span className="mt-0.5 block truncate text-[12px] font-medium text-[#667085]">{branch?.name ?? 'Филиал'} · {formatDuration(slot.duration)}</span>
      </span>
      <span className="h-2.5 w-2.5 rounded-full bg-[#34C759]" aria-label="Свободно" />
    </div>
  )
}

export function AdminToday() {
  const school = db.schools.currentAdmin()
  const navigate = useNavigate()
  const [expandedFreeTime, setExpandedFreeTime] = useState<string | null>(null)
  const [expandedLessonTime, setExpandedLessonTime] = useState<string | null>(null)

  if (!school) {
    return <div className="v-admin-empty m-4"><strong>Школа не найдена</strong><span>Проверьте рабочее пространство.</span></div>
  }

  const basePath = getAdminBasePathForLocation()
  const data = useBookingWorkspace(school.id)
  const freeGroups = groupFreeSlots(data.freeToday)
  const nextLesson = data.activeToday.find(({ slot }) => getSlotDateTime(slot) >= new Date()) ?? data.activeToday[0]
  const nextLessonLabel = nextLesson ? `${nextLesson.slot.time} · ${shortPersonName(nextLesson.booking.studentName)}` : 'нет занятий'
  const visibleLessonGroups = groupLessonsByTime(data.activeToday).slice(0, 5)
  const cancelledToday = db.bookings.bySchool(school.id)
    .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
    .filter((entry) => entry.slot && entry.booking.status === 'cancelled' && isSameDay(getSlotDateTime(entry.slot), new Date())).length
  const attentionCount = cancelledToday

  return (
    <div className="v-admin-workspace v-admin-simple-page vroom-admin-today-minimal">
      <section className="v-admin-minimal-hero">
        <div className="min-w-0">
          <h1 className="v-admin-heading">Сегодня</h1>
          <p className="v-admin-note mt-1">План дня</p>
        </div>
        <div className="v-admin-hero-actions">
          <button type="button" className="v-admin-button is-blue" onClick={() => navigate(basePath + '/schedule?create=slot')}>
            <CalendarPlus width={16} height={16} aria-hidden="true" />
            Создать окно
          </button>
        </div>
      </section>

      <section className="v-route-summary mt-3">
        <strong>Ближайшее: {nextLessonLabel}</strong>
        <span>{data.activeToday.length} {plural(data.activeToday.length, 'занятие', 'занятия', 'занятий')} · {data.freeToday.length} {plural(data.freeToday.length, 'свободное окно', 'свободных окна', 'свободных окон')}</span>
      </section>

      <section className="v-route-mobile-stack mt-3 lg:hidden">
        <RouteSection title="План дня" action={<Link to={basePath + '/schedule'}>Все занятия</Link>}>
          {visibleLessonGroups.length ? (
            <div className="v-route-timeline">
              {visibleLessonGroups.map((group) => (
                <LessonTimeGroupRow
                  key={group.time}
                  group={group}
                  expanded={expandedLessonTime === group.time}
                  onToggle={() => setExpandedLessonTime((current) => current === group.time ? null : group.time)}
                  onOpen={() => navigate(basePath + '/schedule')}
                />
              ))}
            </div>
          ) : (
            <div className="v-route-empty"><strong>Записей на сегодня нет</strong></div>
          )}
        </RouteSection>

        <RouteSection title="Свободные окна">
          {freeGroups.length ? (
            <div className="v-route-timeline">
              {freeGroups.slice(0, 5).map((group) => (
                <FreeSlotGroupRow key={group.time} group={group} expanded={expandedFreeTime === group.time} onToggle={() => setExpandedFreeTime((current) => current === group.time ? null : group.time)} />
              ))}
            </div>
          ) : (
            <div className="v-route-empty"><strong>Нет свободных окон</strong><Link to={basePath + '/schedule?create=slot'}>Создать окно</Link></div>
          )}
        </RouteSection>

        <RouteSection title="Требует внимания">
          <div className={attentionCount ? 'v-route-attention is-alert' : 'v-route-attention'}>
            <span className="v-route-dot" aria-hidden="true" />
            <strong>{attentionCount ? `${attentionCount} отменено сегодня` : 'Нет отмен'}</strong>
          </div>
        </RouteSection>
      </section>

      <section className="mt-3 hidden gap-3 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="v-admin-panel overflow-hidden">
          <div className="v-admin-section-head">
            <div>
              <h2>Занятия сегодня</h2>
            </div>
            <Link to={basePath + '/schedule'} className="v-admin-button-tertiary">Расписание</Link>
          </div>
          {data.activeToday.length === 0 ? (
            <div className="v-admin-empty m-4">
              <strong>Записей на сегодня нет</strong>
            </div>
          ) : (
            <div className="divide-y divide-[#111827]/[0.06]">
              {data.activeToday.slice(0, 10).map(({ booking, slot }) => {
                const instructor = data.instructors.find((item) => item.id === booking.instructorId)
                const branch = data.branches.find((item) => item.id === booking.branchId)
                return (
                  <button key={booking.id} type="button" onClick={() => navigate(basePath + '/schedule')} className="v-admin-list-row grid-cols-[62px_minmax(0,1fr)_auto]">
                    <strong className="text-[16px] font-semibold tabular-nums text-[#111827]">{slot.time}</strong>
                    <span className="min-w-0">
                      <PersonMarker role="student" name={booking.studentName} compact />
                      <span className="mt-0.5 block truncate text-[12px] font-medium text-[#667085]">{instructor?.name ?? 'Инструктор'} · {branch?.name ?? 'Филиал'}</span>
                    </span>
                    <span className="v-route-pill bg-[#EAF4FF] text-[#075EBC]">{formatDuration(slot.duration)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <aside className="v-admin-panel p-4">
          <div className="v-admin-section-head compact">
            <div>
              <h2>Свободные окна</h2>
            </div>
            <Clock className="h-5 w-5 text-[#188447]" aria-hidden="true" />
          </div>
          <div className="mt-3 grid gap-2">
            {data.freeToday.length ? data.freeToday.slice(0, 7).map((slot) => <DesktopSlotLine key={slot.id} slot={slot} />) : (
              <div className="rounded-[16px] border border-[#E5EAF1] bg-[#F8FAFC] p-4">
                <strong className="block text-[14px] font-semibold text-[#111827]">На сегодня свободных окон нет</strong>
              </div>
            )}
          </div>
          <Link to={basePath + '/schedule?create=slot'} className="v-admin-button-secondary mt-3 w-full justify-center">
            <CalendarPlus width={16} height={16} aria-hidden="true" />
            Создать окно
          </Link>
        </aside>
      </section>
    </div>
  )
}
