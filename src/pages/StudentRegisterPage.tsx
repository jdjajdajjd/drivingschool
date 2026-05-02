import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CarFront, Check, UserRound } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { isValidRussianPhone } from '../services/bookingService'
import { db } from '../services/storage'
import { findAnyStudentProfile, saveStudentProfile, type StudentProfile } from '../services/studentProfile'

void React

type RegisterStep = 'lastName' | 'firstName' | 'middleName' | 'phone' | 'success'

const steps: RegisterStep[] = ['lastName', 'firstName', 'middleName', 'phone']

function stepIndex(step: RegisterStep) {
  return Math.max(0, steps.indexOf(step))
}

function isNamePartValid(value: string) {
  return value.trim().replace(/[-\s]/g, '').length >= 2
}

export default function StudentRegisterPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [existingProfile, setExistingProfile] = useState<StudentProfile | null>(null)
  const [step, setStep] = useState<RegisterStep>('lastName')
  const [lastName, setLastName] = useState('')
  const [first, setFirst] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const school = useMemo(() => db.schools.bySlug('virazh') ?? db.schools.all()[0] ?? null, [])
  const currentIndex = stepIndex(step)
  const progress = step === 'success' ? 100 : Math.round(((currentIndex + 1) / steps.length) * 100)
  const fullName = [lastName, first, middleName].map((part) => part.trim()).filter(Boolean).join(' ')

  useEffect(() => {
    const found = findAnyStudentProfile()
    if (!found) return

    const parts = found.profile.name.trim().split(/\s+/).filter(Boolean)
    setExistingProfile(found.profile)
    setLastName(parts[0] ?? '')
    setFirst(parts[1] ?? '')
    setMiddleName(parts.slice(2).join(' '))
    setPhone(found.profile.phone.replace(/^7/, '').slice(0, 10))
  }, [])

  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus(), 120)
  }, [step])

  function goBack() {
    setError('')
    if (step === 'firstName') setStep('lastName')
    else if (step === 'middleName') setStep('firstName')
    else if (step === 'phone') setStep('middleName')
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
      void submit()
    }
  }

  async function submit() {
    if (!school || submitting) return
    if (!isNamePartValid(lastName) || !isNamePartValid(first)) {
      setError('Введите фамилию и имя.')
      setStep(!isNamePartValid(lastName) ? 'lastName' : 'firstName')
      return
    }
    if (!isValidRussianPhone(phone)) {
      setError('Введите корректный номер телефона.')
      return
    }

    setSubmitting(true)
    saveStudentProfile(school.id, { name: fullName, phone })
    setStep('success')
    window.setTimeout(() => navigate('/student'), 950)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    next()
  }

  return (
    <div className="min-h-dvh overflow-hidden bg-[#F2F3F7] text-[#101216]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-6 pt-5">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-11 w-11 place-items-center rounded-[18px] bg-[#2436D9] text-white shadow-[0_14px_30px_rgba(36,54,217,0.24)]">
              <CarFront size={22} />
            </div>
            <div>
              <p className="text-[13px] font-extrabold leading-4 text-[#101216]">vroom</p>
              <p className="text-[12px] font-semibold leading-4 text-[#8B929C]">кабинет ученика</p>
            </div>
          </div>
          {existingProfile ? (
            <button
              className="min-h-10 rounded-full bg-white px-4 text-[13px] font-extrabold text-[#2436D9] shadow-[0_8px_22px_rgba(15,20,25,0.08)] active:scale-[0.97]"
              onClick={() => navigate('/student')}
            >
              Войти
            </button>
          ) : null}
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-[32px] bg-white p-5 shadow-[0_22px_60px_rgba(18,24,38,0.10)]"
            onKeyDown={handleKeyDown}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EFF2FF] px-3 py-2 text-[12px] font-extrabold text-[#2436D9]">
                {step === 'success' ? <Check size={14} /> : <UserRound size={14} />}
                {step === 'success' ? 'Готово' : `Шаг ${currentIndex + 1} из ${steps.length}`}
              </div>
              {step !== 'lastName' && step !== 'success' ? (
                <button className="inline-flex items-center gap-1 rounded-full bg-[#F4F5F6] px-3.5 text-[12px] font-extrabold text-[#727985]" style={{ minHeight: 40 }} onClick={goBack}>
                  <ArrowLeft size={14} />
                  Назад
                </button>
              ) : null}
            </div>

            <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-[#EEF0F5]">
              <motion.div className="h-full rounded-full bg-[#2436D9]" animate={{ width: `${progress}%` }} transition={{ duration: 0.24 }} />
            </div>

            <AnimatePresence mode="wait">
              {step === 'lastName' ? (
                <motion.div key="lastName" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.2 }}>
                  <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[#101216]">Введите фамилию</h1>
                  <p className="mt-3 text-[15px] font-semibold leading-6 text-[#727985]">Начнём с короткой регистрации ученика.</p>
                  <div className="mt-6">
                    <Input ref={inputRef} label="Фамилия" value={lastName} error={error} placeholder="Иванов" autoComplete="family-name" onChange={(event) => setLastName(event.target.value)} />
                  </div>
                  <Button size="lg" className="mt-5 w-full rounded-[18px]" disabled={!lastName.trim()} onClick={next}>
                    Дальше
                    <ArrowRight size={18} />
                  </Button>
                </motion.div>
              ) : null}

              {step === 'firstName' ? (
                <motion.div key="firstName" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.2 }}>
                  <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[#101216]">Теперь имя</h1>
                  <p className="mt-3 text-[15px] font-semibold leading-6 text-[#727985]">Так автошкола будет видеть вас в записи.</p>
                  <div className="mt-6">
                    <Input ref={inputRef} label="Имя" value={first} error={error} placeholder="Иван" autoComplete="given-name" onChange={(event) => setFirst(event.target.value)} />
                  </div>
                  <Button size="lg" className="mt-5 w-full rounded-[18px]" disabled={!first.trim()} onClick={next}>
                    Дальше
                    <ArrowRight size={18} />
                  </Button>
                </motion.div>
              ) : null}

              {step === 'middleName' ? (
                <motion.div key="middleName" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.2 }}>
                  <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[#101216]">Отчество</h1>
                  <p className="mt-3 text-[15px] font-semibold leading-6 text-[#727985]">Если отчества нет или не хотите указывать, пропустите.</p>
                  <div className="mt-6">
                    <Input ref={inputRef} label="Отчество" value={middleName} error={error} placeholder="Сергеевич" autoComplete="additional-name" onChange={(event) => setMiddleName(event.target.value)} />
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
                  <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[#101216]">Номер телефона</h1>
                  <p className="mt-3 text-[15px] font-semibold leading-6 text-[#727985]">Он нужен автошколе для записи на занятие.</p>
                  <div className="mt-6">
                    <PhoneInput label="Телефон" value={phone} error={error} onChange={setPhone} autoFocus />
                  </div>
                  <Button size="lg" className="mt-5 w-full rounded-[18px]" disabled={submitting || !isValidRussianPhone(phone)} onClick={() => void submit()}>
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
                  <h1 className="mt-5 text-[30px] font-black leading-[1.05] tracking-[-0.03em] text-[#101216]">Кабинет создан</h1>
                  <p className="mx-auto mt-3 max-w-[260px] text-[14px] font-semibold leading-5 text-[#727985]">Сейчас откроем ваш кабинет ученика.</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </section>
      </main>
    </div>
  )
}
