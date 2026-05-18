import { useEffect, useState } from 'react'
import { LinkSquare02Icon, Settings02Icon, Delete02Icon } from '@hugeicons/core-free-icons'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { createHugeIcon } from '../../components/ui/HugeIcon'
import { StateView } from '../../components/ui/StateView'
import { DataRow } from '../../components/ui/DataList'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { Badge } from '../../components/ui/Badge'
import { useToast } from '../../components/ui/Toast'
import { formatPrice } from '../../lib/utils'
import { deleteSchoolLocalCascade, getSchoolOverview, getSchools } from '../../services/schoolService'
import { deleteSupabaseSchool, listSupabaseSchools } from '../../services/supabaseAdminService'
import { db } from '../../services/storage'
import type { School } from '../../types'

const ExternalLink = createHugeIcon(LinkSquare02Icon)
const Settings2 = createHugeIcon(Settings02Icon)
const Trash = createHugeIcon(Delete02Icon)
import { SUPERADMIN_BASE_PATH, WORKSPACE_ADMIN_LOGIN_PATH } from '../../services/accessControl'

type LaunchStep = { label: string; done: boolean }

function getLaunchSteps(item: NonNullable<ReturnType<typeof getSchoolOverview>>): LaunchStep[] {
  return [
    { label: 'Активна', done: item.school.isActive !== false },
    { label: 'Филиал', done: item.branchCount > 0 },
    { label: 'Инструктор', done: item.instructorCount > 0 },
    { label: 'Окна', done: item.freeSlots7Days > 0 },
    { label: 'Ученики', done: item.studentCount > 0 },
    { label: 'Данные', done: item.integrityWarnings === 0 },
  ]
}

function getLaunchStatus(item: NonNullable<ReturnType<typeof getSchoolOverview>>): { done: number; total: number; label: string; variant: 'success' | 'warning' | 'error' } {
  const steps = getLaunchSteps(item)
  const done = steps.filter((step) => step.done).length
  const total = steps.length
  if (item.school.isActive === false) return { done, total, label: 'Отключена', variant: 'error' }
  if (done === total) return { done, total, label: 'Готова', variant: 'success' }
  return { done, total, label: 'Настроить', variant: 'warning' }
}

export function SuperAdminSchools() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [, setRefreshVersion] = useState(0)
  const rows = getSchools()
    .map((school) => getSchoolOverview(school.id))
    .filter((item): item is NonNullable<ReturnType<typeof getSchoolOverview>> => Boolean(item))

  async function confirmDeleteSchool(): Promise<void> {
    if (!deleteTarget || deletePending) return
    if (deleteTarget.slug === 'virazh' || deleteTarget.id === 'school-virazh') {
      showToast('Вираж нельзя удалить.', 'error')
      setDeleteTarget(null)
      return
    }

    try {
      setDeletePending(true)
      await deleteSupabaseSchool(deleteTarget.id)
      const result = deleteSchoolLocalCascade(deleteTarget.id)
      if (!result.ok) throw new Error(result.error)
      showToast('Автошкола удалена.', 'success')
      setDeleteTarget(null)
      setRefreshVersion((value) => value + 1)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось удалить автошколу.', 'error')
    } finally {
      setDeletePending(false)
    }
  }

  useEffect(() => {
    let disposed = false
    listSupabaseSchools()
      .then((schools) => {
        if (disposed || schools.length === 0) return
        const remoteIds = new Set(schools.map((school) => school.id))
        db.schools.all().forEach((school) => {
          if (!remoteIds.has(school.id)) deleteSchoolLocalCascade(school.id)
        })
        schools.forEach((school) => db.schools.upsert(school))
        setRefreshVersion((value) => value + 1)
      })
      .catch(() => undefined)

    return () => {
      disposed = true
    }
  }, [])

  return (
    <div className="max-w-7xl p-4 md:p-6">
      <PageHeader
        eyebrow="Платформа"
        title="Автошколы"
        description="Список автошкол: статус, ссылки, активность, модули и текущая стоимость."
        actions={<Button onClick={() => navigate(`${SUPERADMIN_BASE_PATH}/schools/new`)}>Создать автошколу</Button>}
      />

      <div className="mt-6">
        <Section title="Автошколы" description={`Найдено ${rows.length}.`}>
          {rows.length === 0 ? (
            <StateView title="Автошкол пока нет" description="Создайте первую школу, чтобы увидеть её в каталоге." action={<Button onClick={() => navigate(`${SUPERADMIN_BASE_PATH}/schools/new`)}>Создать автошколу</Button>} />
          ) : (
            <div className="space-y-3">
              {rows.map((item) => (
                <DataRow key={item.school.id} className="p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                      <div>
                        <p className="caption">Школа</p>
                        <p className="mt-1 text-base font-bold #111418">{item.school.name}</p>
                        <p className="text-sm #9EA3A8">/{item.school.slug}</p>
                      </div>
                      <div>
                        <p className="caption">Запуск</p>
                        {(() => {
                          const status = getLaunchStatus(item)
                          return <div className="mt-1 flex flex-wrap items-center gap-2"><Badge variant={status.variant}>{status.label}</Badge><span className="text-[12px] font-black text-[#66717D]">{status.done}/{status.total}</span></div>
                        })()}
                      </div>
                      <div>
                        <p className="caption">Ученики / записи</p>
                        <p className="mt-1 text-sm font-bold #111418">{item.studentCount} / {item.activeBookingsCount}</p>
                      </div>
                      <div>
                        <p className="caption">30 дней / время на 7 дней</p>
                        <p className="mt-1 text-sm font-bold #111418">{item.bookingsLast30Days} / {item.freeSlots7Days}</p>
                      </div>
                      <div>
                        <p className="caption">Модули / MRR</p>
                        <p className="mt-1 text-sm font-bold #111418">{item.enabledModulesCount} / {formatPrice(item.billing.totalMonthlyPrice)}</p>
                      </div>
                      <div>
                        <p className="caption">Что осталось</p>
                        <p className="mt-1 text-sm font-bold text-[#111418]">
                          {getLaunchSteps(item).find((step) => !step.done)?.label ?? 'Готово'}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[460px] xl:grid-cols-4">
                      <Button variant="secondary" size="sm" onClick={() => window.open(`/school/${item.school.slug}`, '_blank')}>
                        <ExternalLink size={14} />
                        Страница
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => window.open(WORKSPACE_ADMIN_LOGIN_PATH, '_blank')}>
                        <ExternalLink size={14} />
                        Вход админа
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => navigate(`${SUPERADMIN_BASE_PATH}/schools/${item.school.id}`)}>
                        <Settings2 size={14} />
                        Открыть
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={item.school.slug === 'virazh' || item.school.id === 'school-virazh'}
                        onClick={() => setDeleteTarget(item.school)}
                      >
                        <Trash size={14} />
                        Удалить
                      </Button>
                    </div>
                  </div>
                </DataRow>
              ))}
            </div>
          )}
        </Section>
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Удалить автошколу"
        description={deleteTarget ? `Удалить ${deleteTarget.name}? Вместе с ней удалятся филиалы, инструкторы, ученики, записи и доступы.` : ''}
        confirmLabel={deletePending ? 'Удаляем...' : 'Удалить'}
        cancelLabel="Отмена"
        danger
        onConfirm={confirmDeleteSchool}
        onClose={() => { if (!deletePending) setDeleteTarget(null) }}
      />
    </div>
  )
}
