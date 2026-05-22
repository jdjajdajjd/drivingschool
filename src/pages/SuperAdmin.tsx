import { useEffect, useMemo, useState } from 'react'
import { addDays, format, isAfter, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { WarningTriangle as AlertTriangle, Building as Building2, Calendar, GraphUp as BarChart3, CheckCircle, Phone, Puzzle, Refresh, Send } from '@/components/icons/lucide'
const CalendarDays = Calendar
const RefreshCw = Refresh
import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { StatCard } from '../components/ui/StatCard'
import { StateView } from '../components/ui/StateView'
import { DataRow } from '../components/ui/DataList'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { formatPrice } from '../lib/utils'
import { getBillingSummary } from '../services/modules'
import { resetProductData } from '../services/schoolService'
import { db } from '../services/storage'
import { validateDataIntegrity } from '../services/integrityService'
import { SUPERADMIN_BASE_PATH } from '../services/accessControl'
import { listSupabaseLeadRequests, updateSupabaseLeadStatus, type LeadRequest } from '../services/supabaseAdminService'

type LeadStatus = LeadRequest['status']

const leadStatusLabels: Record<LeadStatus, string> = {
  new: 'Новая',
  contacted: 'Связались',
  qualified: 'Целевая',
  won: 'Оплачивает',
  lost: 'Потеряна',
}

const leadStatusVariants: Record<LeadStatus, 'success' | 'warning' | 'error'> = {
  new: 'warning',
  contacted: 'warning',
  qualified: 'success',
  won: 'success',
  lost: 'error',
}

function leadStatusValue(status: LeadStatus): number {
  if (status === 'won') return 4990
  if (status === 'qualified') return 4990
  if (status === 'contacted') return 2500
  return status === 'new' ? 1200 : 0
}

export function SuperAdminOverview() {
  const schools = db.schools.all()
  const today = new Date()
  const sevenDaysAhead = addDays(today, 7)
  const [leads, setLeads] = useState<LeadRequest[]>([])
  const [leadError, setLeadError] = useState('')
  const [leadPendingId, setLeadPendingId] = useState('')

  useEffect(() => {
    let disposed = false
    listSupabaseLeadRequests()
      .then((items) => {
        if (!disposed) setLeads(items)
      })
      .catch((error) => {
        if (!disposed) setLeadError(error instanceof Error ? error.message : 'Не удалось загрузить заявки.')
      })

    return () => {
      disposed = true
    }
  }, [])

  async function patchLeadStatus(leadId: string, status: LeadStatus) {
    if (leadPendingId) return
    setLeadPendingId(leadId)
    setLeadError('')
    try {
      const updated = await updateSupabaseLeadStatus(leadId, status)
      if (updated) {
        setLeads((current) => current.map((lead) => lead.id === leadId ? updated : lead))
      }
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : 'Не удалось обновить заявку.')
    } finally {
      setLeadPendingId('')
    }
  }

  const metrics = schools.map((school) => {
    const billing = getBillingSummary(school.id)
    const todayBookings = db.bookings.bySchool(school.id).filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return slot ? isSameDay(new Date(`${slot.date}T${slot.time}:00`), today) : false
    }).length

    const noSlots = db.slots
      .bySchool(school.id)
      .filter((slot) => slot.status === 'available')
      .filter((slot) => {
        const startsAt = new Date(`${slot.date}T${slot.time}:00`)
        return isAfter(startsAt, today) && startsAt <= sevenDaysAhead
      }).length === 0

    const warnings = validateDataIntegrity(school.id)
    return {
      school,
      billing,
      todayBookings,
      noSlots,
      warnings,
      enabledModules: db.schoolModules.bySchool(school.id).filter((item) => item.status === 'enabled').length,
    }
  })

  const activeSchools = schools.filter((school) => school.isActive !== false)
  const todayBookingsTotal = metrics.reduce((sum, item) => sum + item.todayBookings, 0)
  const mrr = metrics
    .filter((item) => item.school.isActive !== false)
    .reduce((sum, item) => sum + item.billing.totalMonthlyPrice, 0)
  const enabledModulesTotal = metrics.reduce((sum, item) => sum + item.enabledModules, 0)
  const schoolsWithoutSlots = metrics.filter((item) => item.noSlots).length
  const schoolsWithWarnings = metrics.filter((item) => item.warnings.length > 0).length
  const freshLeads = leads.filter((lead) => lead.status === 'new' || lead.status === 'contacted')
  const pipelineValue = leads.reduce((sum, lead) => sum + leadStatusValue(lead.status), 0)
  const latestLeads = leads.slice(0, 8)

  const leadSla = useMemo(() => {
    const overdue = freshLeads.filter((lead) => Date.now() - new Date(lead.createdAt).getTime() > 2 * 60 * 60 * 1000).length
    if (freshLeads.length === 0) return { label: 'Лидов в работе нет', variant: 'success' as const }
    if (overdue > 0) return { label: `${overdue} без ответа дольше 2 часов`, variant: 'error' as const }
    return { label: 'Свежие заявки в норме', variant: 'success' as const }
  }, [freshLeads])

  return (
    <div className="max-w-7xl p-4 md:p-6">
      <PageHeader
        eyebrow="vroom"
        title="Панель оператора"
        description="Контроль заявок, школ, подключений, модулей и рабочих вопросов по клиентам."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              resetProductData()
              window.location.href = SUPERADMIN_BASE_PATH
            }}
          >
            <RefreshCw width={15} height={15} />
            Обновить данные
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Оценка MRR" value={formatPrice(mrr)} icon={<BarChart3 width={18} height={18} />} />
        <StatCard label="Воронка лидов" value={formatPrice(pipelineValue)} icon={<Send width={18} height={18} />} />
        <StatCard label="Новые заявки" value={freshLeads.length} icon={<Phone width={18} height={18} />} />
        <StatCard label="Активные школы" value={activeSchools.length} icon={<Building2 width={18} height={18} />} />
        <StatCard label="Записи сегодня" value={todayBookingsTotal} icon={<CalendarDays width={18} height={18} />} />
        <StatCard label="Подключённые модули" value={enabledModulesTotal} icon={<Puzzle width={18} height={18} />} />
        <StatCard label="Школы без времени на 7 дней" value={schoolsWithoutSlots} icon={<AlertTriangle width={18} height={18} />} />
        <StatCard label="Школы с предупреждениями" value={schoolsWithWarnings} icon={<AlertTriangle width={18} height={18} />} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
        <Section title="Заявки с лендинга" description="Здесь собраны заявки с сайта и текущий статус обработки.">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant={leadSla.variant}>{leadSla.label}</Badge>
            <Badge variant="success">Потенциал {formatPrice(pipelineValue)}/мес</Badge>
            {leadError ? <Badge variant="error">{leadError}</Badge> : null}
          </div>
          {latestLeads.length === 0 ? (
            <StateView title="Заявок пока нет" description="После отправки формы на лендинге заявки появятся здесь и в Telegram." />
          ) : (
            <div className="space-y-3">
              {latestLeads.map((lead) => (
                <DataRow key={lead.id} className="p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold text-[#111418]">{lead.schoolName}</p>
                        <Badge variant={leadStatusVariants[lead.status]}>{leadStatusLabels[lead.status]}</Badge>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#66717D]">{lead.name} · {lead.phone}{lead.city ? ` · ${lead.city}` : ''}</p>
                      {lead.comment ? <p className="mt-2 text-sm font-semibold leading-5 text-[#38424D]">{lead.comment}</p> : null}
                      <p className="mt-2 text-xs font-bold text-[#8D98A4]">{format(new Date(lead.createdAt), 'd MMMM, HH:mm', { locale: ru })}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[330px]">
                      <Button variant="secondary" size="sm" disabled={leadPendingId === lead.id} onClick={() => void patchLeadStatus(lead.id, 'contacted')}>Связались</Button>
                      <Button variant="secondary" size="sm" disabled={leadPendingId === lead.id} onClick={() => void patchLeadStatus(lead.id, 'qualified')}>Целевая</Button>
                      <Button size="sm" disabled={leadPendingId === lead.id} onClick={() => void patchLeadStatus(lead.id, 'won')}>
                        <CheckCircle width={14} height={14} />
                        В оплату
                      </Button>
                    </div>
                  </div>
                </DataRow>
              ))}
            </div>
          )}
        </Section>

        <Section title="Что требует внимания" description="В приоритете школы без свободного времени и школы с предупреждениями по настройкам.">
          {metrics.length === 0 ? (
            <StateView title="Автошкол пока нет" description="Создайте первую автошколу в разделе школ." />
          ) : (
            <div className="space-y-3">
              {metrics.map((item) => (
                <DataRow key={item.school.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#111418]">{item.school.name}</p>
                      <p className="mt-1 text-sm text-[#6F747A]">
                        /{item.school.slug} · {formatPrice(item.billing.totalMonthlyPrice)}/мес · модулей: {item.enabledModules}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.noSlots ? <Badge variant="warning">Добавить расписание</Badge> : null}
                      {item.warnings.length > 0 ? <Badge variant="error">Проверить настройки: {item.warnings.length}</Badge> : null}
                      {!item.noSlots && item.warnings.length === 0 ? <Badge variant="success">Стабильно</Badge> : null}
                    </div>
                  </div>
                </DataRow>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
