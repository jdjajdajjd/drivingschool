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
import { DEMO_SCHOOL_SLUG } from '../services/schoolRoutes'
import type { School } from '../types'

void React

const ArrowRight = createHugeIcon(ArrowRight01Icon)
const Building = createHugeIcon(Building05Icon)

const fallbackSchool: School = {
  id: 'school-virazh',
  name: 'Автошкола «Вираж»',
  slug: DEMO_SCHOOL_SLUG,
  description: '',
  phone: '',
  email: '',
  address: '',
  createdAt: '',
  isActive: true,
}

export default function StudentLoginPage() {
  const navigate = useNavigate()
  const { slug = DEMO_SCHOOL_SLUG } = useParams<{ slug?: string }>()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const school = useMemo(() => {
    const namespace = findSchoolNamespaceBySlug(slug)
    if (namespace) setDataNamespace(namespace)
    return findSchoolBySlugAcrossNamespaces(slug) ?? fallbackSchool
  }, [slug])
  const schoolNamespace = useMemo(() => findSchoolNamespaceBySlug(slug), [slug])

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
      const result = schoolNamespace === 'demo'
        ? verifyStudentCredentials(phone, password)
        : isSupabaseConfigured()
          ? await loginStudentProfileFromSupabase(school.id, phone, password)
          : verifyStudentCredentials(phone, password)
      setSubmitting(false)
      if (!result) {
        setError('Телефон или пароль не совпадают. Если доступа ещё нет, пройдите регистрацию.')
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
    <div className="student-lite min-h-dvh bg-[var(--page-bg)] text-[var(--text)]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-4 pb-5 pt-4">
        <header className="flex items-center justify-between gap-3 rounded-[24px] border border-white/55 bg-[rgba(255,255,255,0.72)] px-3 py-3 shadow-[var(--shadow-card)] backdrop-blur-2xl">
          <button className="flex min-w-0 items-center gap-2.5 text-left" onClick={() => navigate(`/school/${school.slug}`)}>
            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-[15px] bg-[linear-gradient(180deg,#1A1E23_0%,#101215_100%)] text-white shadow-[0_10px_28px_rgba(17,19,21,0.16)]">
              {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : <Building size={22} />}
            </div>
            <div className="min-w-0">
              <p className="max-w-[190px] truncate text-[15px] font-semibold leading-4 text-[var(--text)]">{school.name}</p>
              <p className="text-[12px] font-medium leading-4 text-[var(--text-muted)]">личный кабинет</p>
            </div>
          </button>
          <button
            className="min-h-10 rounded-full border border-white/60 bg-[rgba(255,255,255,0.62)] px-4 text-[13px] font-semibold text-[var(--text)] shadow-[0_6px_20px_rgba(20,24,32,0.04)] backdrop-blur-xl active:scale-[0.97]"
            onClick={() => navigate(`/school/${school.slug}/register`)}
          >
            Регистрация
          </button>
        </header>

        <section className="flex flex-1 flex-col justify-center py-6">
          <div className="rounded-[28px] border border-white/60 bg-[rgba(255,255,255,0.76)] p-5 shadow-[var(--shadow-card)] backdrop-blur-2xl" onKeyDown={handleKeyDown}>
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-[16px] bg-[rgba(255,255,255,0.62)] text-[var(--text)] shadow-[0_8px_24px_rgba(20,24,32,0.04)]">
              <Building size={23} />
            </div>
            <h1 className="text-[30px] font-semibold leading-[1.06] text-[var(--text)]">Вход ученика</h1>
            <p className="mt-3 max-w-[28ch] text-[15px] font-medium leading-6 text-[var(--text-muted)]">
              Откройте занятия, документы и историю записей автошколы.
            </p>

            <div className="mt-6 space-y-4">
              <PhoneInput label="Телефон" value={phone} error={error && !isValidRussianPhone(phone) ? error : ''} onChange={(value) => { setError(''); setPhone(value) }} autoFocus />
              <Input label="Пароль" type="password" value={password} error={error && isValidRussianPhone(phone) ? error : ''} placeholder="Ваш пароль" autoComplete="current-password" onChange={(event) => { setError(''); setPassword(event.target.value) }} />
            </div>

            <Button size="lg" className="mt-5 w-full min-h-[56px] rounded-full text-[16px]" disabled={submitting || !isValidRussianPhone(phone) || password.trim().length < 6} onClick={() => void submit()}>
              {submitting ? 'Проверяем...' : 'Войти'}
              <ArrowRight size={18} />
            </Button>
            <button
              type="button"
              className="mt-3 w-full rounded-full border border-white/60 bg-[rgba(255,255,255,0.5)] px-3 py-3 text-[13px] font-medium text-[var(--text-muted)] backdrop-blur-xl"
              onClick={() => setError('Для восстановления доступа обратитесь в автошколу.')}
            >
              Забыли пароль?
            </button>
            <p className="mt-5 text-center text-[12px] font-medium leading-5 text-[var(--text-muted)]">
              Продолжая, вы принимаете <a className="font-semibold text-[var(--text)]" href="/terms">условия сервиса</a> и <a className="font-semibold text-[var(--text)]" href="/privacy">политику конфиденциальности</a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
