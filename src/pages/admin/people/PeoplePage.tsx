import { isAfter } from 'date-fns'
import { useMemo, useState } from 'react'
import { StatusPill } from '../../../components/admin/core/StatusPill'
import { BottomSheet } from '../../../components/admin/core/BottomSheet'
import { formatPhone, formatInstructorName } from '../../../lib/utils'
import { formatHumanDate, formatTimeRange } from '../../../utils/date'
import { getStudentsBySchool, getStudentStats, getStudentHistory } from '../../../services/studentService'
import { getInstructorsBySchool } from '../../../services/instructorService'
import { getBookingsByInstructor, getSlotDateTime } from '../../../services/bookingService'
import { db } from '../../../services/storage'
import { trainingStageLabels } from '../../student/studentUtils'

/* ─── STUDENTS ─── */
function StudentsTab() {
  const school = db.schools.currentAdmin() ?? null
  const [query, setQuery] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)

  const rows = useMemo(() => {
    if (!school) return []
    const q = query.trim().toLowerCase()
    return getStudentsBySchool(school.id)
      .map((s) => ({ student: s, stats: getStudentStats(s.id) }))
      .filter(({ student }) => {
        if (q && !student.name.toLowerCase().includes(q) && !student.normalizedPhone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))) return false
        return true
      })
  }, [school, query])

  const detailStudent = detailId ? rows.find((r) => r.student.id === detailId)?.student ?? null : null
  const detailStats = detailId ? rows.find((r) => r.student.id === detailId)?.stats ?? null : null
  const detailBookings = detailId ? getStudentHistory(detailId) : []

  const nextSlot = detailId ? detailBookings.find((e) => e.booking.status === 'active' && e.slot && isAfter(getSlotDateTime(e.slot), new Date()))?.slot ?? null : null

  return (
    <div>
      {/* Search */}
      <div className="sticky top-0 z-10 border-b border-border bg-surface px-3 py-2.5">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9EA3A8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Имя или телефон…"
            className="min-h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[14px] font-semibold text-ink outline-none placeholder:text-[#9EA3A8] focus:border-[#9EA3A8]"
          />
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[13px] font-bold text-[#9EA3A8]">Ученики не найдены</p>
          </div>
        ) : (
          rows.map(({ student, stats }) => {
            const next = student.trainingStage ? trainingStageLabels[student.trainingStage] : null
            return (
              <button
                key={student.id}
                onClick={() => setDetailId(student.id)}
                className="flex w-full items-center justify-between gap-3 bg-surface px-3 py-2.5 text-left transition active:bg-[#F7F8F9]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-black text-ink">{student.name}</span>
                    {stats.limitReached && <StatusPill label="Лимит" status="warning" size="sm" />}
                  </div>
                  <p className="mt-0.5 text-[12px] font-semibold text-[#9EA3A8]">
                    {formatPhone(student.normalizedPhone)}
                    {next ? ` · ${next}` : ''}
                    {student.categoryCodes?.length ? ` · ${student.categoryCodes.join(', ')}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-black text-ink">
                    {stats.completedBookings}/{stats.totalBookings}
                  </p>
                  <p className="text-[11px] font-semibold text-[#9EA3A8]">занятий</p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Detail BottomSheet */}
      <BottomSheet
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={detailStudent?.name ?? 'Ученик'}
      >
        {detailStudent && detailStats && (
          <div className="space-y-4">
            {/* Contacts */}
            <div className="rounded-lg border border-border bg-surface-soft p-3">
              <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#9EA3A8]">Контакты</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#6F747A]">Телефон</span>
                  <a href={`tel:${detailStudent.phone}`} className="text-[13px] font-black text-info">{formatPhone(detailStudent.normalizedPhone)}</a>
                </div>
                {detailStudent.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#6F747A]">Email</span>
                    <span className="text-[13px] font-semibold text-ink">{detailStudent.email}</span>
                  </div>
                )}
                {detailStudent.categoryCodes?.length ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#6F747A]">Категории</span>
                    <span className="text-[13px] font-black text-ink">{detailStudent.categoryCodes.join(', ')}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Progress */}
            <div className="rounded-lg border border-border bg-surface-soft p-3">
              <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#9EA3A8]">Прогресс</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[22px] font-black text-ink">{detailStats.totalBookings}</p>
                  <p className="text-[10px] font-semibold text-[#9EA3A8]">Всего</p>
                </div>
                <div className="text-center">
                  <p className="text-[22px] font-black text-success">{detailStats.completedBookings}</p>
                  <p className="text-[10px] font-semibold text-[#9EA3A8]">Проведено</p>
                </div>
                <div className="text-center">
                  <p className="text-[22px] font-black text-warning">{detailStats.cancelledBookings}</p>
                  <p className="text-[10px] font-semibold text-[#9EA3A8]">Отменено</p>
                </div>
              </div>
            </div>

            {/* Next lesson */}
            {nextSlot ? (
              <div className="rounded-lg border border-success/20 bg-success-soft p-3">
                <p className="mb-1 text-[11px] font-black uppercase tracking-wide text-success">Следующее занятие</p>
                <p className="text-[14px] font-black text-ink">{formatHumanDate(nextSlot.date, false)} · {formatTimeRange(nextSlot)}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-surface-soft p-3">
                <p className="text-[13px] font-semibold text-[#9EA3A8]">Нет будущих записей</p>
              </div>
            )}

            {/* History */}
            {detailBookings.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#9EA3A8]">История</p>
                <div className="max-h-[200px] space-y-1.5 overflow-y-auto">
                  {detailBookings.slice(0, 10).map((e) => {
                    const s = e.booking.status
                    const st = s === 'active' ? 'success' : s === 'completed' ? 'neutral' : 'error'
                    return (
                      <div key={e.booking.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-soft px-3 py-2">
                        <div>
                          <p className="text-[12px] font-black text-ink">
                            {e.slot ? `${formatHumanDate(e.slot.date, false)} · ${formatTimeRange(e.slot)}` : '—'}
                          </p>
                          <p className="text-[11px] font-semibold text-[#9EA3A8]">
                            {e.instructor ? formatInstructorName(e.instructor.name) : '—'}
                          </p>
                        </div>
                        <StatusPill
                          label={s === 'active' ? 'Активна' : s === 'completed' ? 'Проведена' : 'Отменена'}
                          status={st as 'success' | 'neutral' | 'error'}
                          size="sm"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

/* ─── INSTRUCTORS ─── */
function InstructorsTab() {
  const school = db.schools.currentAdmin() ?? null
  const [query, setQuery] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)

  const rows = useMemo(() => {
    if (!school) return []
    const q = query.trim().toLowerCase()
    return getInstructorsBySchool(school.id)
      .filter((i) => {
        if (q && !i.name.toLowerCase().includes(q)) return false
        return true
      })
      .map((i) => {
        const bookings = getBookingsByInstructor(i.id)
        const today = bookings.filter((e) => {
          const s = e.slot
          return s && e.booking.status !== 'cancelled' &&
            new Date(`${s.date}T${s.time}`).toDateString() === new Date().toDateString()
        })
        const totalSlots = db.slots.byInstructor(i.id).filter((s) => {
          const d = new Date(`${s.date}T${s.time}`)
          return d.toDateString() === new Date().toDateString()
        }).length
        const load = totalSlots > 0 ? Math.round((totalSlots - today.filter((e) => e.booking.status === 'active' && !e.slot?.bookingId).length) / totalSlots * 100) : 0
        return { instructor: i, todayCount: today.length, freeWindows: Math.max(0, totalSlots - today.length), load }
      })
  }, [school, query])

  const detailInstructor = detailId ? rows.find((r) => r.instructor.id === detailId)?.instructor ?? null : null
  const detailBookings = detailId ? getBookingsByInstructor(detailId).filter((e) => e.booking.status !== 'cancelled') : []
  const detailToday = detailBookings.filter((e) => {
    const s = e.slot
    return s && new Date(`${s.date}T${s.time}`).toDateString() === new Date().toDateString()
  })
  const totalSlots = detailId ? db.slots.byInstructor(detailId).filter((s) => {
    const d = new Date(`${s.date}T${s.time}`)
    return d.toDateString() === new Date().toDateString()
  }).length : 0

  return (
    <div>
      {/* Search */}
      <div className="sticky top-0 z-10 border-b border-border bg-surface px-3 py-2.5">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9EA3A8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск инструктора…"
            className="min-h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[14px] font-semibold text-ink outline-none placeholder:text-[#9EA3A8] focus:border-[#9EA3A8]"
          />
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[13px] font-bold text-[#9EA3A8]">Инструкторы не найдены</p>
          </div>
        ) : (
          rows.map(({ instructor, todayCount, freeWindows, load }) => (
            <button
              key={instructor.id}
              onClick={() => setDetailId(instructor.id)}
              className="flex w-full items-center justify-between gap-3 bg-surface px-3 py-2.5 text-left transition active:bg-[#F7F8F9]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-black text-ink">{instructor.name}</span>
                  {!instructor.isActive && <StatusPill label="Неактивен" status="error" size="sm" />}
                </div>
                <p className="mt-0.5 text-[12px] font-semibold text-[#9EA3A8]">
                  {instructor.categories?.join(', ') ?? 'B'}
                  {instructor.car ? ` · ${instructor.car}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-black text-ink">{todayCount} сегодня</p>
                <p className="text-[11px] font-semibold text-[#9EA3A8]">
                  {freeWindows} окон · {load}% нагрузка
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Detail BottomSheet */}
      <BottomSheet
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={detailInstructor?.name ?? 'Инструктор'}
      >
        {detailInstructor && (
          <div className="space-y-4">
            {/* Info */}
            <div className="rounded-lg border border-border bg-surface-soft p-3">
              <div className="space-y-1.5">
                {detailInstructor.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#6F747A]">Телефон</span>
                    <a href={`tel:${detailInstructor.phone}`} className="text-[13px] font-black text-info">{formatPhone(detailInstructor.phone)}</a>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#6F747A]">Категории</span>
                  <span className="text-[13px] font-black text-ink">{detailInstructor.categories?.join(', ') ?? 'B'}</span>
                </div>
                {detailInstructor.car && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#6F747A]">Автомобиль</span>
                    <span className="text-[13px] font-semibold text-ink">{detailInstructor.car}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#6F747A]">Статус</span>
                  <StatusPill label={detailInstructor.isActive ? 'Активен' : 'Неактивен'} status={detailInstructor.isActive ? 'success' : 'error'} size="sm" />
                </div>
              </div>
            </div>

            {/* Today */}
            <div className="rounded-lg border border-border bg-surface-soft p-3">
              <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#9EA3A8]">Сегодня</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[22px] font-black text-ink">{totalSlots}</p>
                  <p className="text-[10px] font-semibold text-[#9EA3A8]">Всего окон</p>
                </div>
                <div className="text-center">
                  <p className="text-[22px] font-black text-success">{detailToday.length}</p>
                  <p className="text-[10px] font-semibold text-[#9EA3A8]">Занятий</p>
                </div>
                <div className="text-center">
                  <p className="text-[22px] font-black text-warning">{Math.max(0, totalSlots - detailToday.length)}</p>
                  <p className="text-[10px] font-semibold text-[#9EA3A8]">Свободно</p>
                </div>
              </div>
            </div>

            {/* Schedule today */}
            {detailToday.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#9EA3A8]">Расписание</p>
                <div className="max-h-[180px] space-y-1.5 overflow-y-auto">
                  {detailToday.map((e) => (
                    <div key={e.booking.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-soft px-3 py-2">
                      <div>
                        <p className="text-[12px] font-black text-ink">{e.slot ? formatTimeRange(e.slot) : '—'}</p>
                        <p className="text-[11px] font-semibold text-[#9EA3A8]">{e.booking.studentName}</p>
                      </div>
                      <StatusPill label="Активна" status="success" size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

/* ─── PEOPLE PAGE ─── */
type PersonTab = 'students' | 'instructors'

export default function PeoplePage() {
  const [tab, setTab] = useState<PersonTab>('students')

  return (
    <div className="min-h-dvh bg-bg pb-20">
      <div className="sticky top-0 z-20 border-b border-border bg-surface px-3 pt-3">
        <h1 className="text-[20px] font-black tracking-[-0.03em] text-ink">Люди</h1>
        <div className="-mx-3 mt-3 flex border-b border-border">
          {([
            ['students', 'Ученики'],
            ['instructors', 'Инструкторы'],
          ] as [PersonTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 border-b-2 px-3 pb-2.5 text-[13px] font-black transition-colors ${
                tab === key ? 'border-ink text-ink' : 'border-transparent text-[#9EA3A8]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'students' ? <StudentsTab /> : <InstructorsTab />}
    </div>
  )
}
