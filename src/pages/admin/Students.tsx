import { Search, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { FormField } from '../../components/ui/FormField'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { formatPhone } from '../../lib/utils'
import { db } from '../../services/storage'
import { getStudentsBySchool, getStudentStats } from '../../services/studentService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'

type StudentFilter = 'all' | 'active' | 'inactive' | 'cancelled' | 'limit'

function selectClassName() {
  return 'h-11 w-full rounded-2xl border border-stone-200 bg-white px-3.5 text-[15px] text-stone-900 outline-none transition focus:border-forest-300 focus:ring-4 focus:ring-forest-100'
}

export function AdminStudents() {
  const school = db.schools.bySlug('virazh')
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
        return { student, stats }
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
      <div className="max-w-7xl p-6 md:p-8">
        <EmptyState title="Школа не найдена" description="Демо-данные не загружены." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <PageHeader
        eyebrow={school.name}
        title="Ученики"
        description="История записей, будущие занятия и базовый контроль лимитов по каждому ученику."
      />

      <div className="mt-8 space-y-6">
        <Section title="Поиск и фильтры" description="Ищите по имени, телефону или статусу активности.">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
            <FormField label="Поиск">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Имя или телефон"
                  className="h-11 w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-3.5 text-[15px] text-stone-900 outline-none transition focus:border-forest-300 focus:ring-4 focus:ring-forest-100"
                />
              </div>
            </FormField>
            <FormField label="Фильтр">
              <select value={filter} onChange={(event) => setFilter(event.target.value as StudentFilter)} className={selectClassName()}>
                <option value="all">Все ученики</option>
                <option value="active">Есть активные записи</option>
                <option value="inactive">Нет активных записей</option>
                <option value="cancelled">Есть отмены</option>
                <option value="limit">Достигнут лимит</option>
              </select>
            </FormField>
          </div>
        </Section>

        <Section title="Список учеников" description={`Найдено ${rows.length} учеников.`}>
          {rows.length === 0 ? (
            <EmptyState title="Ученики не найдены" description="Измените фильтры или создайте запись на публичной странице." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {rows.map(({ student, stats }) => (
                <Link
                  key={student.id}
                  to={`${ADMIN_BASE_PATH}/students/${student.id}`}
                  className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-500">
                        <UserRound size={18} />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-stone-900">{student.name}</p>
                        <p className="text-sm text-stone-500">{formatPhone(student.normalizedPhone)}</p>
                      </div>
                    </div>
                    {stats.limitReached ? <Badge variant="warning">Лимит достигнут</Badge> : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-stone-500">Всего записей</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">{stats.totalBookings}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-stone-500">Будущих активных</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">{stats.activeFutureBookings}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-stone-500">Последняя запись</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">
                        {stats.lastBooking ? new Date(stats.lastBooking.createdAt).toLocaleDateString('ru-RU') : 'Нет'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-stone-500">Ближайшая запись</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">
                        {stats.nextBooking ? stats.nextBooking.id : 'Нет'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
