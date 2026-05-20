import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Copy, OpenNewWindow as ExternalLink, Key, MessageText, EditPencil, FloppyDiskArrowIn, Xmark } from 'iconoir-react'
const KeyRound = Key
const MessageSquareText = MessageText
const Pencil = EditPencil
const Save = FloppyDiskArrowIn
const X = Xmark
import { Button } from '../../components/ui/Button'
import { StateView } from '../../components/ui/StateView'
import { DataRow } from '../../components/ui/DataList'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { useToast } from '../../components/ui/Toast'
import { formatInstructorName, formatPrice } from '../../lib/utils'
import { getEnabledModules } from '../../services/modules'
import { getSchoolOverview } from '../../services/schoolService'
import { db } from '../../services/storage'
import { SUPERADMIN_BASE_PATH } from '../../services/accessControl'
import { closeSupabaseStaffSession, openSupabaseStaffSession, upsertSupabaseSchoolStaffCredential } from '../../services/staffSessionService'
import { createSupabaseSchool, updateSupabaseSchoolAccess, updateSupabaseSchoolSales } from '../../services/supabaseAdminService'
import type { SchoolPaymentHistoryItem } from '../../types'

type LaunchStep = {
  label: string
  done: boolean
  href?: string
}

function generateStaffPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

function absolutePath(path: string): string {
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

function AccessValueRow({
  label,
  value,
  actionLabel,
  icon,
  onAction,
  disabled = false,
}: {
  label: string
  value: string
  actionLabel: string
  icon: ReactNode
  onAction: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-[#DCE2E8] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#66717D]">{label}</p>
        <p className="mt-1 break-all text-[14px] font-black leading-5 text-[#111418]">{value}</p>
      </div>
      <button
        type="button"
        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-[9px] border border-[#C9D2DC] bg-[#F8FAFC] px-3 text-[13px] font-black text-[#38424D] hover:border-[#9AA7B5] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onAction}
        disabled={disabled}
      >
        {icon}
        {actionLabel}
      </button>
    </div>
  )
}

type CreatedAccessState = {
  createdAccess?: {
    login?: string
    password?: string
  }
}

type SalesState = {
  status: 'lead' | 'thinking' | 'paid' | 'onboarding' | 'active' | 'risk' | 'rejected'
  city: string
  directorName: string
  directorPhone: string
  nextContact: string
  note: string
  promised: string
  neededFromClient: string
  owner: string
}

type AccessState = {
  status: 'trial' | 'active' | 'expires_soon' | 'overdue' | 'blocked'
  paidUntil: string
  lastPaidAt: string
  amount: string
  note: string
}

const SALES_STATUS_LABELS: Record<SalesState['status'], string> = {
  lead: 'Лид',
  thinking: 'Думает',
  paid: 'Оплатил',
  onboarding: 'Подключаем',
  active: 'Активен',
  risk: 'Риск',
  rejected: 'Отказ',
}

const ACCESS_STATUS_LABELS: Record<AccessState['status'], string> = {
  trial: 'Пробный доступ',
  active: 'Активна',
  expires_soon: 'Скоро продлевать',
  overdue: 'Просрочена',
  blocked: 'Заблокирована',
}

function addMonthsToDate(date: Date, months: number): string {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next.toISOString().slice(0, 10)
}

function readSalesState(schoolId: string | undefined): SalesState {
  const fallback: SalesState = { status: 'lead', city: '', directorName: '', directorPhone: '', nextContact: '', note: '', promised: '', neededFromClient: '', owner: '' }
  const school = schoolId ? db.schools.byId(schoolId) : null
  const schoolState: SalesState = {
    status: school?.salesStatus ?? fallback.status,
    city: school?.city ?? fallback.city,
    directorName: school?.directorName ?? fallback.directorName,
    directorPhone: school?.directorPhone ?? fallback.directorPhone,
    nextContact: school?.salesNextContact ?? fallback.nextContact,
    note: school?.salesNote ?? fallback.note,
    promised: school?.salesPromised ?? fallback.promised,
    neededFromClient: school?.salesNeededFromClient ?? fallback.neededFromClient,
    owner: school?.salesOwner ?? fallback.owner,
  }
  if (!schoolId || typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(`vroom:sales-state:${schoolId}`)
    return raw ? { ...schoolState, ...JSON.parse(raw) as Partial<SalesState> } : schoolState
  } catch {
    return schoolState
  }
}

function saveSalesState(schoolId: string, state: SalesState): void {
  const school = db.schools.byId(schoolId)
  if (school) {
    db.schools.upsert({
      ...school,
      city: state.city.trim() || undefined,
      directorName: state.directorName.trim() || undefined,
      directorPhone: state.directorPhone.trim() || undefined,
      salesStatus: state.status,
      salesNextContact: state.nextContact || undefined,
      salesNote: state.note.trim() || undefined,
      salesPromised: state.promised.trim() || undefined,
      salesNeededFromClient: state.neededFromClient.trim() || undefined,
      salesOwner: state.owner.trim() || undefined,
    })
  }
  localStorage.setItem(`vroom:sales-state:${schoolId}`, JSON.stringify(state))
}

function readAccessState(schoolId: string | undefined): AccessState {
  const school = schoolId ? db.schools.byId(schoolId) : null
  return {
    status: school?.accessStatus ?? (school?.isActive === false ? 'blocked' : 'trial'),
    paidUntil: school?.accessPaidUntil ?? '',
    lastPaidAt: school?.accessLastPaidAt ?? '',
    amount: school?.accessLastAmount ? String(school.accessLastAmount) : '4990',
    note: school?.accessPaymentNote ?? '',
  }
}

function getAccessVariant(status: AccessState['status']): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'active') return 'success'
  if (status === 'blocked' || status === 'overdue') return 'error'
  if (status === 'expires_soon') return 'warning'
  return 'default'
}

function readCreatedAccess(schoolId: string | undefined): { login: string; password: string } | null {
  if (!schoolId || typeof window === 'undefined') return null
  try {
    const state = window.history.state?.usr as CreatedAccessState | undefined
    const fromState = state?.createdAccess
    if (fromState?.login && fromState.password) return { login: fromState.login, password: fromState.password }

    const raw = sessionStorage.getItem(`dd:superadmin:created_access:${schoolId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CreatedAccessState['createdAccess']
    return parsed?.login && parsed.password ? { login: parsed.login, password: parsed.password } : null
  } catch {
    return null
  }
}

function launchStepClass(done: boolean): string {
  return done ? 'border-[#B9E8C9] bg-[#F0FAF3] text-[#188447]' : 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]'
}

export function SuperAdminSchoolDetail() {
  const { schoolId } = useParams<{ schoolId: string }>()
  useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const overview = schoolId ? getSchoolOverview(schoolId) : null
  const initialCreatedAccess = readCreatedAccess(schoolId)
  const [accessForm, setAccessForm] = useState({
    login: initialCreatedAccess?.login ?? '',
    password: initialCreatedAccess?.password ?? '',
    staffName: '',
  })
  const [accessPending, setAccessPending] = useState(false)
  const [accessEditing, setAccessEditing] = useState(false)
  const [verifiedAccessLogin, setVerifiedAccessLogin] = useState(initialCreatedAccess?.login ?? '')
  const [salesState, setSalesState] = useState<SalesState>(() => readSalesState(schoolId))
  const [paymentState, setPaymentState] = useState<AccessState>(() => readAccessState(schoolId))

  const collections = useMemo(() => {
    if (!schoolId) return null

    return {
      branches: db.branches.bySchool(schoolId),
      instructors: db.instructors.bySchool(schoolId),
      enabledModules: getEnabledModules(schoolId),
    }
  }, [schoolId])

  useEffect(() => {
    if (!overview) return
    setAccessForm((current) => ({
      ...current,
      login: current.login || initialCreatedAccess?.login || `${overview.school.slug}-admin`,
      password: current.password || initialCreatedAccess?.password || '',
      staffName: current.staffName || overview.school.name,
    }))
  }, [overview?.school.id])

  if (!overview || !collections) {
    return (
      <div className="max-w-6xl p-6 md:p-8">
        <StateView
          kind="error"
          title="Школа не найдена"
          description="Проверьте ссылку или вернитесь в список автошкол."
          action={<Button onClick={() => navigate(`${SUPERADMIN_BASE_PATH}/schools`)}>К списку школ</Button>}
        />
      </div>
    )
  }

  const school = overview.school
  const accessLogin = accessForm.login.trim() || `${school.slug}-admin`
  const accessPassword = accessForm.password.trim()
  const hasSavedPassword = Boolean(verifiedAccessLogin && accessPassword)
  const adminLoginPath = '/admin-login'
  const schoolPublicPath = `/school/${school.slug}`
  const studentLoginPath = `/school/${school.slug}/login`
  const adminLoginUrl = absolutePath(adminLoginPath)
  const launchSteps: LaunchStep[] = [
    { label: 'Школа активна', done: school.isActive !== false },
    { label: 'Доступ админа', done: Boolean(verifiedAccessLogin) },
    { label: 'Филиал', done: overview.branchCount > 0 },
    { label: 'Инструктор', done: overview.instructorCount > 0 },
    { label: 'Окна на 7 дней', done: overview.freeSlots7Days > 0 },
    { label: 'Ученики', done: overview.studentCount > 0 },
    { label: 'Ошибки данных', done: overview.integrityWarnings === 0 },
  ]
  const launchDoneCount = launchSteps.filter((step) => step.done).length
  const launchReady = launchDoneCount === launchSteps.length

  async function copyAccessValue(value: string): Promise<void> {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      showToast('Скопировано.', 'success')
    } catch {
      showToast('Не удалось скопировать.', 'error')
    }
  }

  async function persistSchoolAccess(loginValue: string, passwordValue: string, staffNameValue: string): Promise<string> {
    const saveAccess = () => upsertSupabaseSchoolStaffCredential({
      schoolId: school.id,
      login: loginValue,
      password: passwordValue,
      staffName: staffNameValue || school.name,
      isActive: true,
    })

    let login: string
    try {
      login = await saveAccess()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (!message.includes('School not found')) throw error
      await createSupabaseSchool(school)
      login = await saveAccess()
    }

    const session = await openSupabaseStaffSession('admin', login, passwordValue)
    if (session.staffContext?.schoolId !== school.id) {
      throw new Error('Доступ сохранился не для этой школы.')
    }
    await closeSupabaseStaffSession(session.staffContext.role, session.sessionToken)
    setAccessForm((current) => ({ ...current, login, password: passwordValue, staffName: staffNameValue }))
    setAccessEditing(false)
    sessionStorage.setItem(
      `dd:superadmin:created_access:${school.id}`,
      JSON.stringify({ login, password: passwordValue }),
    )
    setVerifiedAccessLogin(login)
    return login
  }

  async function saveSchoolAccess(): Promise<void> {
    if (!accessLogin || accessLogin.length < 3) {
      showToast('Логин должен быть не короче 3 символов.', 'error')
      return
    }
    const normalizedPassword = accessForm.password.trim()
    if (normalizedPassword.length < 8) {
      showToast('Пароль должен быть не короче 8 символов.', 'error')
      return
    }

    try {
      setAccessPending(true)
      const login = await persistSchoolAccess(accessLogin, normalizedPassword, accessForm.staffName || school.name)
      showToast(`Доступ сохранён и проверен: ${login}`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить доступ.', 'error')
    } finally {
      setAccessPending(false)
    }
  }

  async function resetSchoolAccess(): Promise<void> {
    const nextPassword = generateStaffPassword()
    try {
      setAccessPending(true)
      const login = await persistSchoolAccess(accessLogin, nextPassword, accessForm.staffName || school.name)
      showToast(`Новый пароль сохранён и проверен: ${login}`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось сбросить пароль.', 'error')
    } finally {
      setAccessPending(false)
    }
  }

  function buildDirectorLaunchMessage(): string {
    return [
      `Здравствуйте! Доступ к vroom.today для ${school.name} готов.`,
      '',
      `Вход администратора: ${adminLoginUrl}`,
      `Логин: ${accessLogin}`,
      `Пароль: ${hasSavedPassword ? accessPassword : 'зададим новым сообщением после сброса'}`,
      '',
      'Что сделать в первый день:',
      '1. Войти в кабинет школы.',
      '2. Проверить филиалы и контакты.',
      '3. Добавить инструкторов и автомобили.',
      '4. Создать свободные окна в расписании.',
      `5. Отправить ученикам ссылку записи: ${absolutePath(schoolPublicPath)}`,
      '',
      `Вход ученика: ${absolutePath(studentLoginPath)}`,
    ].join('\n')
  }

  async function copyDirectorLaunchMessage(): Promise<void> {
    await copyAccessValue(buildDirectorLaunchMessage())
  }

  function buildPaymentHistory(nextState: AccessState): SchoolPaymentHistoryItem[] {
    const amount = Number(nextState.amount.replace(/\s/g, '').replace(',', '.'))
    const history = [...(school.accessPaymentHistory ?? [])]
    if (!Number.isFinite(amount) || amount <= 0 || !nextState.lastPaidAt || !nextState.paidUntil) return history
    const last = history[0]
    const samePayment = last && last.paidAt === nextState.lastPaidAt && last.paidUntil === nextState.paidUntil && last.amount === Math.round(amount)
    if (samePayment) return [{ ...last, note: nextState.note.trim() || undefined }, ...history.slice(1)]
    return [{
      id: `school-payment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      paidAt: nextState.lastPaidAt,
      amount: Math.round(amount),
      paidUntil: nextState.paidUntil,
      note: nextState.note.trim() || undefined,
      createdAt: new Date().toISOString(),
    }, ...history].slice(0, 24)
  }

  async function persistSalesState(): Promise<void> {
    const nextSchool = db.schools.upsert({
      ...school,
      city: salesState.city.trim() || undefined,
      directorName: salesState.directorName.trim() || undefined,
      directorPhone: salesState.directorPhone.trim() || undefined,
      salesStatus: salesState.status,
      salesNextContact: salesState.nextContact || undefined,
      salesNote: salesState.note.trim() || undefined,
      salesPromised: salesState.promised.trim() || undefined,
      salesNeededFromClient: salesState.neededFromClient.trim() || undefined,
      salesOwner: salesState.owner.trim() || undefined,
    })
    saveSalesState(school.id, salesState)
    try {
      const savedSchool = await updateSupabaseSchoolSales(nextSchool)
      db.schools.upsert(savedSchool)
      showToast('CRM по школе сохранена в базе.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Локально сохранено, но Supabase не принял CRM.', 'error')
    }
  }

  async function persistPaymentState(nextState = paymentState): Promise<void> {
    const amount = Number(nextState.amount.replace(/\s/g, '').replace(',', '.'))
    const nextSchool = db.schools.upsert({
      ...school,
      isActive: nextState.status !== 'blocked',
      accessStatus: nextState.status,
      accessPaidUntil: nextState.paidUntil || undefined,
      accessLastPaidAt: nextState.lastPaidAt || undefined,
      accessLastAmount: Number.isFinite(amount) ? Math.round(amount) : undefined,
      accessPaymentNote: nextState.note.trim() || undefined,
      accessPaymentHistory: buildPaymentHistory(nextState),
    })
    try {
      const savedSchool = await updateSupabaseSchoolAccess(nextSchool)
      db.schools.upsert(savedSchool)
      showToast('Оплата и доступ школы сохранены в базе.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Локально сохранено, но Supabase не принял доступ.', 'error')
    }
  }

  function extendAccessOneMonth(): void {
    const base = paymentState.paidUntil && new Date(paymentState.paidUntil) > new Date() ? new Date(paymentState.paidUntil) : new Date()
    const nextState: AccessState = {
      ...paymentState,
      status: 'active',
      lastPaidAt: new Date().toISOString().slice(0, 10),
      paidUntil: addMonthsToDate(base, 1),
      amount: paymentState.amount || '4990',
    }
    setPaymentState(nextState)
    void persistPaymentState(nextState)
  }

  return (
    <div className="max-w-7xl p-4 md:p-6">
      <PageHeader
        eyebrow="Платформа"
        title={school.name}
        description={`/${school.slug} · ${school.description || 'Описание пока не заполнено.'}`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => window.open(schoolPublicPath, '_blank')}>
              <ExternalLink width={15} height={15} />
              Публичная страница
            </Button>
            <Button variant="secondary" onClick={() => window.open(adminLoginPath, '_blank')}>
              <ExternalLink width={15} height={15} />
              Вход администратора
            </Button>
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Филиалы" value={overview.branchCount} />
        <StatCard label="Инструкторы" value={overview.instructorCount} />
        <StatCard label="Активные записи" value={overview.activeBookingsCount} />
        <StatCard label="Стоимость в месяц" value={formatPrice(overview.billing.totalMonthlyPrice)} />
      </div>

      <div className="mt-6 space-y-5">
        <Section title="Готовность к запуску" description={`${launchDoneCount} из ${launchSteps.length}.`}>
          <div className={`rounded-[14px] border p-4 ${launchReady ? 'border-[#B9E8C9] bg-[#F0FAF3]' : 'border-[#BFDBFE] bg-[#EFF6FF]'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[18px] font-black text-[#111418]">{launchReady ? 'Можно запускать' : 'Нужно дозаполнить'}</p>
                <p className="mt-1 text-[13px] font-bold text-[#66717D]">База, доступ и рабочее расписание.</p>
              </div>
              <Badge variant={launchReady ? 'success' : 'warning'} size="md">{launchDoneCount}/{launchSteps.length}</Badge>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {launchSteps.map((step) => (
                <div key={step.label} className={`rounded-[10px] border px-3 py-3 text-[13px] font-black ${launchStepClass(step.done)}`}>
                  {step.done ? '✓' : '•'} {step.label}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => window.open(schoolPublicPath, '_blank')}>Страница школы</Button>
              <Button variant="secondary" size="sm" onClick={() => window.open(adminLoginPath, '_blank')}>Вход админа</Button>
            </div>
          </div>
        </Section>

        <Section title="Ручная оплата и доступ" description="Первый запуск без платежного шлюза: деньги проверяются оператором, доступ продлевается вручную.">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
            <div className="rounded-[14px] border border-[#DCE2E8] bg-[#F8FAFC] p-4">
              <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Тариф</p>
              <p className="mt-2 text-[24px] font-black text-[#111418]">{formatPrice(overview.billing.totalMonthlyPrice)}/мес</p>
              <p className="mt-2 text-[13px] font-bold leading-5 text-[#66717D]">Подключение держится в операторке, без онлайн-оплаты на сайте.</p>
            </div>
            <div className="rounded-[14px] border border-[#DCE2E8] bg-[#F8FAFC] p-4">
              <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Статус доступа</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={getAccessVariant(paymentState.status)} size="md">{ACCESS_STATUS_LABELS[paymentState.status]}</Badge>
                {paymentState.paidUntil ? <span className="text-[13px] font-black text-[#66717D]">до {paymentState.paidUntil}</span> : null}
              </div>
              <p className="mt-2 text-[13px] font-bold leading-5 text-[#66717D]">После оплаты продлите доступ и отправьте директору данные для входа.</p>
            </div>
            <div className="rounded-[14px] border border-[#DCE2E8] bg-white p-4">
              <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Контроль запуска</p>
              <p className={`mt-2 text-[15px] font-black ${launchReady ? 'text-[#188447]' : 'text-[#1D4ED8]'}`}>{launchReady ? 'Можно выдавать доступ' : 'Сначала закрыть чеклист'}</p>
              <button type="button" onClick={copyDirectorLaunchMessage} disabled={!verifiedAccessLogin} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[#C9D2DC] bg-[#F8FAFC] px-3 text-[13px] font-black text-[#38424D] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
                <MessageSquareText width={15} height={15} />
                Текст директору
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[180px_150px_150px_minmax(0,1fr)_auto] lg:items-end">
            <label>
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Доступ</span>
              <select value={paymentState.status} onChange={(event) => setPaymentState((current) => ({ ...current, status: event.target.value as AccessState['status'] }))} className="min-h-11 w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]">
                {Object.entries(ACCESS_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Оплачено до</span>
              <input type="date" value={paymentState.paidUntil} onChange={(event) => setPaymentState((current) => ({ ...current, paidUntil: event.target.value }))} className="min-h-11 w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]" />
            </label>
            <label>
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Сумма</span>
              <input inputMode="numeric" value={paymentState.amount} onChange={(event) => setPaymentState((current) => ({ ...current, amount: event.target.value }))} className="min-h-11 w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]" />
            </label>
            <label>
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Комментарий</span>
              <input value={paymentState.note} onChange={(event) => setPaymentState((current) => ({ ...current, note: event.target.value }))} placeholder="Например: оплатил переводом, чек в Telegram" className="min-h-11 w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]" />
            </label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Button size="sm" onClick={extendAccessOneMonth}>+ месяц</Button>
              <Button variant="secondary" size="sm" onClick={() => void persistPaymentState()}>Сохранить</Button>
            </div>
          </div>
        </Section>

          <div className="mt-4 rounded-[14px] border border-[#DCE2E8] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[14px] font-black text-[#111418]">История продлений</p><span className="text-[12px] font-bold text-[#66717D]">последние {school.accessPaymentHistory?.length ?? 0}</span></div>
            <div className="mt-3 grid gap-2">
              {(school.accessPaymentHistory ?? []).length === 0 ? <div className="rounded-[12px] border border-dashed border-[#C9D2DC] bg-[#F8FAFC] px-3 py-3 text-[13px] font-bold text-[#66717D]">История появится после первого сохранённого продления.</div> : (school.accessPaymentHistory ?? []).slice(0, 6).map((payment) => (
                <div key={payment.id} className="grid gap-2 rounded-[12px] border border-[#E4E9EF] bg-[#F8FAFC] px-3 py-3 text-[13px] font-bold text-[#38424D] sm:grid-cols-[120px_100px_1fr]"><span>{payment.paidAt}</span><span>{formatPrice(payment.amount)}</span><span className="min-w-0">до {payment.paidUntil}{payment.note ? ` · ${payment.note}` : ''}</span></div>
              ))}
            </div>
          </div>

        <Section title="Продажа и следующий контакт" description="Мини-CRM: кто принимает решение, что обещано, что ждём от клиента и кто ведёт подключение.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label><span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Город</span><input value={salesState.city} onChange={(event) => setSalesState((current) => ({ ...current, city: event.target.value }))} placeholder="Например: Казань" className="min-h-11 w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]" /></label>
            <label><span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Директор</span><input value={salesState.directorName} onChange={(event) => setSalesState((current) => ({ ...current, directorName: event.target.value }))} placeholder="Имя контакта" className="min-h-11 w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]" /></label>
            <label><span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Телефон директора</span><input value={salesState.directorPhone} onChange={(event) => setSalesState((current) => ({ ...current, directorPhone: event.target.value }))} placeholder="+7..." className="min-h-11 w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]" /></label>
            <label><span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Ответственный</span><input value={salesState.owner} onChange={(event) => setSalesState((current) => ({ ...current, owner: event.target.value }))} placeholder="Кто ведёт" className="min-h-11 w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]" /></label>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[220px_220px_minmax(0,1fr)_auto] lg:items-end">
            <label><span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Статус</span><select value={salesState.status} onChange={(event) => setSalesState((current) => ({ ...current, status: event.target.value as SalesState['status'] }))} className="min-h-11 w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]">{Object.entries(SALES_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Следующий контакт</span><input type="date" value={salesState.nextContact} onChange={(event) => setSalesState((current) => ({ ...current, nextContact: event.target.value }))} className="min-h-11 w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]" /></label>
            <label><span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Заметка по продаже</span><input value={salesState.note} onChange={(event) => setSalesState((current) => ({ ...current, note: event.target.value }))} placeholder="Например: директор просил показать импорт и расписание" className="min-h-11 w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]" /></label>
            <Button onClick={() => void persistSalesState()}>Сохранить CRM</Button>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <label><span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Что обещали клиенту</span><textarea value={salesState.promised} onChange={(event) => setSalesState((current) => ({ ...current, promised: event.target.value }))} rows={3} placeholder="Импорт учеников, запуск расписания, помощь с первой настройкой" className="w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 py-2.5 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]" /></label>
            <label><span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Что получить от клиента</span><textarea value={salesState.neededFromClient} onChange={(event) => setSalesState((current) => ({ ...current, neededFromClient: event.target.value }))} rows={3} placeholder="Филиалы, инструкторы, Excel с учениками, правила оплат" className="w-full rounded-[12px] border border-[#DCE2E8] bg-white px-3 py-2.5 text-[14px] font-bold text-[#111418] outline-none focus:border-[#9AA7B5]" /></label>
          </div>
          <div className="mt-3 rounded-[14px] border border-[#DCE2E8] bg-[#F8FAFC] p-4"><p className="text-[13px] font-bold leading-5 text-[#66717D]">Текущий фокус: {salesState.status === 'paid' || salesState.status === 'onboarding' ? 'после оплаты быстро выдать доступ и провести первую настройку.' : salesState.status === 'risk' ? 'разобрать возражение и назначить короткий созвон.' : salesState.status === 'rejected' ? 'зафиксировать причину отказа и не терять историю.' : 'довести до оплаты переводом и сразу открыть кабинет.'}</p></div>
        </Section>
        <Section title="Доступ администратора школы" description="Доступ меняется только через режим редактирования. После сохранения логин и пароль проверяются реальным входом.">
          <div className="rounded-[14px] border border-[#DCE2E8] bg-[#F8FAFC] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-black text-[#111418]">Доступ владельца</p>
                <p className="mt-1 text-[13px] font-bold leading-5 text-[#66717D]">
                  {verifiedAccessLogin ? `Проверенный логин: ${verifiedAccessLogin}` : 'Задайте логин и пароль, затем сохраните.'}
                </p>
              </div>
              {accessEditing ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setAccessForm((current) => ({ ...current, password: generateStaffPassword() }))} disabled={accessPending}>
                    Сгенерировать пароль
                  </Button>
                  <Button variant="secondary" size="sm" onClick={resetSchoolAccess} disabled={accessPending || accessLogin.length < 3}>
                    <KeyRound width={15} height={15} />
                    Сбросить и проверить
                  </Button>
                  <Button size="sm" onClick={saveSchoolAccess} disabled={accessPending}>
                    <Save width={15} height={15} />
                    {accessPending ? 'Проверяем...' : 'Сохранить'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setAccessEditing(false)} disabled={accessPending}>
                    <X width={15} height={15} />
                    Отмена
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => {
                  setAccessEditing(true)
                  setAccessForm((current) => ({ ...current, password: current.password || generateStaffPassword() }))
                }}>
                  <Pencil width={15} height={15} />
                  Редактировать доступ
                </Button>
              )}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Input
                label="Логин"
                value={accessForm.login}
                disabled={!accessEditing || accessPending}
                placeholder={`${school.slug}-admin`}
                onChange={(event) => setAccessForm((current) => ({ ...current, login: event.target.value.trim().toLowerCase() }))}
              />
              <Input
                label="Имя администратора"
                value={accessForm.staffName}
                disabled={!accessEditing || accessPending}
                placeholder={school.name}
                onChange={(event) => setAccessForm((current) => ({ ...current, staffName: event.target.value }))}
              />
              <Input
                label="Пароль"
                value={accessForm.password}
                disabled={!accessEditing || accessPending}
                placeholder={verifiedAccessLogin ? 'Пароль скрыт. Задайте новый при смене.' : 'Сгенерируйте или введите пароль'}
                onChange={(event) => setAccessForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
            {verifiedAccessLogin ? (
              <span className="mt-4 inline-flex min-h-10 items-center rounded-[10px] border border-[#2DD4BF]/25 bg-[#0F2B2E] px-3 text-[13px] font-black text-[#6EE7D8]">
                Проверено: {verifiedAccessLogin}
              </span>
            ) : null}
          </div>

          <div className="mt-4 rounded-[14px] border border-[#DCE2E8] bg-[#F8FAFC] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Данные для входа</p>
                <p className="mt-1 text-[13px] font-bold leading-5 text-[#66717D]">Копируйте пароль только после сохранения. Если пароль не виден, задайте новый.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={copyDirectorLaunchMessage} disabled={!verifiedAccessLogin}>
                  <MessageSquareText width={15} height={15} />
                  Текст директору
                </Button>
                <Button variant="secondary" size="sm" onClick={() => window.open(adminLoginPath, '_blank')}>
                  <ExternalLink width={15} height={15} />
                  Открыть вход
                </Button>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              <AccessValueRow label="Логин" value={accessLogin} actionLabel="Копировать" icon={<Copy width={15} height={15} />} onAction={() => copyAccessValue(accessLogin)} />
              <AccessValueRow
                label="Пароль"
                value={hasSavedPassword ? accessPassword : 'Не задан. Нажмите «Редактировать доступ» и сохраните новый пароль.'}
                actionLabel="Копировать"
                icon={<Copy width={15} height={15} />}
                onAction={() => copyAccessValue(accessPassword)}
                disabled={!hasSavedPassword}
              />
              <AccessValueRow label="Вход администратора" value={adminLoginUrl} actionLabel="Открыть" icon={<ExternalLink width={15} height={15} />} onAction={() => window.open(adminLoginPath, '_blank')} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[14px] border border-[#DCE2E8] bg-[#F8FAFC] p-4">
              <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Страница школы</p>
              <p className="mt-2 break-all text-[14px] font-black text-[#111418]">{absolutePath(schoolPublicPath)}</p>
              <p className="mt-2 text-[13px] font-bold leading-5 text-[#66717D]">Публичная страница без создания доступа.</p>
            </div>
            <div className="rounded-[14px] border border-[#DCE2E8] bg-[#F8FAFC] p-4">
              <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#66717D]">Вход ученика</p>
              <p className="mt-2 break-all text-[14px] font-black text-[#111418]">{absolutePath(studentLoginPath)}</p>
              <p className="mt-2 text-[13px] font-bold leading-5 text-[#66717D]">Для учеников, которым школа уже выдала доступ.</p>
            </div>
          </div>
        </Section>

        <Section title="Конфигурация" description="Основные параметры школы.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[14px] border border-[#DCE2E8] bg-[#F8FAFC] px-4 py-4">
              <p className="caption">Slug</p>
              <p className="mt-1 text-sm font-semibold text-[#111418]">{overview.school.slug}</p>
            </div>
            <div className="rounded-[14px] border border-[#DCE2E8] bg-[#F8FAFC] px-4 py-4">
              <p className="caption">Лимит записей</p>
              <p className="mt-1 text-sm font-semibold text-[#111418]">
                {overview.school.bookingLimitEnabled ? overview.school.maxActiveBookingsPerStudent : 'Выключен'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[#DCE2E8] bg-[#F8FAFC] px-4 py-4">
              <p className="caption">Свободное время на 7 дней</p>
              <p className="mt-1 text-sm font-semibold text-[#111418]">{overview.freeSlots7Days}</p>
            </div>
            <div className="rounded-[14px] border border-[#DCE2E8] bg-[#F8FAFC] px-4 py-4">
              <p className="caption">Предупреждения</p>
              <p className="mt-1 text-sm font-semibold text-[#111418]">{overview.integrityWarnings}</p>
            </div>
          </div>
        </Section>

        <Section title="Филиалы и инструкторы" description="Быстрый срез наполнения школы.">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              {collections.branches.map((branch) => (
                <DataRow key={branch.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#111418]">{branch.name}</p>
                      <p className="mt-1 text-sm text-[#6F747A]">{branch.address || 'Адрес не указан'}</p>
                    </div>
                    <Badge variant={branch.isActive ? 'success' : 'muted'}>{branch.isActive ? 'Активен' : 'Скрыт'}</Badge>
                  </div>
                </DataRow>
              ))}
            </div>
            <div className="space-y-3">
              {collections.instructors.map((instructor) => (
                <DataRow key={instructor.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#111418]">{formatInstructorName(instructor.name)}</p>
                      <p className="mt-1 text-sm text-[#6F747A]">{instructor.car ?? 'Машина не указана'}</p>
                    </div>
                    <Badge variant={instructor.isActive ? 'success' : 'muted'}>{instructor.isActive ? 'Активен' : 'Скрыт'}</Badge>
                  </div>
                </DataRow>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Модули и биллинг" description="Подключённые возможности и расчётная стоимость.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {collections.enabledModules.map((item) => (
              <DataRow key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#111418]">{item.module.name}</p>
                    <p className="mt-1 text-sm text-[#6F747A]">
                      {item.module.priceType === 'monthly'
                        ? `${formatPrice(item.module.monthlyPrice ?? 0)}/мес`
                        : item.module.priceType === 'one_time'
                          ? `${formatPrice(item.module.oneTimePrice ?? 0)} разово`
                          : item.module.usageNote ?? 'По факту использования'}
                    </p>
                  </div>
                  <Badge variant="success">Включён</Badge>
                </div>
              </DataRow>
            ))}
            {collections.enabledModules.length === 0 ? (
              <StateView title="Подключённых модулей пока нет" description="Школа работает только на базовом пакете." />
            ) : null}
          </div>
        </Section>
      </div>
    </div>
  )
}
