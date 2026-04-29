import { ArrowLeft, CalendarDays, RotateCcw, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { StatCard } from '../../components/ui/StatCard'
import { useToast } from '../../components/ui/Toast'
import { formatInstructorName, formatPhone } from '../../lib/utils'
import { formatHumanDate, formatTimeRange } from '../../utils/date'
import { cancelBooking, completeBooking, getBookingsByStudent } from '../../services/bookingService'
import { getStudentById, getStudentStats } from '../../services/studentService'
import { db } from '../../services/storage'
import { ADMIN_BASE_PATH } from '../../services/accessControl'

export function AdminStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)
  const [completeBookingId, setCompleteBookingId] = useState<string | null>(null)

  const student = studentId ? getStudentById(studentId) : null
  const school = student ? db.schools.byId(student.schoolId) : null
  const stats = student ? getStudentStats(student.id) : null
  const history = useMemo(() => (student ? getBookingsByStudent(student.id) : []), [student])

  function handleCancel(): void {
    if (!cancelBookingId) return
    const result = cancelBooking(cancelBookingId)
    setCancelBookingId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось отменить запись.', 'error')
      return
    }
    showToast('Запись ученика отменена.', 'success')
  }

  function handleComplete(): void {
    if (!completeBookingId) return
    const result = completeBooking(completeBookingId)
    setCompleteBookingId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось отметить запись проведённой.', 'error')
      return
    }
    showToast('Запись отмечена проведённой.', 'success')
  }

  if (!student || !stats) {
    return (
      <div className="max-w-7xl p-4 md:p-6">
        <EmptyState
          title="Ученик не найден"
          description="В localStorage нет данных по этому ученику или ссылка устарела."
          action={
            <Button onClick={() => navigate(`${ADMIN_BASE_PATH}/students`)}>К списку учеников</Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-4 md:p-6">
      <button
        onClick={() => navigate(`${ADMIN_BASE_PATH}/students`)}
        className="mb-4 inline-flex items-center gap-2 text-sm text-product-muted transition hover:text-product-main"
      >
        <ArrowLeft size={16} />
        Назад к ученикам
      </button>

      <PageHeader
        eyebrow={school?.name}
        title={student.name}
        description={`Телефон: ${formatPhone(student.normalizedPhone)} · Создан: ${new Date(student.createdAt).toLocaleString('ru-RU')}`}
      />

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Всего записей" value={stats.totalBookings} />
        <StatCard label="Будущих активных" value={stats.activeFutureBookings} icon={<CalendarDays size={18} />} />
        <StatCard label="Проведено" value={stats.completedBookings} />
        <StatCard label="Отменено" value={stats.cancelledBookings} icon={<XCircle size={18} />} />
      </div>

      <div className="mt-8 space-y-6">
        <Section title="Профиль ученика" description="Основные данные и лимиты по бронированию.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-product-border bg-product-alt px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-product-muted">Телефон</p>
              <p className="mt-1 text-sm font-semibold text-product-main">{formatPhone(student.normalizedPhone)}</p>
            </div>
            <div className="rounded-[24px] border border-product-border bg-product-alt px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-product-muted">Normalized phone</p>
              <p className="mt-1 text-sm font-semibold text-product-main">{student.normalizedPhone}</p>
            </div>
            <div className="rounded-[24px] border border-product-border bg-product-alt px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-product-muted">Будущих активных</p>
              <p className="mt-1 text-sm font-semibold text-product-main">{stats.activeFutureBookings}</p>
            </div>
            <div className="rounded-[24px] border border-product-border bg-product-alt px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-product-muted">Отменял</p>
              <p className="mt-1 text-sm font-semibold text-product-main">{stats.cancellationsCount} раз</p>
            </div>
          </div>
        </Section>

        <Section title="История записей" description="Активные, проведённые и отменённые занятия по ученику.">
          {history.length === 0 ? (
            <EmptyState title="У ученика ещё нет записей" description="Новая запись появится здесь автоматически после бронирования." />
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.booking.id} className="rounded-[24px] border border-product-border bg-white p-4 shadow-soft">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-product-muted">Дата и время</p>
                        <p className="mt-1 text-sm font-semibold text-product-main">
                          {entry.slot ? `${formatHumanDate(entry.slot.date, false)} · ${formatTimeRange(entry.slot)}` : 'Не найдено'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-product-muted">Филиал</p>
                        <p className="mt-1 text-sm font-semibold text-product-main">{entry.branch?.name ?? 'Не найдено'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-product-muted">Инструктор</p>
                        <p className="mt-1 text-sm font-semibold text-product-main">{entry.instructor ? formatInstructorName(entry.instructor.name) : 'Не найдено'}</p>
                        <p className="text-sm text-product-muted">{entry.instructor?.car ?? 'Без машины'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-product-muted">Статус</p>
                        <div className="mt-1">
                          <StatusBadge status={entry.booking.status} />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[340px]">
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/booking/${entry.booking.id}`)}>
                        Открыть запись
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={entry.booking.status !== 'active'}
                        onClick={() => setCompleteBookingId(entry.booking.id)}
                      >
                        Проведена
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={entry.booking.status !== 'active'}
                        onClick={() => setCancelBookingId(entry.booking.id)}
                      >
                        Отменить
                      </Button>
                    </div>
                  </div>

                  {entry.booking.status === 'active' ? (
                    <div className="mt-3">
                      <Link
                        to={`${ADMIN_BASE_PATH}/bookings`}
                        className="inline-flex items-center gap-2 text-sm text-product-primary transition hover:text-product-primary"
                      >
                        <RotateCcw size={15} />
                        Перейти к переносу в разделе записей
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={Boolean(cancelBookingId)}
        title="Отменить запись"
        description="Запись ученика перейдёт в статус «Отменена», а слот станет свободным."
        confirmLabel="Отменить запись"
        onClose={() => setCancelBookingId(null)}
        onConfirm={handleCancel}
        danger
      />

      <ConfirmDialog
        open={Boolean(completeBookingId)}
        title="Отметить проведённой"
        description="Запись ученика перейдёт в статус «Проведена»."
        confirmLabel="Отметить проведённой"
        onClose={() => setCompleteBookingId(null)}
        onConfirm={handleComplete}
      />
    </div>
  )
}
