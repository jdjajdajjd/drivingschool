import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight01Icon, Building03Icon, Calendar03Icon, Location01Icon, Login03Icon, UserMultipleIcon } from '@hugeicons/core-free-icons'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { StateView } from '../components/ui/StateView'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { ThemeToggle } from '../components/ui/ThemeProvider'
import { isValidRussianPhone } from '../services/bookingService'
import { isSupabaseConfigured } from '../lib/supabase'
import { loadPublicSchoolData, type PublicSchoolData } from '../services/publicSchoolData'
import { setDataNamespace } from '../services/storage'
import { loginStudentProfileFromSupabase, verifyStudentCredentials } from '../services/studentProfile'
import type { School } from '../types'

void React

const ArrowRight = createHugeIcon(ArrowRight01Icon)
const Building2 = createHugeIcon(Building03Icon)
const Calendar = createHugeIcon(Calendar03Icon)
const Location = createHugeIcon(Location01Icon)
const Login = createHugeIcon(Login03Icon)
const Users = createHugeIcon(UserMultipleIcon)

type ViewMode = 'public' | 'login'

export function SchoolPage() {
  const { slug = 'virazh' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<PublicSchoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<ViewMode>('public')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const school = data?.school ?? null
  const activeBranches = data?.branches ?? []
  const activeInstructors = data?.instructors ?? []
  const futureSlots = (data?.slots ?? [])
    .filter((slot) => slot.status === 'available')
    .filter((slot) => new Date(`${slot.date}T${slot.time}:00`).getTime() > Date.now())
    .sort((left, right) => new Date(`${left.date}T${left.time}:00`).getTime() - new Date(`${right.date}T${right.time}:00`).getTime())
  const nextSlots = futureSlots.slice(0, 3)

  useEffect(() => {
    const isLocalSchool = slug === 'virazh' || slug === 'workspace'
    if (slug === 'virazh') setDataNamespace('demo')
    if (slug === 'workspace') setDataNamespace('workspace')
    setLoading(true)
    setMode('public')
    void loadPublicSchoolData(slug, { preferLocal: isLocalSchool })
      .then((loaded) => setData(loaded))
      .finally(() => setLoading(false))
  }, [slug])

  async function submit() {
    if (!school || submitting) return
    setError('')
    if (!isValidRussianPhone(phone)) {
      setError('Введите корректный номер телефона.')
      return
    }
    if (password.trim().length < 6) {
      setError('Введите пароль от 6 символов.')
      return
    }

    setSubmitting(true)
    try {
      const result = isSupabaseConfigured()
        ? await loginStudentProfileFromSupabase(school.id, phone, password)
        : verifyStudentCredentials(phone, password)
      setSubmitting(false)
      if (!result) {
        setError('Телефон или пароль не совпадают. Если кабинета ещё нет, зарегистрируйтесь.')
        return
      }
      navigate('/student', { replace: true })
    } catch {
      setSubmitting(false)
      setError('Не удалось войти. Попробуйте ещё раз.')
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    void submit()
  }

  if (loading) return <div className="min-h-dvh bg-[var(--page-bg)]" />
  if (!school) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--page-bg)] px-4">
        <StateView
          kind="error"
          title="Автошкола не найдена"
          description="Проверьте ссылку у администратора автошколы."
          action={<button className="btn btn-primary btn-md" onClick={() => navigate('/')}>На главную</button>}
        />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[var(--page-bg)] text-[var(--text)]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-6 pt-5">
        <header className="flex items-center justify-between">
          <button className="flex items-center gap-2.5 text-left" onClick={() => navigate('/')}>
            <SchoolLogo school={school} />
            <div>
              <p className="max-w-[250px] truncate text-[15px] font-black leading-4 tracking-[-0.02em] text-[var(--text)]">{school.name}</p>
              <p className="text-[12px] font-bold leading-4 text-[var(--text-muted)]">онлайн-запись</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <button className="min-h-10 rounded-full bg-[var(--surface)] px-4 text-[13px] font-extrabold text-[var(--accent)] shadow-[var(--shadow-card)] active:scale-[0.97]" onClick={() => setMode(mode === 'login' ? 'public' : 'login')}>
              {mode === 'login' ? 'К записи' : 'Войти'}
            </button>
          </div>
        </header>

        {mode === 'public' ? (
          <section className="flex flex-1 flex-col py-7">
            <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
              <div className="mb-5 flex items-center gap-3">
                <SchoolLogo school={school} large />
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-soft)]">Автошкола</p>
                  <h1 className="mt-1 text-[28px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">{school.name}</h1>
                </div>
              </div>

              <h2 className="text-[34px] font-black leading-[1.03] tracking-[-0.04em] text-[var(--text)]">Запишитесь на практическое занятие</h2>
              <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-muted)]">
                {school.description || 'Выберите удобный день, инструктора и свободное время. Подтверждение появится сразу после записи.'}
              </p>

              <Button size="lg" className="mt-5 w-full rounded-[18px]" onClick={() => navigate(`/school/${school.slug}/book`)}>
                Записаться на занятие
                <ArrowRight size={18} />
              </Button>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <InfoStat icon={<Location size={15} />} value={activeBranches.length} label="филиала" />
                <InfoStat icon={<Users size={15} />} value={activeInstructors.length} label="инструкторов" />
                <InfoStat icon={<Calendar size={15} />} value={futureSlots.length} label="окон" />
              </div>
            </div>

            <div className="mt-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
              <p className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-soft)]">Ближайшее время</p>
              {nextSlots.length ? (
                <div className="mt-3 space-y-2">
                  {nextSlots.map((slot) => {
                    const instructor = activeInstructors.find((item) => item.id === slot.instructorId)
                    const branch = activeBranches.find((item) => item.id === slot.branchId)
                    return (
                      <button
                        key={slot.id}
                        className="w-full rounded-[20px] bg-[var(--surface-muted)] px-4 py-3 text-left active:scale-[0.98]"
                        onClick={() => navigate(`/school/${school.slug}/book?slot=${slot.id}`)}
                      >
                        <p className="text-[15px] font-black text-[var(--text)]">{formatSlotDate(slot.date)}, {slot.time}</p>
                        <p className="mt-1 text-[13px] font-bold text-[var(--text-muted)]">{instructor?.name ?? 'Инструктор'} · {branch?.name ?? 'Филиал'}</p>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="mt-3 text-[14px] font-semibold leading-5 text-[var(--text-muted)]">Свободные занятия появятся после настройки расписания.</p>
              )}
            </div>
          </section>
        ) : (
          <section className="flex flex-1 flex-col justify-center py-8">
            <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]" onKeyDown={handleKeyDown}>
              <div className="mb-5 flex items-center gap-3">
                <SchoolLogo school={school} large />
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-soft)]">Автошкола</p>
                  <h1 className="mt-1 truncate text-[28px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">{school.name}</h1>
                </div>
              </div>

              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-2 text-[12px] font-extrabold text-[var(--accent)]">
                <Login size={14} /> Вход ученика
              </div>
              <h2 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">Войдите в кабинет</h2>
              <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-muted)]">
                Здесь хранятся ваши записи, занятия и сообщения автошколы.
              </p>

              <div className="mt-6 space-y-4">
                <PhoneInput label="Телефон" value={phone} error={error && !isValidRussianPhone(phone) ? error : ''} onChange={(value) => { setError(''); setPhone(value) }} autoFocus />
                <Input label="Пароль" type="password" value={password} error={error && isValidRussianPhone(phone) ? error : ''} placeholder="Ваш пароль" autoComplete="current-password" onChange={(event) => { setError(''); setPassword(event.target.value) }} />
              </div>

              <Button size="lg" className="mt-5 w-full rounded-[18px]" disabled={submitting || !isValidRussianPhone(phone) || password.trim().length < 6} onClick={() => void submit()}>
                {submitting ? 'Входим...' : 'Войти'}
                <ArrowRight size={18} />
              </Button>

              <button type="button" className="mt-3 w-full rounded-[16px] bg-[var(--surface-muted)] px-4 py-3 text-[13px] font-extrabold text-[var(--accent)]" onClick={() => navigate(`/school/${school.slug}/register`)}>
                Зарегистрироваться
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function InfoStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-muted)] px-2 py-3">
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</div>
      <p className="text-[17px] font-black text-[var(--text)]">{value}</p>
      <p className="text-[11px] font-bold text-[var(--text-soft)]">{label}</p>
    </div>
  )
}

function formatSlotDate(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${date}T00:00:00`))
}

function SchoolLogo({ school, large = false }: { school: School; large?: boolean }) {
  return (
    <div className={`${large ? 'h-16 w-16 rounded-[22px]' : 'h-11 w-11 rounded-[18px]'} grid shrink-0 place-items-center overflow-hidden bg-[var(--accent)] text-white shadow-[0_14px_30px_rgba(36,54,217,0.24)]`}>
      {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : <Building2 size={large ? 28 : 22} />}
    </div>
  )
}
