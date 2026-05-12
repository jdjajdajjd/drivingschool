import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft01Icon,
  Calendar03Icon,
  Call02Icon,
  CancelCircleIcon,
  Car03Icon,
  Clock01Icon,
  Message02Icon,
  Note03Icon,
  UserAccountIcon,
} from '@hugeicons/core-free-icons'
import { Avatar } from '../components/ui/Avatar'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { pluralize } from '../lib/utils'
import { cancelBooking, completeBooking, getSlotDateTime, updateBookingComment } from '../services/bookingService'
import { getInstructorPhoto } from '../services/instructorPhotos'
import { isSupabaseConfigured } from '../lib/supabase'
import { db } from '../services/storage'
import { getPublicInstructorBundle } from '../services/supabasePublicService'
import { loadLessonDescription, loadStudentProgress } from '../services/studentProfile'
import type { Booking, Branch, Instructor, LessonType, Slot, Student, StudentProgress } from '../types'
import { formatDateFull, formatDayOfWeek, formatHumanDate, formatTimeRange } from '../utils/date'

const ArrowLeft = createHugeIcon(ArrowLeft01Icon)
const XCircle = createHugeIcon(CancelCircleIcon)
const Clock = createHugeIcon(Clock01Icon)
const Calendar = createHugeIcon(Calendar03Icon)
const Call = createHugeIcon(Call02Icon)
const Message = createHugeIcon(Message02Icon)
const Note = createHugeIcon(Note03Icon)
const Car = createHugeIcon(Car03Icon)
const UserAccount = createHugeIcon(UserAccountIcon)

interface BookingRow {
  booking: Booking
  slot: Slot | null
  student: Student | null
  progress: StudentProgress | null
  lessonNote: string
}

type WorkdayFilter = 'today' | 'upcoming' | 'history'
type ActionMode = 'complete' | 'cancel' | null

const lessonTypeLabels: Record<LessonType, string> = {
  driving: 'Вождение',
  main: 'Основное занятие',
  extra: 'Доп. занятие',
  practice_ground: 'Площадка',
  city: 'Город',
  exam_route: 'Маршрут экзамена',
  internal_exam: 'Внутренний экзамен',
  retake: 'Пересдача',
  mistakes: 'Разбор ошибок',
}

function sortAsc(left: BookingRow, right: BookingRow): number {
  const leftValue = left.slot ? `${left.slot.date}T${left.slot.time}` : left.booking.createdAt
  const rightValue = right.slot ? `${right.slot.date}T${right.slot.time}` : right.booking.createdAt
  return leftValue.localeCompare(rightValue)
}

function sortDesc(left: BookingRow, right: BookingRow): number {
  return sortAsc(right, left)
}

function isSameLocalDay(slot: Slot | null, date = new Date()): boolean {
  if (!slot) return false
  return getSlotDateTime(slot).toDateString() === date.toDateString()
}

function isFutureOrToday(slot: Slot | null, date = new Date()): boolean {
  if (!slot) return true
  const startsAt = getSlotDateTime(slot)
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  return startsAt.getTime() >= dayStart.getTime()
}

function getRowStudent(booking: Booking): Student | null {
  if (booking.studentId) return db.students.byId(booking.studentId)
  if (!booking.studentPhone) return null
  return db.students.byNormalizedPhone(booking.schoolId, booking.studentPhone)
}

function buildRow(booking: Booking, slot: Slot | null): BookingRow {
  const student = getRowStudent(booking)
  const lessonDescription = slot ? loadLessonDescription(slot.id) : null
  return {
    booking,
    slot,
    student,
    progress: student ? loadStudentProgress(student.id) : null,
    lessonNote: lessonDescription?.notes || booking.comment || booking.notes || '',
  }
}

function readinessIssues(row: BookingRow, branch: Branch | null, instructor: Instructor): string[] {
  const issues: string[] = []
  if (!row.slot) issues.push('не найдены дата и время занятия')
  if (!branch?.address) issues.push('не указан адрес встречи')
  if (!instructor.car) issues.push('не указан автомобиль')
  if (!row.booking.studentPhone) issues.push('нет телефона ученика')
  if (!row.student) issues.push('нет карточки ученика с историей обучения')
  if (row.booking.status === 'active' && row.slot && getSlotDateTime(row.slot).getTime() < Date.now()) {
    issues.push('прошедшее занятие ещё не закрыто')
  }
  return issues
}

