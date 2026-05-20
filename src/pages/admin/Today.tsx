import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarPlus, Clock, OpenNewWindow as ExternalLink, UserPlus, Group, UserBadgeCheck, Building } from 'iconoir-react'
import { Modal } from '../../components/ui/Modal'
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
    const upcomingBookings = bookings
      .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
      .filter((entry): entry is { booking: typeof bookings[number]; slot: NonNullable<ReturnType<typeof db.slots.byId>> } =>
        Boolean(entry.slot && entry.booking.status === 'active' && getSlotDateTime(entry.slot) >= now),
      )
      .sort((left, right) => getSlotDateTime(left.slot).getTime() - getSlotDateTime(right.slot).getTime())
      .slice(0, 6)
    const freeToday = todaySlots.filter((slot) => slot.status === 'available').sort((left, right) => left.time.localeCompare(right.time))
    const freeByInstructor = availableFutureSlots.reduce<Map<string, number>>((map, slot) => {
      map.set(slot.instructorId, (map.get(slot.instructorId) ?? 0) + 1)
      return map
    }, new Map())
    const activeInstructors = instructors.filter((instructor) => instructor.isActive)

    return {
      slots,
      bookings,
      instructors,
      activeInstructors,
      students,
      branches,
      activeToday,
      upcomingBookings,
      freeToday,
      availableFutureSlots,
      freeByInstructor,
    }
  }, [schoolId])
}

function MetricCard({ label, value, to, tone = 'neutral' }: { label: string; value: number | string; to: string; tone?: 'blue' | 'green' | 'neutral' }) {
  const toneClass = tone === 'green' ? 'bg-[#ECF8F0] text-[#188447]' : tone === 'blue' ? 'bg-[#EAF4FF] text-[#075EBC]' : 'bg-[#F2F4F7] text-[#4B5563]'
  return (
    <Link to={to} className="v-admin-panel grid min-h-[104px] content-between p-4 transition hover:-translate-y-0.5 hover:border-[#B8D8FF]">
      <span className={`v-route-pill w-max ${toneClass}`}>{label}</span>
      <strong className="mt-4 text-[32px] font-semibold leading-none text-[#111827] tabular-nums">{value}</strong>
    </Link>
  )
}

function SlotLine({ slot }: { slot: Slot }) {
  const instructor = db.instructors.byId(slot.instructorId)
  const branch = db.branches.byId(slot.branchId)
  return (
    <div className="grid gap-1 rounded-[16px] border border-[#E5EAF1] bg-white px-3 py-2.5 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
      <strong className="text-[16px] font-semibold tabular-nums text-[#111827]">{slot.time}</strong>
      <span className="min-w-0 text-[13px] font-medium text-[#667085]">
        <PersonMarker role="instructor" name={instructor?.name ?? 'Инструктор не указан'} compact />
        <span className="block truncate">{branch?.name ?? 'Филиал не указан'}</span>
      </span>
      <span className="v-route-pill w-max bg-[#ECF8F0] text-[#188447]">{formatDuration(slot.duration)}</span>
    </div>
  )
}

