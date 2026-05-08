import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight01Icon, Building05Icon } from '@hugeicons/core-free-icons'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { isValidRussianPhone } from '../services/bookingService'
import { loginStudentProfileFromSupabase, verifyStudentCredentials } from '../services/studentProfile'
import { isSupabaseConfigured } from '../lib/supabase'
import { findSchoolBySlugAcrossNamespaces, findSchoolNamespaceBySlug, setDataNamespace } from '../services/storage'
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
  const school = useMemo(() => {
    const namespace = findSchoolNamespaceBySlug(slug)
    if (namespace) setDataNamespace(namespace)
    return findSchoolBySlugAcrossNamespaces(slug) ?? fallbackSchool
  }, [slug])

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
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-5 pt-4">
        <header className="flex items-center justify-between">
          <button className="flex items-center gap-2.5 text-left" onClick={() => navigate(`/school/${school.slug}`)}>
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-[14px] bg-[var(--accent)] text-white">
              {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : <Building size={22} />}
            </div>
            <div className="min-w-0">
              <p className="max-w-[150px] truncate text-[15px] font-black leading-4 tracking-[-0.02em] text-[var(--text)]">{school.name}</p>
              <p className="text-[12px] font-bold leading-4 text-[var(--text-muted)]">кабинет ученика</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <button className="min-h-9 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-extrabold text-[var(--accent)] active:scale-[0.97]" onClick={() => navigate(`/school/${school.slug}/register`)}>
              Регистрация
            </button>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-5">
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4" onKeyDown={handleKeyDown}>
            <div className="mb-3 inline-flex rounded-[10px] bg-[var(--accent-soft)] px-2.5 py-1.5 text-[12px] font-extrabold text-[var(--accent)]">
              Вход ученика
            </div>
            <h1 className="text-[26px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">Войдите в кабинет</h1>
            <p className="mt-2 text-[14px] font-semibold leading-5 text-[var(--text-muted)]">
              Записи, занятия и документы автошколы.
            </p>

            <div className="mt-4 space-y-3">
              <PhoneInput label="Телефон" value={phone} error={error && !isValidRussianPhone(phone) ? error : ''} onChange={(value) => { setError(''); setPhone(value) }} autoFocus />
              <Input label="Пароль" type="password" value={password} error={error && isValidRussianPhone(phone) ? error : ''} placeholder="Ваш пароль" autoComplete="current-password" onChange={(event) => { setError(''); setPassword(event.target.value) }} />
            </div>

            <Button size="lg" className="mt-4 w-full" disabled={submitting || !isValidRussianPhone(phone) || password.trim().length < 6} onClick={() => void submit()}>
              {submitting ? 'Входим...' : 'Войти'}
              <ArrowRight size={18} />
            </Button>
            <button type="button" className="mt-2 w-full rounded-[12px] bg-[var(--surface-muted)] px-3 py-2.5 text-[13px] font-extrabold text-[var(--text-muted)]" onClick={() => setError('Для восстановления доступа обратитесь в автошколу.')}>Забыли пароль?</button>
            <p className="mt-4 text-center text-[12px] font-semibold leading-5 text-[var(--text-soft)]">
              Продолжая, вы принимаете <a className="font-extrabold text-[var(--accent)]" href="/terms">условия сервиса</a> и <a className="font-extrabold text-[var(--accent)]" href="/privacy">политику конфиденциальности</a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
