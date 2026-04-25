import { addDays, format, isAfter, isSameDay, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { AlertTriangle, CalendarDays, Clock3, RefreshCw, Users } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { StatCard } from '../../components/ui/StatCard'
import { getUpcomingBookings } from '../../services/bookingService'
import { validateDataIntegrity } from '../../services/integrityService'
import { db } from '../../services/storage'
import { getStudentsBySchool, getStudentStats } from '../../services/studentService'
import { getSlotsBySchool } from '../../services/slotService'

function getSchool() {
  return db.schools.bySlug('virazh')
}

export function AdminDashboard() {
  const school = getSchool()

  const data = useMemo(() => {
    if (!school) {
      return null
    }

    const bookings = db.bookings.bySchool(school.id)
    const slots = db.slots.bySchool(school.id)
    const instructors = db.instructors.bySchool(school.id)
    const branches = db.branches.bySchool(school.id)
    const upcoming = getUpcomingBookings(school.id)
      .filter((entry) => entry.booking.status === 'active')
      .slice(0, 8)
    const today = new Date()
    const tomorrow = addDays(today, 1)
    const weekAhead = addDays(today, 7)

    const bookingsToday = bookings.filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return slot ? isSameDay(new Date(`${slot.date}T${slot.time}:00`), today) : false
    })

    const bookingsTomorrow = bookings.filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return slot ? isSameDay(new Date(`${slot.date}T${slot.time}:00`), tomorrow) : false
    })

    const activeBookings = bookings.filter((booking) => booking.status === 'active')
    const activeInstructors = instructors.filter((instructor) => instructor.isActive)
    const freeSlots7d = slots.filter((slot) => {
      const startsAt = new Date(`${slot.date}T${slot.time}:00`)
      return slot.status === 'available' && isAfter(startsAt, today) && startsAt <= weekAhead
    })

    const recentCancellations = bookings.filter(
      (booking) =>
        booking.status === 'cancelled' &&
        new Date(booking.updatedAt ?? booking.createdAt) >= subDays(today, 7),
    )

    const issues = validateDataIntegrity(school.id)
    const instructorsWithoutSlots = activeInstructors.filter(
      (instructor) =>
        slots.filter(
          (slot) =>
            slot.instructorId === instructor.id &&
            slot.status === 'available' &&
            isAfter(new Date(`${slot.date}T${slot.time}:00`), today),
        ).length === 0,
    )
    const branchesWithoutInstructors = branches.filter(
      (branch) => instructors.filter((instructor) => instructor.branchId === branch.id).length === 0,
    )
    const overLimitStudents = getStudentsBySchool(school.id).filter((student) => getStudentStats(student.id).limitReached)

    return {
      bookingsToday,
      bookingsTomorrow,
      activeBookings,
      freeSlots7d,
      activeInstructors,
      recentCancellations,
      upcoming,
      issues: [
        ...issues,
        ...(freeSlots7d.length === 0
          ? [{ id: 'no-free-slots', level: 'warning' as const, message: 'На ближайшие 7 дней нет свободных слотов.' }]
          : []),
        ...(instructorsWithoutSlots.length > 0
          ? [{
              id: 'instructors-without-slots',
              level: 'warning' as const,
              message: `Есть инструкторы без слотов: ${instructorsWithoutSlots.slice(0, 3).map((item) => item.name).join(', ')}.`,
            }]
          : []),
        ...(branchesWithoutInstructors.length > 0
          ? [{
              id: 'branches-without-instructors',
              level: 'warning' as const,
              message: `Есть филиалы без инструкторов: ${branchesWithoutInstructors.slice(0, 3).map((item) => item.name).join(', ')}.`,
            }]
          : []),
        ...(overLimitStudents.length > 0
          ? [{
              id: 'students-over-limit',
              level: 'warning' as const,
              message: `Есть ученики с превышением лимита будущих записей: ${overLimitStudents.slice(0, 3).map((item) => item.name).join(', ')}.`,
            }]
          : []),
      ],
      slotCount: getSlotsBySchool(school.id).length,
    }
  }, [school])

  if (!school || !data) {
    return (
      <div className="max-w-7xl p-6 md:p-8">
        <EmptyState title="Школа не найдена" description="Демо-данные не загружены. Попробуйте сбросить localStorage и открыть проект снова." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <PageHeader
        eyebrow={school.name}
        title="Обзор"
        description="Операционная картина по записям, слотам и загрузке школы на ближайшие дни."
        actions={
          <Button variant="secondary" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Обновить
          </Button>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Записей сегодня" value={data.bookingsToday.length} icon={<CalendarDays size={18} />} />
        <StatCard label="Записей завтра" value={data.bookingsTomorrow.length} icon={<CalendarDays size={18} />} />
        <StatCard label="Активных записей" value={data.activeBookings.length} icon={<Users size={18} />} />
        <StatCard label="Свободных слотов на 7 дней" value={data.freeSlots7d.length} icon={<Clock3 size={18} />} />
        <StatCard label="Активных инструкторов" value={data.activeInstructors.length} icon={<Users size={18} />} />
        <StatCard label="Отмен за 7 дней" value={data.recentCancellations.length} icon={<AlertTriangle size={18} />} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <Section
          title="Ближайшие занятия"
          description="Только активные записи. Ближайшие слоты наверху."
          actions={
            <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/admin/bookings')}>
              Все записи
            </Button>
          }
        >
          {data.upcoming.length === 0 ? (
            <EmptyState title="Ближайших занятий пока нет" description="Когда появятся активные записи, они будут показаны здесь." />
          ) : (
            <div className="space-y-3">
              {data.upcoming.map((entry) => (
                <Link
                  key={entry.booking.id}
                  to={`/booking/${entry.booking.id}`}
                  className="flex flex-col gap-3 rounded-3xl border border-stone-100 bg-stone-50 px-4 py-4 transition hover:border-stone-200 hover:bg-white md:flex-row md:items-center"
                >
                  <div className="min-w-[140px]">
                    <p className="text-sm font-semibold text-stone-900">
                      {entry.slot
                        ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'd MMMM, HH:mm', { locale: ru })
                        : 'Не найдено'}
                    </p>
                    <p className="text-xs text-stone-500">{entry.branch?.name ?? 'Филиал не найден'}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900">{entry.booking.studentName}</p>
                    <p className="truncate text-sm text-stone-500">
                      {entry.instructor?.name ?? 'Инструктор не найден'}
                    </p>
                  </div>
                  <StatusBadge status={entry.booking.status} />
                </Link>
              ))}
            </div>
          )}
        </Section>

        <div className="space-y-6">
          <Section title="Сегодня" description="Короткая сводка по текущему дню.">
            <div className="grid gap-3">
              <div className="rounded-3xl border border-stone-100 bg-stone-50 px-4 py-4">
                <p className="text-sm text-stone-500">Занятия сегодня</p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">{data.bookingsToday.length}</p>
              </div>
              <div className="rounded-3xl border border-stone-100 bg-stone-50 px-4 py-4">
                <p className="text-sm text-stone-500">Отмены сегодня</p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">
                  {data.bookingsToday.filter((booking) => booking.status === 'cancelled').length}
                </p>
              </div>
              <div className="rounded-3xl border border-stone-100 bg-stone-50 px-4 py-4">
                <p className="text-sm text-stone-500">Свободные слоты сегодня</p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">
                  {db.slots.bySchool(school.id).filter((slot) => slot.status === 'available' && slot.date === format(new Date(), 'yyyy-MM-dd')).length}
                </p>
              </div>
            </div>
          </Section>

          <Section title="Проблемы и диагностика" description="Только простые операционные сигналы, без сложной аналитики.">
            {data.issues.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle size={20} />}
                title="Критичных сигналов нет"
                description={`Данные выглядят аккуратно: ${data.slotCount} слотов и активная запись работы школы.`}
              />
            ) : (
              <div className="space-y-3">
                {data.issues.map((issue) => (
                  <div key={issue.id} className="rounded-3xl border border-stone-100 bg-stone-50 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <Badge variant={issue.level === 'error' ? 'error' : 'warning'}>
                        {issue.level === 'error' ? 'Ошибка' : 'Внимание'}
                      </Badge>
                      <p className="text-sm leading-relaxed text-stone-600">{issue.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