export function AdminToday() {
  const school = db.schools.currentAdmin()
  const navigate = useNavigate()
  const [blocksOpen, setBlocksOpen] = useState(false)

  if (!school) {
    return <div className="v-admin-empty m-4"><strong>Школа не найдена</strong><span>Проверьте рабочее пространство.</span></div>
  }

  const basePath = getAdminBasePathForLocation()
  const data = useBookingWorkspace(school.id)
  const publicUrl = `/school/${school.slug}`
  const setupItems = [
    { title: 'Филиал', done: data.branches.length > 0, to: `${basePath}/branches`, text: data.branches.length ? `${data.branches.length} ${plural(data.branches.length, 'филиал', 'филиала', 'филиалов')}` : 'Добавьте место занятий' },
    { title: 'Инструкторы', done: data.activeInstructors.length > 0, to: `${basePath}/instructors`, text: data.activeInstructors.length ? `${data.activeInstructors.length} ${plural(data.activeInstructors.length, 'активный', 'активных', 'активных')}` : 'Добавьте инструкторов' },
    { title: 'Свободные окна', done: data.availableFutureSlots.length > 0, to: `${basePath}/schedule?create=slot`, text: data.availableFutureSlots.length ? `${data.availableFutureSlots.length} доступно ученикам` : 'Создайте время для записи' },
    { title: 'Ученики', done: data.students.length > 0, to: `${basePath}/students`, text: data.students.length ? `${data.students.length} в базе` : 'Добавьте учеников' },
  ]
  const missingSetup = setupItems.filter((item) => !item.done)

  return (
    <div className="v-admin-workspace vroom-admin-today">
      <section className="v-admin-panel overflow-hidden p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="min-w-0">
            <p className="v-route-pill bg-[#EAF4FF] text-[#075EBC]">Сегодня</p>
            <h1 className="mt-3 text-[30px] font-semibold leading-tight text-[#111827] md:text-[40px]">
              Записи, окна и ближайшие занятия
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] font-medium leading-6 text-[#667085]">
              Один экран для ежедневной работы: создать свободное время, открыть ссылку ученикам и быстро проверить расписание.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="v-admin-button is-blue" onClick={() => navigate(`${basePath}/schedule?create=slot`)}>
                <CalendarPlus width={16} height={16} />
                Создать окна
              </button>
              <Link to={publicUrl} target="_blank" className="v-admin-button-secondary">
                <ExternalLink width={16} height={16} />
                Страница для учеников
              </Link>
              <Link to={`${basePath}/students`} className="v-admin-button-tertiary">
                <UserPlus width={16} height={16} />
                Добавить ученика
              </Link>
              <button type="button" onClick={() => setBlocksOpen(true)} className="v-admin-button-tertiary">Блоки</button>
            </div>
          </div>

          <aside className="rounded-[24px] border border-[#E5EAF1] bg-[#F8FAFC] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827]">Публичная ссылка</h2>
                <p className="mt-1 text-[13px] font-medium leading-5 text-[#667085]">Эту страницу можно отправлять ученикам для самостоятельной записи.</p>
              </div>
              <ExternalLink className="h-5 w-5 text-[#075EBC]" />
            </div>
            <div className="mt-4 rounded-[16px] border border-[#D7E2EC] bg-white px-3 py-2 text-[13px] font-semibold text-[#111827] break-all">
              {window.location.origin}{publicUrl}
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <MetricCard label="записей сегодня" value={data.activeToday.length} tone="blue" to={`${basePath}/schedule`} />
        <MetricCard label="свободных окон" value={data.availableFutureSlots.length} tone="green" to={`${basePath}/schedule`} />
        <MetricCard label="учеников" value={data.students.length} to={`${basePath}/students`} />
        <MetricCard label="инструкторов" value={data.activeInstructors.length} to={`${basePath}/instructors`} />
      </section>

      {missingSetup.length ? (
        <section className="v-admin-panel mt-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">Чтобы запись работала</h2>
              <p className="mt-1 text-[13px] font-medium text-[#667085]">Нужны только базовые данные: филиал, инструкторы, свободные окна и ученики.</p>
            </div>
            <Link to={missingSetup[0].to} className="v-admin-button-secondary justify-center">Открыть: {missingSetup[0].title}</Link>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            {setupItems.map((item, index) => (
              <Link key={item.title} to={item.to} className={`rounded-[18px] border p-3 transition hover:-translate-y-0.5 ${item.done ? 'border-[rgba(52,199,89,0.18)] bg-[rgba(52,199,89,0.08)]' : 'border-[#D7E2EC] bg-white'}`}>
                <span className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-semibold ${item.done ? 'bg-[#188447] text-white' : 'bg-[#EAF4FF] text-[#075EBC]'}`}>{item.done ? '✓' : index + 1}</span>
                <strong className="mt-3 block text-[14px] font-semibold text-[#111827]">{item.title}</strong>
                <span className="mt-1 block text-[12px] font-medium leading-4 text-[#667085]">{item.text}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="v-admin-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[#111827]/[0.07] p-4">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">Сегодня в расписании</h2>
              <p className="v-admin-note mt-1">Занятия, которые уже заняты учениками</p>
            </div>
            <Link to={`${basePath}/schedule`} className="v-admin-button-tertiary">Открыть</Link>
          </div>
          {data.activeToday.length === 0 ? (
            <div className="v-admin-empty m-4">
              <strong>Записей на сегодня нет</strong>
              <span>{data.freeToday.length ? `Свободных окон сегодня: ${data.freeToday.length}.` : 'Создайте окна или откройте другой день в расписании.'}</span>
            </div>
          ) : (
            <div className="divide-y divide-[#111827]/[0.06]">
              {data.activeToday.slice(0, 8).map(({ booking, slot }) => {
                const instructor = data.instructors.find((item) => item.id === booking.instructorId)
                const branch = data.branches.find((item) => item.id === booking.branchId)
                return (
                  <button key={booking.id} onClick={() => navigate(`${basePath}/schedule`)} className="grid w-full gap-2 p-4 text-left transition hover:bg-[#F8FAFC] sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center">
                    <span className="text-[18px] font-semibold tabular-nums text-[#111827]">{slot.time}</span>
                    <span className="min-w-0">
                      <PersonMarker role="student" name={booking.studentName} compact />
                      <span className="mt-0.5 block truncate text-[12px] font-medium text-[#667085]">{instructor?.name ?? 'Инструктор'} · {branch?.name ?? 'Филиал'}</span>
                    </span>
                    <span className="v-route-pill w-max bg-[#EAF4FF] text-[#075EBC]">{formatDuration(slot.duration)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <aside className="v-admin-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">Свободные окна</h2>
              <p className="v-admin-note mt-1">Что ученики могут выбрать</p>
            </div>
            <Clock className="h-5 w-5 text-[#188447]" />
          </div>
          <div className="mt-4 grid gap-2">
            {data.freeToday.length ? data.freeToday.slice(0, 5).map((slot) => <SlotLine key={slot.id} slot={slot} />) : (
              <div className="rounded-[18px] border border-[#E5EAF1] bg-[#F8FAFC] p-4">
                <strong className="block text-[14px] font-semibold text-[#111827]">На сегодня свободных окон нет</strong>
                <span className="mt-1 block text-[13px] font-medium leading-5 text-[#667085]">Можно создать окна или посмотреть ближайшие дни в расписании.</span>
              </div>
            )}
          </div>
          <Link to={`${basePath}/schedule?create=slot`} className="v-admin-button-secondary mt-3 w-full justify-center">
            <CalendarPlus width={16} height={16} />
            Создать окна
          </Link>
        </aside>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="v-admin-panel p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">Ближайшие записи</h2>
              <p className="v-admin-note mt-1">Несколько следующих занятий по времени</p>
            </div>
            <Link to={`${basePath}/schedule`} className="v-admin-button-tertiary">Расписание</Link>
          </div>
          <div className="mt-4 grid gap-2">
            {data.upcomingBookings.length ? data.upcomingBookings.map(({ booking, slot }) => {
              const instructor = data.instructors.find((item) => item.id === booking.instructorId)
              return (
                <button key={booking.id} onClick={() => navigate(`${basePath}/schedule`)} className="grid gap-2 rounded-[18px] border border-[#E5EAF1] bg-white p-3 text-left transition hover:border-[#B8D8FF] sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center">
                  <span className="text-[13px] font-semibold text-[#075EBC]">{format(getSlotDateTime(slot), 'd MMM, HH:mm', { locale: ru })}</span>
                  <span className="min-w-0">
                    <PersonMarker role="student" name={booking.studentName} compact />
                    <PersonMarker role="instructor" name={instructor?.name ?? 'Инструктор'} compact />
                  </span>
                  <span className="v-route-pill w-max">{formatDuration(slot.duration)}</span>
                </button>
              )
            }) : (
              <div className="v-admin-empty">
                <strong>Ближайших записей нет</strong>
                <span>Когда ученик выберет окно, запись появится здесь и в расписании.</span>
              </div>
            )}
          </div>
        </div>

        <div className="v-admin-panel p-4">
          <h2 className="text-[18px] font-semibold text-[#111827]">База для записи</h2>
          <div className="mt-4 grid gap-2">
            <Link to={`${basePath}/students`} className="v-admin-button-secondary justify-start"><Group width={16} height={16} />Ученики</Link>
            <Link to={`${basePath}/instructors`} className="v-admin-button-secondary justify-start"><UserBadgeCheck width={16} height={16} />Инструкторы</Link>
            <Link to={`${basePath}/branches`} className="v-admin-button-secondary justify-start"><Building width={16} height={16} />Филиалы</Link>
          </div>
        </div>
      </section>

      <Modal open={blocksOpen} onClose={() => setBlocksOpen(false)} title="Главная" size="sm">
        <div className="p-5">
          <p className="text-[14px] font-medium leading-6 text-[#667085]">
            Главная оставлена короткой: сегодня, ближайшие занятия, свободные окна и ссылка для учеников.
          </p>
          <div className="v-modal-actions mt-4">
            <button type="button" onClick={() => setBlocksOpen(false)} className="v-admin-button flex-1">Понятно</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
