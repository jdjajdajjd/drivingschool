import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight01Icon, Car03Icon } from '@hugeicons/core-free-icons'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { isValidRussianPhone } from '../services/bookingService'
import { verifyStudentCredentials } from '../services/studentProfile'

void React

const ArrowRight = createHugeIcon(ArrowRight01Icon)
const CarFront = createHugeIcon(Car03Icon)

export default function StudentLoginPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function submit() {
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
    window.setTimeout(() => {
      const result = verifyStudentCredentials(phone, password)
      setSubmitting(false)
      if (!result) {
        setError('Телефон или пароль не совпадают. Если кабинета ещё нет, зарегистрируйтесь.')
        return
      }
      navigate('/student', { replace: true })
    }, 180)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    submit()
  }

  return (
    <div className="min-h-dvh bg-[var(--page-bg)] text-[var(--text)]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-6 pt-5">
        <header className="flex items-center justify-between">
          <button className="flex items-center gap-2.5 text-left" onClick={() => navigate('/')}>
            <div className="grid h-11 w-11 place-items-center rounded-[18px] bg-[var(--accent)] text-white shadow-[0_14px_30px_rgba(36,54,217,0.24)]">
              <CarFront size={22} />
            </div>
            <div>
              <p className="text-[15px] font-black leading-4 tracking-[-0.02em] text-[var(--text)]">vroom</p>
              <p className="text-[12px] font-bold leading-4 text-[var(--text-muted)]">вход ученика</p>
            </div>
          </button>
          <button className="min-h-10 rounded-full bg-[var(--surface)] px-4 text-[13px] font-extrabold text-[var(--accent)] shadow-[var(--shadow-card)] active:scale-[0.97]" onClick={() => navigate('/student/register')}>
            Регистрация
          </button>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]" onKeyDown={handleKeyDown}>
            <div className="mb-5 inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-2 text-[12px] font-extrabold text-[var(--accent)]">
              Телефон + пароль
            </div>
            <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">Войдите в кабинет</h1>
            <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-muted)]">
              Используйте телефон и пароль, который задали при регистрации.
            </p>

            <div className="mt-6 space-y-4">
              <PhoneInput label="Телефон" value={phone} error={error && !isValidRussianPhone(phone) ? error : ''} onChange={(value) => { setError(''); setPhone(value) }} autoFocus />
              <Input label="Пароль" type="password" value={password} error={error && isValidRussianPhone(phone) ? error : ''} placeholder="Ваш пароль" autoComplete="current-password" onChange={(event) => { setError(''); setPassword(event.target.value) }} />
            </div>

            <Button size="lg" className="mt-5 w-full rounded-[18px]" disabled={submitting || !isValidRussianPhone(phone) || password.trim().length < 6} onClick={submit}>
              {submitting ? 'Входим...' : 'Войти'}
              <ArrowRight size={18} />
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
