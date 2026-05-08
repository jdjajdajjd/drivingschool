import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft01Icon, ArrowRight01Icon, Building05Icon, CheckmarkCircle02Icon, Login03Icon, User03Icon } from '@hugeicons/core-free-icons'
import { Button } from '../components/ui/Button'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { isValidRussianPhone } from '../services/bookingService'
import { findSchoolBySlugAcrossNamespaces } from '../services/storage'
import { findAnyStudentProfile, saveStudentCredentials, saveStudentProfile, saveStudentProfileToSupabase, type StudentProfile } from '../services/studentProfile'
import { isSupabaseConfigured } from '../lib/supabase'
import type { School } from '../types'

void React

const ArrowLeft = createHugeIcon(ArrowLeft01Icon)
const ArrowRight = createHugeIcon(ArrowRight01Icon)
const Building = createHugeIcon(Building05Icon)
const Check = createHugeIcon(CheckmarkCircle02Icon)
const Login = createHugeIcon(Login03Icon)
const UserRound = createHugeIcon(User03Icon)

type RegisterStep = 'lastName' | 'firstName' | 'middleName' | 'phone' | 'password' | 'success'

const steps: RegisterStep[] = ['lastName', 'firstName', 'middleName', 'phone', 'password']
const draftKey = 'vroom:student_register_draft'
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

function stepIndex(step: RegisterStep) {
  return Math.max(0, steps.indexOf(step))
}

function isNamePartValid(value: string) {
  return /^[А-Яа-яЁёA-Za-z][А-Яа-яЁёA-Za-z\s-]{1,}$/.test(value.trim())
}

function cleanNamePart(value: string) {
  return value.replace(/[^А-Яа-яЁёA-Za-z\s-]/g, '').replace(/\s{2,}/g, ' ')
}

