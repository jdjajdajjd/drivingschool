import { addDays, format, isAfter, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarDays, CheckCircle2, ClipboardList, Copy, ExternalLink, MapPin, Users } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { StatCard } from '../../components/ui/StatCard'
import { useToast } from '../../components/ui/Toast'
import { getUpcomingBookings } from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { db } from '../../services/storage'

function getSchool() {
  return db.schools.bySlug('virazh')
}

export function AdminDashboard() {
  const school = getSchool()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const data = useMemo(() => {
    if (!school) return null

    const now = new Date()
    const tomorrow = addDays(now, 1)
    const weekAhead = addDays(now, 7)
    const branches = db.branches.bySchool(school.id)
    const instructors = db.instructors.bySchool(school.id)
    const slots = db.slots.bySchool(school.id)
    const bookings = db.bookings.bySchool(school.id)
    const activeBookings = bookings.filter((booking) => booking.status === 'active')
    const upcoming = getUpcomingBookings(school.id)
      .filter((entry) => entry.booking.status === 'active')
      .slice(0, 8)

    const todayBookings = activeBookings.filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return slot ? isSameDay(new Date(`${slot.date}T${slot.time}:00`), now) : false
    })

    const tomorrowBookings = activeBookings.filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return slot ? isSameDay(new Date(`${slot.date}T${slot.time}:00`), tomorrow) : false
    })

    const freeSlots7d = slots.filter((slot) => {
      const startsAt = new Date(`${slot.date}T${slot.time}:00`)
      return slot.status === 'available' && isAfter(startsAt, now) && startsAt <= weekAhead
    })

    const launchItems = [
      { label: 'Данные школы заполнены', done: Boolean(school.name && school.phone && school.address) },
      { label: 'Филиалы добавлены', done: branches.some((branch) => branch.isActive) },
      { label: 'Инструкторы добавлены', done: instructors.some((instructor) => instructor.isActive) },
      { label: 'Расписание создано', done: freeSlots7d.length > 0 },
      { label: 'Ссылка для учеников готова', done: Boolean(school.slug) },
    ]

    return {
      activeBookings,
      branches,
      freeSlots7d,
      instructors,
      launchItems,
      todayBookings,
      tomorrowBookings,
      upcoming,
    }
  }, [school])

  if (!school || !data) {
    return (
      <div className="max-w-7xl p-6 md:p-8">
        <EmptyState title="Школа не найдена" description="Откройте страницу школы или проверьте подключение данных." />
      </div>
    )
  }

  const publicUrl = `${window.location.origin}/school/${school.slug}`

  async function copyPublicLink(): Promise<void> {
    await navigator.clipboard.writeText(publicUrl)
    showToast('Ссылка для учеников скопирована.', 'success')
  }

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <PageHeader
        eyebrow={school.name}
        title="Сегодня"
        description="Самое важное для работы автошколы: занятия, свободные места и готовность страницы для учеников."
        actions={
          <Button variant="secondary" onClick={() => void copyPublicLink()}>
            <Copy size={16} />
            Скопировать ссылку
          </Button>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Занятий сегодня" value={data.todayBookings.length} icon={<CalendarDays size={18} />} />
        <StatCard label="Занятий завтра" value={data.tomorrowBookings.length} icon={<CalendarDays size={18} />} />
        <StatCard label="Свободных мест на 7 дней" value={data.freeSlots7d.length} icon={<ClipboardList size={18} />} />
        <StatCard label="Активных инструкторов" value={data.instructors.filter((item) => item.isActive).length} icon={<Users size={18} />} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
        <Section
          title="Ближайшие занятия"
          description="Только реальные активные записи. Ближайшие занятия сверху."
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate(`${ADMIN_BASE_PATH}/bookings`)}>
              Все записи
            </Button>
          }
        >
          {data.upcoming.length === 0 ? (
            <EmptyState title="Ближайших занятий пока нет" description="Когда ученики запишутся, занятия появятся здесь." />
          ) : (
            <div className="space-y-3">
              {data.upcoming.map((entry) => (
                <Link
                  key={entry.booking.id}
                  to={`/booking/${entry.booking.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-stone-200 px-4 py-4 transition hover:border-blue-200 hover:bg-blue-50/30 md:flex-row md:items-center"
                >
                  <div className="min-w-[150px]">
                    <p className="text-base font-semibold text-stone-900">
                      {entry.slot
                        ? format(new Date(`${entry.slot.date}T${entry.slot.time}:00`), 'd MMMM, HH:mm', { locale: ru })
                        : 'Время не найдено'}
                    </p>
                    <p className="text-sm text-stone-500">{entry.branch?.name ?? 'Филиал не найден'}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-stone-900">{entry.booking.studentName}</p>
                    <p className="truncate text-base text-stone-500">{entry.instructor?.name ?? 'Инструктор не найден'}</p>
                  </div>
                  <StatusBadge status={entry.booking.status} />
                </Link>
              ))}
            </div>
          )}
        </Section>

        <div className="space-y-6">
          <Section title="Мастер запуска" description="Что нужно проверить перед тем, как давать ссылку ученикам.">
            <div className="space-y-3">
              {data.launchItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-stone-50 px-4 py-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.done ? 'bg-blue-50 text-blue-700' : 'bg-white text-stone-300'}`}>
                    <CheckCircle2 size={19} />
                  </div>
                  <p className="text-base font-medium text-stone-800">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              <Button onClick={() => navigate(`${ADMIN_BASE_PATH}/settings`)}>Настроить школу</Button>
              <Button variant="secondary" onClick={() => navigate(`${ADMIN_BASE_PATH}/slots`)}>Создать расписание</Button>
            </div>
          </Section>

          <Section title="Ссылка для учеников" description="Эту ссылку можно отправить в мессенджер или поставить на сайт школы.">
            <div className="rounded-2xl bg-stone-50 px-4 py-4">
              <p className="break-all text-base font-semibold text-stone-900">{publicUrl}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => void copyPublicLink()}>
                <Copy size={16} />
                Скопировать
              </Button>
              <Button variant="secondary" onClick={() => window.open(publicUrl, '_blank')}>
                <ExternalLink size={16} />
                Открыть
              </Button>
            </div>
          </Section>

          <Section title="Филиалы" description="Короткая проверка, что ученику понятно куда ехать.">
            <div className="space-y-3">
              {data.branches.map((branch) => (
                <div key={branch.id} className="flex gap-3 rounded-2xl bg-stone-50 px-4 py-4">
                  <MapPin size={19} className="mt-0.5 shrink-0 text-stone-400" />
                  <div>
                    <p className="text-base font-semibold text-stone-900">{branch.name}</p>
                    <p className="mt-1 text-sm text-stone-500">{branch.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
