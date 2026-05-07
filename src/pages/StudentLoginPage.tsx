import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight01Icon, Building05Icon } from '@hugeicons/core-free-icons'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { ThemeToggle } from '../components/ui/ThemeProvider'
import { isValidRussianPhone } from '../services/bookingService'
import { loginStudentProfileFromSupabase, verifyStudentCredentials } from '../services/studentProfile'
import { isSupabaseConfigured } from '../lib/supabase'
import { db, setDataNamespace } from '../services/storage'
import type { School } from '../types'

void React

const ArrowRight = createHugeIcon(ArrowRight01Icon)
const Building = createHugeIcon(Building05Icon)

const fallbackSchool: School = {
  id: 'school-virazh',
  name: 'Автошкола «Вираж»',
  slug: 'virazh',
  description: '',
  phone: '',
  email: '',
  address: '',
  createdAt: '',
  isActive: true,
}

export default function StudentLoginPage() {
  const navigate = useNavigate()
  const { slug = 'virazh' } = useParams<{ slug?: string }>()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (slug === 'virazh') setDataNamespace('demo')
  if (slug === 'workspace') setDataNamespace('workspace')
  const school = useMemo(() => db.schools.bySlug(slug) ?? db.schools.bySlug('virazh') ?? fallbackSchool, [slug])

  async function submit() {
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
      const result = slug === 'virazh'
        ? verifyStudentCredentials(phone, password)
        : isSupabaseConfigured()
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

  return (
    <div className="min-h-dvh bg-[var(--page-bg)] text-[var(--text)]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-6 pt-5">
        <header className="flex items-center justify-between">
          <button className="flex items-center gap-2.5 text-left" onClick={() => navigate(`/school/${school.slug}`)}>
            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-[18px] bg-[var(--accent)] text-white shadow-[0_14px_30px_rgba(36,54,217,0.24)]">
              {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : <Building size={22} />}
            </div>
            <div className="min-w-0">
              <p className="max-w-[150px] truncate text-[15px] font-black leading-4 tracking-[-0.02em] text-[var(--text)]">{school.name}</p>
              <p className="text-[12px] font-bold leading-4 text-[var(--text-muted)]">кабинет ученика</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <button className="min-h-10 rounded-full bg-[var(--surface)] px-4 text-[13px] font-extrabold text-[var(--accent)] shadow-[var(--shadow-card)] active:scale-[0.97]" onClick={() => navigate(`/school/${school.slug}/register`)}>
              Регистрация
            </button>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]" onKeyDown={handleKeyDown}>
            <div className="mb-5 inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-2 text-[12px] font-extrabold text-[var(--accent)]">
              Вход ученика
            </div>
            <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">Войдите в кабинет</h1>
            <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-muted)]">
              Здесь хранятся ваши записи, занятия, документы и сообщения автошколы.
            </p>

            <div className="mt-6 space-y-4">
              <PhoneInput label="Телефон" value={phone} error={error && !isValidRussianPhone(phone) ? error : ''} onChange={(value) => { setError(''); setPhone(value) }} autoFocus />
              <Input label="Пароль" type="password" value={password} error={error && isValidRussianPhone(phone) ? error : ''} placeholder="Ваш пароль" autoComplete="current-password" onChange={(event) => { setError(''); setPassword(event.target.value) }} />
            </div>

            <Button size="lg" className="mt-5 w-full rounded-[18px]" disabled={submitting || !isValidRussianPhone(phone) || password.trim().length < 6} onClick={() => void submit()}>
              {submitting ? 'Входим...' : 'Войти'}
              <ArrowRight size={18} />
            </Button>
            <button type="button" className="mt-3 w-full rounded-[16px] bg-[var(--surface-muted)] px-4 py-3 text-[13px] font-extrabold text-[var(--text-muted)]" onClick={() => setError('Для восстановления доступа обратитесь в автошколу.')}>Забыли пароль?</button>
            <p className="mt-4 text-center text-[12px] font-semibold leading-5 text-[var(--text-soft)]">
              Продолжая, вы принимаете <a className="font-extrabold text-[var(--accent)]" href="/terms">условия сервиса</a> и <a className="font-extrabold text-[var(--accent)]" href="/privacy">политику конфиденциальности</a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