export default function StudentRegisterPage() {
  const navigate = useNavigate()
  const { slug = 'virazh' } = useParams<{ slug?: string }>()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [existingProfile, setExistingProfile] = useState<StudentProfile | null>(null)
  const [step, setStep] = useState<RegisterStep>('lastName')
  const [lastName, setLastName] = useState('')
  const [first, setFirst] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const school = useMemo(() => findSchoolBySlugAcrossNamespaces(slug) ?? fallbackSchool, [slug])
  const currentIndex = stepIndex(step)
  const progress = step === 'success' ? 100 : Math.round(((currentIndex + 1) / steps.length) * 100)
  const fullName = [lastName, first, middleName].map((part) => part.trim()).filter(Boolean).join(' ')

  useEffect(() => {
    const found = findAnyStudentProfile()
    if (!found) {
      try {
        const draftStorage = isSupabaseConfigured() ? sessionStorage : localStorage
        const draft = JSON.parse(draftStorage.getItem(draftKey) ?? '{}') as Partial<Record<'lastName' | 'first' | 'middleName' | 'phone', string>>
        setLastName(draft.lastName ?? '')
        setFirst(draft.first ?? '')
        setMiddleName(draft.middleName ?? '')
        setPhone(draft.phone ?? '')
      } catch {
        // Ignore invalid draft data.
      }
      return
    }

    const parts = found.profile.name.trim().split(/\s+/).filter(Boolean)
    setExistingProfile(found.profile)
    setLastName(parts[0] ?? '')
    setFirst(parts[1] ?? '')
    setMiddleName(parts.slice(2).join(' '))
    setPhone(found.profile.phone.replace(/^7/, '').slice(0, 10))
  }, [])

  useEffect(() => {
    const draftStorage = isSupabaseConfigured() ? sessionStorage : localStorage
    draftStorage.setItem(draftKey, JSON.stringify({ lastName, first, middleName, phone }))
  }, [first, lastName, middleName, phone])

  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus(), 120)
  }, [step])

  function goBack() {
    setError('')
    if (step === 'firstName') setStep('lastName')
    else if (step === 'middleName') setStep('firstName')
    else if (step === 'phone') setStep('middleName')
    else if (step === 'password') setStep('phone')
  }

  function next() {
    setError('')

    if (step === 'lastName') {
      if (!isNamePartValid(lastName)) {
        setError('Введите фамилию.')
        return
      }
      setStep('firstName')
      return
    }

    if (step === 'firstName') {
      if (!isNamePartValid(first)) {
        setError('Введите имя.')
        return
      }
      setStep('middleName')
      return
    }

    if (step === 'middleName') {
      if (middleName.trim() && !isNamePartValid(middleName)) {
        setError('Проверьте отчество или пропустите шаг.')
        return
      }
      setStep('phone')
      return
    }

    if (step === 'phone') {
      if (!isValidRussianPhone(phone)) {
        setError('Введите корректный номер телефона.')
        return
      }
      setStep('password')
      return
    }

    if (step === 'password') {
      void submit()
    }
  }

  async function submit() {
    if (submitting) return
    if (!isNamePartValid(lastName) || !isNamePartValid(first)) {
      setError('Введите фамилию и имя.')
      setStep(!isNamePartValid(lastName) ? 'lastName' : 'firstName')
      return
    }
    if (!isValidRussianPhone(phone)) {
      setError('Введите корректный номер телефона.')
      setStep('phone')
      return
    }
    if (password.trim().length < 6) {
      setError('Пароль должен быть не короче 6 символов.')
      return
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.')
      return
    }
    if (!acceptedTerms) {
      setError('Подтвердите согласие с условиями и политикой.')
      return
    }

    setSubmitting(true)
    try {
      if (isSupabaseConfigured()) {
        await saveStudentProfileToSupabase(school.id, { name: fullName, phone, password }, { passwordSet: true })
      }
      saveStudentProfile(school.id, { name: fullName, phone, password }, { passwordSet: true })
      saveStudentCredentials(phone, password, school.id)
      localStorage.removeItem(draftKey)
      sessionStorage.removeItem(draftKey)
    } catch {
      setSubmitting(false)
      setError('Не удалось сохранить кабинет. Попробуйте ещё раз.')
      return
    }
    setStep('success')
    window.setTimeout(() => navigate('/student'), 950)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    next()
  }

  return (
    <div className="min-h-dvh overflow-hidden bg-[var(--page-bg)] text-[var(--text)]">
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
            {existingProfile ? (
              <button
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--surface)] px-4 text-[13px] font-extrabold text-[var(--accent)] shadow-[var(--shadow-card)] active:scale-[0.97]"
                onClick={() => navigate('/student')}
              >
                <Login size={14} /> Войти
              </button>
            ) : null}
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]"
            onKeyDown={handleKeyDown}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-2 text-[12px] font-extrabold text-[var(--accent)]">
                {step === 'success' ? <Check size={14} /> : <UserRound size={14} />}
                {step === 'success' ? 'Готово' : `${progress}% заполнено`}
              </div>
              {step !== 'success' ? (
                <button className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-3.5 text-[12px] font-extrabold text-[var(--text-muted)]" style={{ minHeight: 40 }} onClick={step === 'lastName' ? () => navigate(`/school/${school.slug}/login`) : goBack}>
                  <ArrowLeft size={14} />
                  {step === 'lastName' ? 'Вход' : 'Назад'}
                </button>
              ) : null}
            </div>

            <div className="mb-6 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]" aria-label={`Прогресс регистрации ${progress}%`}>
              <motion.div className="h-full rounded-full bg-[var(--accent)]" animate={{ width: `${progress}%` }} transition={{ duration: 0.24 }} />
            </div>

            <AnimatePresence mode="wait">
              {step === 'lastName' ? (
                <motion.div key="lastName" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.2 }}>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-2 text-[12px] font-extrabold text-[var(--accent)]">
                    <UserRound size={14} /> Регистрация ученика
                  </div>
                  <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">Введите фамилию</h1>
                  <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-muted)]">Начнём с короткой регистрации ученика. Можно использовать только буквы, пробел и дефис.</p>
                  <div className="mt-6">
                    <Input ref={inputRef} label="Фамилия *" value={lastName} error={error} helperText={!lastName.trim() ? 'Обязательное поле' : undefined} placeholder="Иванов" autoComplete="family-name" onChange={(event) => { setError(''); setLastName(cleanNamePart(event.target.value)) }} />
                  </div>
                  <Button size="lg" className="mt-5 w-full rounded-[18px]" disabled={!isNamePartValid(lastName)} onClick={next}>
                    Дальше
                    <ArrowRight size={18} />
                  </Button>
                </motion.div>
              ) : null}

              {step === 'firstName' ? (
                <motion.div key="firstName" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.2 }}>
                  <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">Теперь имя</h1>
                  <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-muted)]">Так автошкола будет видеть вас в записи.</p>
                  <div className="mt-6">
                    <Input ref={inputRef} label="Имя *" value={first} error={error} helperText={!first.trim() ? 'Обязательное поле' : undefined} placeholder="Иван" autoComplete="given-name" onChange={(event) => { setError(''); setFirst(cleanNamePart(event.target.value)) }} />
                  </div>
                  <Button size="lg" className="mt-5 w-full rounded-[18px]" disabled={!isNamePartValid(first)} onClick={next}>
                    Дальше
                    <ArrowRight size={18} />
                  </Button>
                </motion.div>
              ) : null}

              {step === 'middleName' ? (
                <motion.div key="middleName" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.2 }}>
                  <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">Отчество</h1>
                  <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-muted)]">Если отчества нет или не хотите указывать, пропустите.</p>
                  <div className="mt-6">
                    <Input ref={inputRef} label="Отчество" value={middleName} error={error} helperText="Необязательное поле" placeholder="Сергеевич" autoComplete="additional-name" onChange={(event) => { setError(''); setMiddleName(cleanNamePart(event.target.value)) }} />
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <Button size="lg" variant="secondary" className="rounded-[18px]" onClick={() => { setMiddleName(''); setError(''); setStep('phone') }}>
                      Пропустить
                    </Button>
                    <Button size="lg" className="rounded-[18px]" onClick={next}>
                      Дальше
                    </Button>
                  </div>
                </motion.div>
              ) : null}

              {step === 'phone' ? (
                <motion.div key="phone" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.2 }}>
                  <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">Номер телефона</h1>
                  <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-muted)]">Он нужен автошколе для записи на занятие и входа в кабинет.</p>
                  <div className="mt-6">
                    <PhoneInput label="Телефон *" value={phone} error={error} onChange={(value) => { setError(''); setPhone(value) }} autoFocus />
                  </div>
                  <Button size="lg" className="mt-5 w-full rounded-[18px]" disabled={!isValidRussianPhone(phone)} onClick={next}>
                    Дальше
                    <ArrowRight size={18} />
                  </Button>
                </motion.div>
              ) : null}

              {step === 'password' ? (
                <motion.div key="password" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.2 }}>
                  <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">Пароль для входа</h1>
                  <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-muted)]">Телефон и пароль будут использоваться для входа в кабинет.</p>
                  <div className="mt-6 space-y-3">
                    <Input ref={inputRef} label="Пароль *" type="password" value={password} error={error} helperText="Минимум 6 символов" placeholder="Минимум 6 символов" autoComplete="new-password" onChange={(event) => { setError(''); setPassword(event.target.value) }} />
                    <Input label="Повторите пароль *" type="password" value={confirmPassword} error={password && confirmPassword && password !== confirmPassword ? 'Пароли не совпадают.' : undefined} placeholder="Ещё раз пароль" autoComplete="new-password" onChange={(event) => { setError(''); setConfirmPassword(event.target.value) }} />
                  </div>
                  <label className="mt-4 flex items-start gap-3 rounded-[18px] bg-[var(--surface-muted)] p-3 text-[12px] font-semibold leading-5 text-[var(--text-muted)]">
                    <input className="mt-1 h-4 w-4 accent-[var(--accent)]" type="checkbox" checked={acceptedTerms} onChange={(event) => { setError(''); setAcceptedTerms(event.target.checked) }} />
                    <span>
                      Согласен с <a className="font-extrabold text-[var(--accent)]" href="/terms">условиями сервиса</a> и <a className="font-extrabold text-[var(--accent)]" href="/privacy">политикой конфиденциальности</a>.
                    </span>
                  </label>
                  {error ? <p className="mt-3 rounded-[16px] bg-[#FFEDEF] px-3 py-2 text-[13px] font-semibold text-[#FF3155]">{error}</p> : null}
                  <Button size="lg" className="mt-5 w-full rounded-[18px]" disabled={submitting || password.trim().length < 6 || password !== confirmPassword || !acceptedTerms} onClick={() => void submit()}>
                    {submitting ? 'Создаём...' : 'Создать кабинет'}
                    <ArrowRight size={18} />
                  </Button>
                </motion.div>
              ) : null}

              {step === 'success' ? (
                <motion.div key="success" className="py-5 text-center" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.22 }}>
                  <motion.div className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-[#EAF8F0] text-[#14995B]" initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.28 }}>
                    <Check size={30} />
                  </motion.div>
                  <h1 className="mt-5 text-[30px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">Кабинет создан</h1>
                  <p className="mx-auto mt-3 max-w-[260px] text-[14px] font-semibold leading-5 text-[var(--text-muted)]">Сейчас откроем ваш кабинет ученика.</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </section>
      </main>
    </div>
  )
}
