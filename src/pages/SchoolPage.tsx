import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight01Icon, Building03Icon, Login03Icon, SmartPhone01Icon, Location01Icon, Calendar02Icon } from '@hugeicons/core-free-icons'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { StateView } from '../components/ui/StateView'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { isValidRussianPhone } from '../services/bookingService'
import { isSupabaseConfigured } from '../lib/supabase'
import { loadPublicSchoolData, type PublicSchoolData } from '../services/publicSchoolData'
import { findSchoolNamespaceBySlug } from '../services/storage'
import { loginStudentProfileFromSupabase, verifyStudentCredentials } from '../services/studentProfile'
import type { School } from '../types'

void React

const ArrowRight = createHugeIcon(ArrowRight01Icon)
const Building2 = createHugeIcon(Building03Icon)
const Login = createHugeIcon(Login03Icon)
const Phone = createHugeIcon(SmartPhone01Icon)
const Location = createHugeIcon(Location01Icon)
const Calendar = createHugeIcon(Calendar02Icon)

type ViewTab = 'home' | 'book' | 'about' | 'contacts'
type ViewMode = 'public' | 'login'

export function SchoolPage() {
  const { slug = 'virazh' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<PublicSchoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ViewTab>('home')
  const [mode, setMode] = useState<ViewMode>('public')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const school = data?.school ?? null

  useEffect(() => {
    const isLocalSchool = Boolean(findSchoolNamespaceBySlug(slug)) || slug === 'virazh' || slug === 'workspace'
    setLoading(true)
    setMode('public')
    setTab('home')
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
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col pb-20 pt-5">
        {/* Header */}
        <header className="flex items-center justify-between px-5">
          <button className="flex items-center gap-2.5 text-left" onClick={() => navigate('/')}>
            <SchoolLogo school={school} />
            <div>
              <p className="max-w-[200px] truncate text-[15px] font-black leading-4 tracking-[-0.02em] text-[var(--text)]">{school.name}</p>
              <p className="text-[12px] font-bold leading-4 text-[var(--text-muted)]">онлайн-запись</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
          </div>
        </header>

        {/* Tab navigation */}
        <nav className="mt-4 flex gap-1 px-5">
          {([
            ['home', 'Главная'],
            ['book', 'Запись'],
            ['about', 'О нас'],
            ['contacts', 'Контакты'],
          ] as [ViewTab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 rounded-full py-2.5 text-center text-[13px] font-extrabold transition-all active:scale-[0.97]"
              style={{
                background: tab === t ? 'var(--text)' : 'var(--surface-muted)',
                color: tab === t ? 'var(--surface)' : 'var(--text-muted)',
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="flex-1 px-5 pt-5">

          {/* ── Home tab ── */}
          {tab === 'home' && (
            <section className="space-y-5">
              {/* Hero */}
              <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
                <div className="mb-4 flex items-center gap-3">
                  <SchoolLogo school={school} large />
                  <div className="min-w-0">
                    <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-soft)]">Автошкола</p>
                    <h1 className="mt-1 truncate text-[26px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">{school.name}</h1>
                  </div>
                </div>
                {school.description && (
                  <p className="text-[15px] font-semibold leading-6 text-[var(--text-muted)]">{school.description}</p>
                )}
                {school.address && (
                  <div className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--text-muted)]">
                    <Location size={14} />
                    {school.address}
                  </div>
                )}
              </div>

              {/* CTA cards */}
              <div className="grid gap-3">
                <button
                  onClick={() => setTab('book')}
                  className="flex items-center justify-between rounded-[22px] bg-[var(--accent)] p-5 text-white shadow-[0_14px_30px_rgba(36,54,217,0.22)] active:scale-[0.98]"
                >
                  <div>
                    <p className="text-[17px] font-black tracking-[-0.02em]">Записаться на занятие</p>
                    <p className="mt-1 text-[13px] font-semibold opacity-80">Выберите удобное время онлайн</p>
                  </div>
                  <ArrowRight size={22} />
                </button>
                <button
                  onClick={() => setTab('about')}
                  className="flex items-center justify-between rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 active:scale-[0.98]"
                >
                  <div>
                    <p className="text-[16px] font-black text-[var(--text)]">Об автошколе</p>
                    <p className="mt-1 text-[13px] font-semibold text-[var(--text-muted)]">Направления, категории, инструкторы</p>
                  </div>
                  <ArrowRight size={20} className="text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Quick info pills */}
              <div className="flex flex-wrap gap-2">
                {school.phone && (
                  <a
                    href={`tel:${school.phone.replace(/\D/g, '')}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--green-soft)] px-4 py-2 text-[13px] font-extrabold text-[var(--green)]"
                  >
                    <Phone size={13} />
                    {school.phone}
                  </a>
                )}
                {school.address && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-4 py-2 text-[13px] font-extrabold text-[var(--text-muted)]">
                    <Location size={13} />
                    {school.address.split(',')[0]}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Book tab ── */}
          {tab === 'book' && (
            <section className="space-y-5">
              {mode === 'login' ? (
                /* Login form */
                <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]" onKeyDown={handleKeyDown}>
                  <div className="mb-5 flex items-center gap-3">
                    <SchoolLogo school={school} large />
                    <div className="min-w-0">
                      <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-soft)]">Автошкола</p>
                      <h1 className="mt-1 truncate text-[26px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">{school.name}</h1>
                    </div>
                  </div>

                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-2 text-[12px] font-extrabold text-[var(--accent)]">
                    <Login size={14} /> Вход ученика
                  </div>
                  <h2 className="text-[30px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">Войдите в кабинет</h2>
                  <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-muted)]">
                    Чтобы записаться, войдите в личный кабинет ученика.
                  </p>

                  <div className="mt-6 space-y-4">
                    <PhoneInput label="Телефон" value={phone} error={error && !isValidRussianPhone(phone) ? error : ''} onChange={(value) => { setError(''); setPhone(value) }} autoFocus />
                    <Input label="Пароль" type="password" value={password} error={error && isValidRussianPhone(phone) ? error : ''} placeholder="Ваш пароль" autoComplete="current-password" onChange={(event) => { setError(''); setPassword(event.target.value) }} />
                  </div>

                  <Button size="lg" className="mt-5 w-full rounded-[18px]" disabled={submitting || !isValidRussianPhone(phone) || password.trim().length < 6} onClick={() => void submit()}>
                    {submitting ? 'Входим...' : 'Войти'}
                    <ArrowRight size={18} />
                  </Button>

                  <button type="button" className="mt-3 w-full rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-[13px] font-extrabold text-[var(--accent)]" onClick={() => navigate(`/school/${school.slug}/register`)}>
                    Зарегистрироваться
                  </button>
                </div>
              ) : (
                /* Booking entry points */
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
                    <div className="mb-4 flex items-center gap-2">
                      <Calendar size={20} className="text-[var(--accent)]" />
                      <h2 className="text-[24px] font-black tracking-[-0.03em] text-[var(--text)]">Запись на вождение</h2>
                    </div>
                    <p className="text-[15px] font-semibold leading-6 text-[var(--text-muted)]">
                      Запишитесь на удобное время онлайн — без звонков и очередей.
                    </p>
                    <Button size="lg" className="mt-5 w-full rounded-[18px]" onClick={() => navigate(`/school/${school.slug}/book`)}>
                      Выбрать время
                      <ArrowRight size={18} />
                    </Button>
                  </div>

                  <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5">
                    <p className="text-[15px] font-semibold text-[var(--text-muted)]">
                      Уже зарегистрированы?
                    </p>
                    <button
                      onClick={() => setMode('login')}
                      className="mt-3 flex w-full items-center justify-between rounded-[16px] bg-[var(--surface-muted)] px-4 py-3.5 text-[14px] font-extrabold text-[var(--accent)] active:scale-[0.98]"
                    >
                      Войти в кабинет
                      <Login size={16} />
                    </button>
                  </div>

                  <div className="rounded-[22px] border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-center">
                    <p className="text-[15px] font-semibold text-[var(--text-muted)]">
                      Ещё нет кабинета?
                    </p>
                    <button
                      onClick={() => navigate(`/school/${school.slug}/register`)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-[16px] bg-[var(--accent)] px-4 py-3.5 text-[14px] font-extrabold text-white active:scale-[0.98]"
                    >
                      Зарегистрируйтесь за 1 минуту
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── About tab ── */}
          {tab === 'about' && (
            <section className="space-y-5">
              <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
                <h2 className="text-[24px] font-black tracking-[-0.03em] text-[var(--text)]">{school.name}</h2>
                {school.description && (
                  <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-muted)]">{school.description}</p>
                )}
              </div>

              {/* Categories */}
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5">
                <h3 className="text-[17px] font-black text-[var(--text)]">Категории обучения</h3>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(school.enabledCategoryCodes?.length ? school.enabledCategoryCodes : ['B']).map((cat) => (
                    <div key={cat} className="flex items-center justify-center rounded-[14px] bg-[var(--surface-muted)] py-3 text-[15px] font-black text-[var(--text)]">
                      {cat}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructors preview */}
              {data?.instructors && data.instructors.length > 0 && (
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5">
                  <h3 className="text-[17px] font-black text-[var(--text)]">Наши инструкторы</h3>
                  <div className="mt-3 space-y-2">
                    {data.instructors.slice(0, 3).map((instructor) => (
                      <div key={instructor.id} className="flex items-center gap-3 rounded-[14px] bg-[var(--surface-muted)] px-4 py-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[14px] font-black text-[var(--accent)]">
                          {instructor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-[14px] font-black text-[var(--text)]">{instructor.name}</p>
                          {instructor.car && <p className="text-[12px] font-semibold text-[var(--text-muted)]">{instructor.car}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="secondary" className="w-full rounded-[18px]" onClick={() => setTab('book')}>
                <Calendar size={16} />
                Записаться на занятие
              </Button>
            </section>
          )}

          {/* ── Contacts tab ── */}
          {tab === 'contacts' && (
            <section className="space-y-4">
              <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
                <h2 className="text-[24px] font-black tracking-[-0.03em] text-[var(--text)]">Контакты</h2>

                <div className="mt-5 space-y-4">
                  {school.phone && (
                    <a href={`tel:${school.phone.replace(/\D/g, '')}`} className="flex items-center gap-4 rounded-[18px] bg-[var(--green-soft)] p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--green)] text-white">
                        <Phone size={18} />
                      </div>
                      <div>
                        <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[var(--green)]">Телефон</p>
                        <p className="text-[17px] font-black text-[var(--text)]">{school.phone}</p>
                      </div>
                    </a>
                  )}
                  {school.email && (
                    <a href={`mailto:${school.email}`} className="flex items-center gap-4 rounded-[18px] bg-[var(--blue-soft)] p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--accent)] text-white">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      </div>
                      <div>
                        <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[var(--accent)]">Email</p>
                        <p className="text-[15px] font-semibold text-[var(--text)]">{school.email}</p>
                      </div>
                    </a>
                  )}
                  {school.address && (
                    <div className="flex items-center gap-4 rounded-[18px] bg-[var(--surface-muted)] p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--text)] text-white">
                        <Location size={18} />
                      </div>
                      <div>
                        <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[var(--text-soft)]">Адрес</p>
                        <p className="text-[15px] font-semibold text-[var(--text)]">{school.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button className="w-full rounded-[18px]" onClick={() => setTab('book')}>
                <Calendar size={16} />
                Записаться на занятие
              </Button>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function SchoolLogo({ school, large = false }: { school: School; large?: boolean }) {
  return (
    <div className={`${large ? 'h-16 w-16 rounded-[22px]' : 'h-11 w-11 rounded-[18px]'} grid shrink-0 place-items-center overflow-hidden bg-[var(--accent)] text-white shadow-[0_14px_30px_rgba(36,54,217,0.24)]`}>
      {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : <Building2 size={large ? 28 : 22} />}
    </div>
  )
}
