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
    <div className="min-h-dvh bg-[#F6F7FA] text-[#050609]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-4 pb-5 pt-4">
        <header className="flex items-center justify-between gap-3 rounded-[24px] border border-[#EBECF0] bg-white px-3 py-3 shadow-[0_12px_34px_rgba(15,20,25,0.06)]">
          <button className="flex min-w-0 items-center gap-2.5 text-left" onClick={() => navigate(`/school/${school.slug}`)}>
            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-[15px] bg-[#050609] text-white">
              {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : <Building size={22} />}
            </div>
            <div className="min-w-0">
              <p className="max-w-[190px] truncate text-[15px] font-black leading-4 text-[#050609]">{school.name}</p>
              <p className="text-[12px] font-bold leading-4 text-[#8B8D94]">личный кабинет</p>
            </div>
          </button>
          <button
            className="min-h-10 rounded-[14px] bg-[#EEF0FA] px-3 text-[13px] font-extrabold text-[#1F2BD8] active:scale-[0.97]"
            onClick={() => navigate(`/school/${school.slug}/register`)}
          >
            Регистрация
          </button>
        </header>

        <section className="flex flex-1 flex-col justify-center py-6">
          <div className="rounded-[28px] border border-[#EBECF0] bg-white p-5 shadow-[0_18px_48px_rgba(15,20,25,0.07)]" onKeyDown={handleKeyDown}>
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-[18px] bg-[#EEF0FA] text-[#1F2BD8]">
              <Building size={23} />
            </div>
            <h1 className="text-[34px] font-black leading-[1.02] tracking-[-0.03em] text-[#050609]">Вход ученика</h1>
            <p className="mt-3 text-[15px] font-semibold leading-6 text-[#8B8D94]">
              Откройте занятия, документы и историю записей автошколы.
            </p>

            <div className="mt-6 space-y-4">
              <PhoneInput label="Телефон" value={phone} error={error && !isValidRussianPhone(phone) ? error : ''} onChange={(value) => { setError(''); setPhone(value) }} autoFocus />
              <Input label="Пароль" type="password" value={password} error={error && isValidRussianPhone(phone) ? error : ''} placeholder="Ваш пароль" autoComplete="current-password" onChange={(event) => { setError(''); setPassword(event.target.value) }} />
            </div>

            <Button size="lg" className="mt-5 w-full min-h-[56px] rounded-[18px] bg-[#1F2BD8] text-[16px] hover:bg-[#1824C6]" disabled={submitting || !isValidRussianPhone(phone) || password.trim().length < 6} onClick={() => void submit()}>
              {submitting ? 'Проверяем...' : 'Войти'}
              <ArrowRight size={18} />
            </Button>
            <button
              type="button"
              className="mt-3 w-full rounded-[16px] bg-[#F5F6FA] px-3 py-3 text-[13px] font-extrabold text-[#8B8D94]"
              onClick={() => setError('Для восстановления доступа обратитесь в автошколу.')}
            >
              Забыли пароль?
            </button>
            <p className="mt-5 text-center text-[12px] font-semibold leading-5 text-[#8B8D94]">
              Продолжая, вы принимаете <a className="font-extrabold text-[#050609]" href="/terms">условия сервиса</a> и <a className="font-extrabold text-[#050609]" href="/privacy">политику конфиденциальности</a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
