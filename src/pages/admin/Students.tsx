import { Add01Icon, Search01Icon, User03Icon } from '@hugeicons/core-free-icons'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { createHugeIcon } from '../../components/ui/HugeIcon'
import { StateView } from '../../components/ui/StateView'
import { DataRow } from '../../components/ui/DataList'
import { FilterBar, SmallEmptyState, compactFieldClassName } from '../../components/ui/CompactAdmin'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { formatPhone } from '../../lib/utils'

const Plus = createHugeIcon(Add01Icon)
const Search = createHugeIcon(Search01Icon)
const UserRound = createHugeIcon(User03Icon)
import { formatHumanDate, formatTimeRange } from '../../utils/date'
import { db } from '../../services/storage'
import { getStudentsBySchool, getStudentStats } from '../../services/studentService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'

type StudentFilter = 'all' | 'active' | 'inactive' | 'cancelled' | 'limit'

function selectClassName() {
  return compactFieldClassName()
}

export function AdminStudents() {
  const school = db.schools.all()[0] ?? null
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StudentFilter>('all')

  const rows = useMemo(() => {
    if (!school) {
      return []
    }

    const search = query.trim().toLowerCase()
    return getStudentsBySchool(school.id)
      .map((student) => {
        const stats = getStudentStats(student.id)
        const nextSlot = stats.nextBooking ? db.slots.byId(stats.nextBooking.slotId) : null
        return { student, stats, nextSlot }
      })
      .filter(({ student, stats }) => {
        const matchesSearch =
          !search ||
          student.name.toLowerCase().includes(search) ||
          student.normalizedPhone.includes(search.replace(/\D/g, ''))

        const matchesFilter = (() => {
          if (filter === 'all') return true
          if (filter === 'active') return stats.activeFutureBookings > 0
          if (filter === 'inactive') return stats.activeFutureBookings === 0
          if (filter === 'cancelled') return stats.cancelledBookings > 0
          if (filter === 'limit') return stats.limitReached
          return true
        })()

        return matchesSearch && matchesFilter
      })
  }, [school, query, filter])

  if (!school) {
    return (
      <div className="max-w-7xl bg-[#E9EEF7] p-2.5 md:p-5">
        <StateView kind="error" title="Школа не найдена" description="Данные школы не загружены." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl bg-[#E9EEF7] p-2.5 md:p-5">
      <PageHeader
        eyebrow={school.name}
        title="Ученики"
        description="Поиск, записи и лимиты учеников."
        actions={<Button size="sm" variant="secondary"><Plus size={15} />Пригласить</Button>}
      />

      <div className="mt-3 space-y-3">
        <FilterBar>
          <div className="relative col-span-3 md:col-span-4">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя или телефон" className={compactFieldClassName('pl-9')} />
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value as StudentFilter)} className={selectClassName()}>
            <option value="all">Все</option>
            <option value="active">С записью</option>
            <option value="inactive">Без записи</option>
            <option value="cancelled">Есть отмены</option>
            <option value="limit">Лимит</option>
          </select>
        </FilterBar>

        <Section title="Список учеников" description={`Найдено ${rows.length} учеников.`}>
          {rows.length === 0 ? (
            <SmallEmptyState title="Ученики не найдены" description="Измените фильтры или дождитесь первой записи ученика." />
          ) : (
            <div className="grid gap-2">
              {rows.map(({ student, stats, nextSlot }) => (
                <Link
                  key={student.id}
                  to={`${ADMIN_BASE_PATH}/students/${student.id}`}
                  className="block"
                >
                  <DataRow>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#EEF2FF] text-[#2436D9]">
                          <UserRound size={18} />
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-[#111827]">{student.name}</p>
                          <p className="text-sm font-medium text-[text-[#4B5A70]]">{formatPhone(student.normalizedPhone)}</p>
                        </div>
                      </div>
                      {stats.limitReached ? <Badge variant="warning">Лимит достигнут</Badge> : <Badge variant={stats.activeFutureBookings > 0 ? 'success' : 'muted'}>{stats.activeFutureBookings > 0 ? 'Есть запись' : 'Без активных'}</Badge>}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                      <div>
                        <p className="text-xs font-bold text-[#667085]">Всего записей</p>
                        <p className="mt-1 text-sm font-bold text-[text-[#111827]]">{stats.totalBookings}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#667085]">Будущих активных</p>
                        <p className="mt-1 text-sm font-bold text-[text-[#111827]]">{stats.activeFutureBookings}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#667085]">Последняя запись</p>
                        <p className="mt-1 text-sm font-bold text-[text-[#111827]]">
                          {stats.lastBooking ? new Date(stats.lastBooking.createdAt).toLocaleDateString('ru-RU') : 'Нет'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#667085]">Ближайшая запись</p>
                        <p className="mt-1 text-sm font-bold text-[text-[#111827]]">
                          {nextSlot ? `${formatHumanDate(nextSlot.date, false)} · ${formatTimeRange(nextSlot)}` : 'Нет'}
                        </p>
                      </div>
                    </div>
                  </DataRow>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
