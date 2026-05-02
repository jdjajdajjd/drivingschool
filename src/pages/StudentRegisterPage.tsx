import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CarFront, Clock3 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PhoneInput } from '../components/ui/PhoneInput'
import { isValidRussianPhone } from '../services/bookingService'
import { db } from '../services/storage'
import { findAnyStudentProfile, saveStudentProfile, type StudentProfile } from '../services/studentProfile'

void React

type RegisterErrors = {
  name?: string
  phone?: string
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[1] || value.trim().split(/\s+/)[0] || 'ученик'
}

export default function StudentRegisterPage() {
  const navigate = useNavigate()
  const [existingProfile, setExistingProfile] = useState<StudentProfile | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const school = useMemo(() => db.schools.bySlug('virazh') ?? db.schools.all()[0] ?? null, [])
  const canSubmit = name.trim().split(/\s+/).length >= 2 && isValidRussianPhone(phone)

  useEffect(() => {
    const found = findAnyStudentProfile()
    if (!found) return

    setExistingProfile(found.profile)
    setName(found.profile.name)
    setPhone(found.profile.phone.replace(/^7/, '').slice(0, 10))
  }, [])

  function validate() {
    const next: RegisterErrors = {}
    const parts = name.trim().split(/\s+/).filter(Boolean)

    if (parts.length < 2) next.name = 'Введите фамилию и имя.'
    if (!isValidRussianPhone(phone)) next.phone = 'Введите корректный номер телефона.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!school || !validate()) return

    setSubmitting(true)
    window.setTimeout(() => {
      saveStudentProfile(school.id, { name, phone })
      navigate('/student')
    }, 260)
  }

  return (
    <div className="min-h-dvh overflow-hidden bg-[#F2F3F7] text-[#101216]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-6 pt-5">
        <div className="flex items-center justify-between">
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
              className="rounded-full bg-white px-3 py-2 text-[13px] font-extrabold text-[#2436D9] shadow-[0_8px_22px_rgba(15,20,25,0.08)] active:scale-[0.97]"
              onClick={() => navigate('/student')}
            >
              Войти
            </button>
          ) : null}
        </div>

        <section className="flex flex-1 flex-col justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="rounded-[32px] bg-white p-5 shadow-[0_22px_60px_rgba(18,24,38,0.10)]"
          >
            <div className="mb-6">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#EFF2FF] px-3 py-2 text-[12px] font-extrabold text-[#2436D9]">
                <Clock3 size={14} />
                Регистрация занимает меньше минуты
              </div>
              <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[#101216]">
                {existingProfile ? `С возвращением, ${firstName(existingProfile.name)}` : 'Создайте кабинет ученика'}
              </h1>
              <p className="mt-3 text-[15px] font-semibold leading-6 text-[#727985]">
                Укажите ФИО и телефон. После этого откроется кабинет ученика.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="ФИО"
                value={name}
                error={errors.name}
                placeholder="Иванова Анна Михайловна"
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
              />
              <PhoneInput
                label="Телефон"
                value={phone}
                error={errors.phone}
                onChange={setPhone}
                autoFocus={!existingProfile}
              />
              <Button
                className="mt-2 h-13 w-full rounded-[16px] bg-[#2436D9] shadow-[0_16px_34px_rgba(36,54,217,0.28)] hover:bg-[#1D2CC4]"
                disabled={submitting || !canSubmit}
                onClick={handleSubmit}
              >
                {submitting ? 'Открываем кабинет...' : 'Открыть кабинет'}
                <ArrowRight size={17} />
              </Button>
            </div>
          </motion.div>

        </section>
      </main>
    </div>
  )
}