function contactLink(phone: string, channel: 'tel' | 'sms'): string {
  const digits = phone.replace(/\D/g, '')
  if (channel === 'sms') return `sms:${digits}`
  return `tel:${digits}`
}

function EmptyBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[10px] border border-dashed border-[#CBD5E1] bg-white px-4 py-6 text-center">
      <p className="text-[16px] font-black text-[#111418]">{title}</p>
      <p className="mt-1 text-[14px] font-semibold leading-6 text-[#5F6875]">{text}</p>
    </div>
  )
}

function WorkdayRow({
  row,
  branch,
  instructor,
  isExpanded,
  actionMode,
  draftNote,
  onOpenAction,
  onDraftNote,
  onSubmitAction,
}: {
  row: BookingRow
  branch: Branch | null
  instructor: Instructor
  isExpanded: boolean
  actionMode: ActionMode
  draftNote: string
  onOpenAction: (mode: ActionMode) => void
  onDraftNote: (value: string) => void
  onSubmitAction: () => void
}) {
  const issues = readinessIssues(row, branch, instructor)
  const hasStudentPhone = Boolean(row.booking.studentPhone)
  const progressLabel = row.progress
    ? `${row.progress.drivingHoursCompleted}/${row.progress.drivingHoursTotal || 'план'} ч практики`
    : 'история не заполнена'
  const lessonType = row.slot?.lessonType ? lessonTypeLabels[row.slot.lessonType] : 'Тип занятия не указан'

  return (
    <article className="rounded-[12px] border border-[#DDE3EC] bg-white shadow-[0_10px_26px_rgba(15,20,25,0.045)]">
      <div className="px-4 py-4">
        <div className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-start gap-3">
          <div className="rounded-[10px] border border-[#E3E8F0] bg-[#F8FAFC] px-2 py-2 text-center">
            <p className="text-[14px] font-black leading-tight text-[#111418]">{row.slot?.time ?? '—'}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#6B7280]">
              {row.slot ? formatDayOfWeek(row.slot.date).slice(0, 2) : 'нет'}
            </p>
          </div>

          <div className="min-w-0">
            <p className="truncate text-[16px] font-black leading-5 tracking-[-0.02em] text-[#111418]">{row.booking.studentName}</p>
            <p className="mt-1 truncate text-[13px] font-bold text-[#5F6875]">
              {lessonType} · {branch?.address ?? 'адрес не указан'}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge status={row.booking.status} />
              {issues.length ? <Badge variant="warning">Проверить {issues.length}</Badge> : <Badge variant="success">Готово к занятию</Badge>}
            </div>
          </div>

          <div className="text-right">
            <p className="text-[12px] font-black text-[#111418]">{row.slot ? formatHumanDate(row.slot.date, false) : 'Дата не найдена'}</p>
            <p className="mt-1 text-[11px] font-bold text-[#737985]">{row.slot ? formatTimeRange(row.slot) : '—'}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-[13px] font-semibold text-[#3F4854] sm:grid-cols-3">
          <div className="flex min-h-11 items-center gap-2 rounded-[8px] bg-[#F7F8FA] px-3">
            <Car size={16} className="text-[#1F3A8A]" />
            <span className="truncate">{instructor.car ?? 'Авто не указано'}</span>
          </div>
          <div className="flex min-h-11 items-center gap-2 rounded-[8px] bg-[#F7F8FA] px-3">
            <UserAccount size={16} className="text-[#1F3A8A]" />
            <span className="truncate">{progressLabel}</span>
          </div>
          <div className="flex min-h-11 items-center gap-2 rounded-[8px] bg-[#F7F8FA] px-3">
            <Note size={16} className="text-[#1F3A8A]" />
            <span className="truncate">{row.lessonNote || row.booking.comment || 'комментария нет'}</span>
          </div>
        </div>

        {issues.length > 0 ? (
          <div className="mt-3 rounded-[8px] border border-[#F6D99D] bg-[#FFF8E6] px-3 py-3">
            <p className="text-[13px] font-black text-[#684500]">Что мешает нормальному статусу</p>
            <ul className="mt-1.5 space-y-1 text-[12px] font-semibold leading-5 text-[#7A5607]">
              {issues.map((issue) => <li key={issue}>• {issue}</li>)}
            </ul>
          </div>
        ) : null}

        {isExpanded ? (
          <div className="mt-4 rounded-[10px] border border-[#DDE3EC] bg-[#F8FAFC] px-3 py-3">
            <div className="grid gap-2 text-[13px] font-semibold text-[#3F4854]">
              <p><strong className="text-[#111418]">Тема:</strong> {lessonType}</p>
              <p><strong className="text-[#111418]">Ученик:</strong> {row.student?.groupName ? `${row.student.groupName}, ` : ''}{row.student?.trainingStage ?? 'этап не указан'}</p>
              <p><strong className="text-[#111418]">Заметка:</strong> {row.lessonNote || row.booking.comment || 'после занятия инструктор может оставить результат здесь'}</p>
            </div>
          </div>
        ) : null}

        {row.booking.status === 'active' ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <a
              className={`grid min-h-11 place-items-center rounded-[8px] border px-3 text-center text-[12px] font-black ${hasStudentPhone ? 'border-[#DDE3EC] bg-white text-[#111418]' : 'pointer-events-none border-[#EEF0F4] bg-[#F7F8FA] text-[#9EA3A8]'}`}
              href={hasStudentPhone ? contactLink(row.booking.studentPhone, 'tel') : undefined}
              aria-disabled={!hasStudentPhone}
            >
              <span className="inline-flex items-center gap-1.5"><Call size={14} /> Позвонить</span>
            </a>
            <a
              className={`grid min-h-11 place-items-center rounded-[8px] border px-3 text-center text-[12px] font-black ${hasStudentPhone ? 'border-[#DDE3EC] bg-white text-[#111418]' : 'pointer-events-none border-[#EEF0F4] bg-[#F7F8FA] text-[#9EA3A8]'}`}
              href={hasStudentPhone ? contactLink(row.booking.studentPhone, 'sms') : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!hasStudentPhone}
            >
              <span className="inline-flex items-center gap-1.5"><Message size={14} /> SMS</span>
            </a>
            <button
              type="button"
              onClick={() => onOpenAction('complete')}
              className="min-h-11 rounded-[8px] bg-[#1F3A8A] px-3 text-[12px] font-black text-white active:scale-[0.995]"
            >
              Проведено
            </button>
            <button
              type="button"
              onClick={() => onOpenAction('cancel')}
              className="min-h-11 rounded-[8px] border border-[#F3B7B3] bg-white px-3 text-[12px] font-black text-[#C6372E] active:scale-[0.995]"
            >
              Отмена
            </button>
          </div>
        ) : null}

        {actionMode ? (
          <div className="mt-3 rounded-[10px] border border-[#DDE3EC] bg-[#FAFBFC] px-3 py-3">
            <label className="text-[13px] font-black text-[#111418]" htmlFor={`note-${row.booking.id}`}>
              {actionMode === 'complete' ? 'Комментарий после занятия' : 'Причина отмены'}
            </label>
            <textarea
              id={`note-${row.booking.id}`}
              value={draftNote}
              onChange={(event) => onDraftNote(event.target.value)}
              className="mt-2 min-h-[96px] w-full rounded-[8px] border border-[#D8DEE8] bg-white px-3 py-2 text-[15px] font-semibold leading-6 text-[#111418] outline-none focus:border-[#1F3A8A]"
              placeholder={actionMode === 'complete' ? 'Например: город, перестроения, повторить парковку' : 'Например: ученик заболел, перенести на вечер'}
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={onSubmitAction}
                className="min-h-11 flex-1 rounded-[8px] bg-[#1F3A8A] px-3 text-[13px] font-black text-white"
              >
                {actionMode === 'complete' ? 'Закрыть занятие' : 'Отменить занятие'}
              </button>
              <button
                type="button"
                onClick={() => onOpenAction(null)}
                className="min-h-11 rounded-[8px] border border-[#D8DEE8] bg-white px-4 text-[13px] font-black text-[#111418]"
              >
                Не сейчас
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function InstructorPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [instructor, setInstructor] = useState<Instructor | null>(null)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [rows, setRows] = useState<BookingRow[]>([])
  const [filter, setFilter] = useState<WorkdayFilter>('today')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionMode, setActionMode] = useState<ActionMode>(null)
  const [draftNote, setDraftNote] = useState('')
  const [notice, setNotice] = useState('')

  function reloadRows(currentInstructor: Instructor): void {
    setRows(
      db.bookings
        .byInstructor(currentInstructor.id)
        .map((booking) => buildRow(booking, db.slots.byId(booking.slotId)))
        .sort(sortAsc),
    )
  }

  useEffect(() => {
    if (!token) {
      return
    }

    if (isSupabaseConfigured()) {
      void getPublicInstructorBundle(token)
        .then((bundle) => {
          if (!bundle) {
            setInstructor(null)
            setBranch(null)
            setRows([])
            return
          }

          setInstructor(bundle.instructor)
          setBranch(bundle.branch)
          setRows(
            bundle.bookings
              .map((booking) => buildRow(booking, bundle.slots.find((slot) => slot.id === booking.slotId) ?? null))
              .sort(sortAsc),
          )
        })
        .catch(() => {
          const currentInstructor = db.instructors.byToken(token)
          if (!currentInstructor) {
            setInstructor(null)
            setBranch(null)
            setRows([])
            return
          }
          setInstructor(currentInstructor)
          setBranch(db.branches.byId(currentInstructor.branchId))
          reloadRows(currentInstructor)
        })
      return
    }

    const currentInstructor = db.instructors.byToken(token)
    if (!currentInstructor) {
      setInstructor(null)
      setBranch(null)
      setRows([])
      return
    }

    setInstructor(currentInstructor)
    setBranch(db.branches.byId(currentInstructor.branchId))
    reloadRows(currentInstructor)
  }, [token])

  const grouped = useMemo(() => {
    const today = rows
      .filter((row) => row.booking.status === 'active' && isSameLocalDay(row.slot))
      .sort(sortAsc)

    const upcoming = rows
      .filter((row) => row.booking.status === 'active' && !isSameLocalDay(row.slot) && isFutureOrToday(row.slot))
      .sort(sortAsc)

    const history = rows
      .filter((row) => row.booking.status !== 'active' || !isFutureOrToday(row.slot))
      .sort(sortDesc)

    const unresolvedPast = rows.filter((row) => row.booking.status === 'active' && row.slot && getSlotDateTime(row.slot).getTime() < Date.now()).length
    const issues = rows.reduce((count, row) => count + (instructor ? readinessIssues(row, branch, instructor).length : 0), 0)

    return { today, upcoming, history, unresolvedPast, issues }
  }, [branch, instructor, rows])

  const visibleRows = filter === 'today' ? grouped.today : filter === 'upcoming' ? grouped.upcoming : grouped.history
  const nextRow = grouped.today[0] ?? grouped.upcoming[0] ?? null

  function updateRowsAfterMutation(updatedBooking: Booking, slot: Slot | null): void {
    const nextRow = buildRow(updatedBooking, slot)
    setRows((currentRows) => currentRows.map((row) => row.booking.id === updatedBooking.id ? nextRow : row).sort(sortAsc))
  }

  function openAction(bookingId: string, mode: ActionMode) {
    setActionId(mode ? bookingId : null)
    setActionMode(mode)
    const row = rows.find((currentRow) => currentRow.booking.id === bookingId)
    setDraftNote(row?.booking.comment || row?.lessonNote || '')
    setNotice('')
  }

  function handleSubmitAction() {
    if (!actionId || !actionMode) return
    const row = rows.find((currentRow) => currentRow.booking.id === actionId)
    if (!row) return

    const existingLocalBooking = db.bookings.byId(actionId)
    const note = draftNote.trim()
    const mutation = actionMode === 'complete'
      ? existingLocalBooking ? completeBooking(actionId, { skipRemote: true, comment: note }) : { ok: true, booking: { ...row.booking, status: 'completed' as const, comment: note || row.booking.comment, notes: note || row.booking.notes, updatedAt: new Date().toISOString() } }
      : existingLocalBooking ? cancelBooking(actionId, { skipRemote: true }) : { ok: true, booking: { ...row.booking, status: 'cancelled' as const, comment: note || row.booking.comment, notes: note || row.booking.notes, updatedAt: new Date().toISOString() } }

    if (!mutation.ok || !mutation.booking) {
      setNotice(mutation.error ?? 'Не удалось изменить статус занятия.')
      return
    }

    const commentResult = existingLocalBooking && actionMode === 'cancel' && note
      ? updateBookingComment(mutation.booking.id, note)
      : mutation
    const withComment = commentResult.booking ?? mutation.booking
    const nextSlot = db.slots.byId(withComment.slotId) ?? row.slot
    updateRowsAfterMutation(withComment, nextSlot)
    setActionId(null)
    setActionMode(null)
    setDraftNote('')
    setNotice(actionMode === 'complete' ? 'Занятие закрыто. Комментарий сохранён в карточке записи.' : 'Занятие отменено. Время снова можно отдать ученику.')
  }

  if (!instructor) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F4F5F7] px-5">
        <div className="w-full max-w-md rounded-[14px] border border-[#DDE3EC] bg-white px-5 py-8 text-center shadow-[0_16px_40px_rgba(15,20,25,0.06)]">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[12px] bg-[#FEF2F2]">
            <XCircle size={26} className="text-[#C6372E]" />
          </div>
          <p className="mt-5 text-[22px] font-black tracking-[-0.03em] text-[#111418]">Инструктор не найден</p>
          <p className="mt-2 text-[15px] font-semibold leading-6 text-[#5F6875]">Ссылка недействительна или инструктор пока не добавлен в систему.</p>
          <Button className="mt-6 w-full" onClick={() => navigate('/')}>
            На главную
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F4F5F7] text-[#111418]">
      <header className="sticky top-0 z-30 border-b border-[#DDE3EC] bg-[#F8FAFC]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex min-h-11 items-center gap-2 rounded-[8px] px-2 text-[14px] font-black text-[#3F4854] active:bg-[#EEF0F4]"
          >
            <ArrowLeft size={17} />
            Назад
          </button>
          <p className="text-[14px] font-black text-[#111418]">Кабинет инструктора</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-12 pt-4 sm:px-6 sm:pt-7">
        <section className="rounded-[14px] border border-[#DDE3EC] bg-white px-4 py-4 shadow-[0_12px_34px_rgba(15,20,25,0.055)] sm:px-5">
          <div className="flex items-start gap-4">
            <Avatar
              initials={instructor.avatarInitials}
              color={instructor.avatarColor}
              src={getInstructorPhoto(instructor)}
              alt={instructor.name}
              size="xl"
              className="rounded-[10px]"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[22px] font-black leading-7 tracking-[-0.035em] text-[#111418] sm:text-[28px]">{instructor.name}</p>
              <p className="mt-1 text-[14px] font-semibold leading-6 text-[#5F6875]">{branch?.name ?? 'Филиал не найден'} · {instructor.car ?? 'автомобиль не указан'}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {instructor.categories.map((category) => (
                  <Badge key={category} variant="outline">кат. {category}</Badge>
                ))}
                <Badge variant={instructor.isActive ? 'success' : 'default'}>
                  {instructor.isActive ? 'Принимает записи' : 'Не принимает записи'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setFilter('today')} className="min-h-[64px] rounded-[10px] border border-[#DDE3EC] bg-[#F8FAFC] px-2 text-left">
              <p className="text-[20px] font-black leading-none text-[#111418]">{grouped.today.length}</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.06em] text-[#6B7280]">сегодня</p>
            </button>
            <button type="button" onClick={() => setFilter('upcoming')} className="min-h-[64px] rounded-[10px] border border-[#DDE3EC] bg-[#F8FAFC] px-2 text-left">
              <p className="text-[20px] font-black leading-none text-[#111418]">{grouped.upcoming.length}</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.06em] text-[#6B7280]">дальше</p>
            </button>
            <button type="button" onClick={() => setFilter('history')} className="min-h-[64px] rounded-[10px] border border-[#DDE3EC] bg-[#F8FAFC] px-2 text-left">
              <p className={`text-[20px] font-black leading-none ${grouped.unresolvedPast ? 'text-[#C6372E]' : 'text-[#111418]'}`}>{grouped.unresolvedPast}</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.06em] text-[#6B7280]">не закрыто</p>
            </button>
          </div>
        </section>

        {nextRow ? (
          <section className="mt-4 rounded-[14px] border border-[#C7D2FE] bg-[#EEF2FF] px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-[#1F3A8A] text-white">
                <Clock size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black uppercase tracking-[0.08em] text-[#1F3A8A]">Следующее действие</p>
                <p className="mt-1 text-[17px] font-black tracking-[-0.02em] text-[#111418]">
                  {nextRow.slot ? `${formatTimeRange(nextRow.slot)}, ${formatDateFull(nextRow.slot.date)}` : 'Уточнить время'}
                </p>
                <p className="mt-1 text-[14px] font-semibold leading-6 text-[#3F4854]">{nextRow.booking.studentName}, {branch?.address ?? 'адрес встречи не указан'}</p>
              </div>
            </div>
          </section>
        ) : null}

        {grouped.issues > 0 ? (
          <section className="mt-4 rounded-[12px] border border-[#F6D99D] bg-[#FFF8E6] px-4 py-3">
            <p className="text-[14px] font-black text-[#684500]">В расписании есть незаполненные поля</p>
            <p className="mt-1 text-[13px] font-semibold leading-5 text-[#7A5607]">Откройте занятие и проверьте, что именно мешает нормальному статусу: адрес, телефон, автомобиль или карточка ученика.</p>
          </section>
        ) : null}

        {notice ? (
          <section className="mt-4 rounded-[12px] border border-[#C7ECD7] bg-[#F0FDF4] px-4 py-3 text-[14px] font-black text-[#177245]">
            {notice}
          </section>
        ) : null}

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-black tracking-[-0.04em] text-[#111418]">
                {filter === 'today' ? 'Сегодняшний маршрут' : filter === 'upcoming' ? 'Ближайшие занятия' : 'История и отмены'}
              </h1>
              <p className="mt-1 text-[13px] font-bold text-[#6B7280]">{pluralize(visibleRows.length, 'запись', 'записи', 'записей')}</p>
            </div>
            <div className="inline-flex rounded-[10px] border border-[#DDE3EC] bg-white p-1">
              {[
                { id: 'today', label: 'День' },
                { id: 'upcoming', label: 'Дальше' },
                { id: 'history', label: 'Архив' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id as WorkdayFilter)}
                  className={`min-h-9 rounded-[8px] px-3 text-[12px] font-black ${filter === item.id ? 'bg-[#1F3A8A] text-white' : 'text-[#5F6875]'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <EmptyBlock title="В этом разделе пусто" text="Когда школа назначит занятия, они появятся здесь с адресом, учеником и рабочими действиями." />
          ) : (
            <div className="space-y-3">
              {visibleRows.map((row) => (
                <div key={row.booking.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === row.booking.id ? null : row.booking.id)}
                    className="mb-2 inline-flex min-h-10 items-center gap-2 rounded-[8px] px-1 text-[12px] font-black text-[#1F3A8A]"
                  >
                    <Calendar size={15} /> {expandedId === row.booking.id ? 'Свернуть детали' : 'Показать детали ученика'}
                  </button>
                  <WorkdayRow
                    row={row}
                    branch={branch}
                    instructor={instructor}
                    isExpanded={expandedId === row.booking.id}
                    actionMode={actionId === row.booking.id ? actionMode : null}
                    draftNote={actionId === row.booking.id ? draftNote : ''}
                    onOpenAction={(mode) => openAction(row.booking.id, mode)}
                    onDraftNote={setDraftNote}
                    onSubmitAction={handleSubmitAction}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
