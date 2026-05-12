import { FormEvent, useState } from 'react'
import { ArrowRight01Icon, LockKeyIcon, Shield01Icon } from '@hugeicons/core-free-icons'
import { Navigate, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/layout/BrandMark'
import { Button } from '../components/ui/Button'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { Input } from '../components/ui/Input'
import { AccessRole, getAccessConfig, grantAccess, isAccessGranted } from '../services/accessControl'
import { setDataNamespace } from '../services/storage'

const ArrowRight = createHugeIcon(ArrowRight01Icon)
const LockKeyhole = createHugeIcon(LockKeyIcon)
const ShieldCheck = createHugeIcon(Shield01Icon)

interface StaffLoginPageProps {
  role: AccessRole
  mode?: 'demo' | 'workspace'
}

const copy = {
  admin: {
    title: 'Кабинет школы',
    subtitle: 'Войдите, чтобы управлять расписанием, учениками, оплатами и работой инструкторов.',
    badge: 'Автошкола «Вираж»',
    icon: LockKeyhole,
  },
  superadmin: {
    title: 'Центр управления vroom',
    subtitle: 'Служебный доступ для команды платформы.',
    badge: 'vroom',
    icon: ShieldCheck,
  },
}

export function StaffLoginPage({ role, mode = 'demo' }: StaffLoginPageProps) {
  const navigate = useNavigate()
  const config = getAccessConfig(role)
  const Icon = copy[role].icon
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  setDataNamespace(mode)

  if (isAccessGranted(role)) {
    return <Navigate to={config.redirect} replace />
  }

  function openDemo(): void {
    if (role !== 'admin') return
    setDataNamespace(mode)
    grantAccess(role, config.password)
    navigate(config.redirect, { replace: true })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (login.trim() !== config.login || password !== config.password) {
      setError('Проверьте логин и пароль.')
      return
    }
    setDataNamespace(mode)
    grantAccess(role, password)
    navigate(config.redirect, { replace: true })
  }

  const isWorkspaceDemo = role === 'admin' && mode === 'workspace'

  return (
    <div className="min-h-dvh bg-[#F6F7FA] px-4 py-4 text-[#050609]">
      <main className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[430px] items-center">
        <form onSubmit={submit} className="w-full rounded-[28px] border border-[#EBECF0] bg-white p-5 shadow-[0_18px_48px_rgba(15,20,25,0.07)] sm:p-6">
          <BrandMark size="md" className="mb-6" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-[#EEF0FA] text-[#1F2BD8]">
                <Icon size={24} />
              </span>
              <div>
                <p className="text-[12px] font-black uppercase leading-4 tracking-[0.08em] text-[#A5A7AE]">{copy[role].badge}</p>
                <h1 className="mt-1 text-[30px] font-black leading-[1.02] tracking-[-0.03em] text-[#050609]">
                  {copy[role].title}
                </h1>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[15px] font-bold leading-6 text-[#8B8D94]">
            {isWorkspaceDemo
              ? 'Можно сразу открыть кабинет и посмотреть день, учеников и оплаты.'
              : copy[role].subtitle}
          </p>

          <div className="mt-6 space-y-4">
            <Input
              label="Логин"
              value={login}
              onChange={(event) => {
                setLogin(event.target.value)
                setError('')
              }}
              placeholder="Введите логин"
              autoComplete="username"
            />
            <Input
              label="Пароль"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              placeholder="Введите пароль"
              autoComplete="current-password"
              error={error}
            />
          </div>

          {role === 'admin' ? (
            <Button type="button" size="lg" className="mt-6 w-full min-h-[56px] rounded-[17px] bg-[#1F2BD8] text-[16px] shadow-[0_16px_34px_rgba(31,43,216,0.20)] hover:bg-[#1722C2]" onClick={openDemo}>
              Открыть кабинет школы
              <ArrowRight size={20} />
            </Button>
          ) : null}

          <Button type="submit" size="lg" variant={role === 'admin' ? 'secondary' : 'primary'} className="mt-3 w-full min-h-[56px] rounded-[17px] text-[16px]">
            Войти с логином
            <ArrowRight size={20} />
          </Button>
        </form>
      </main>
    </div>
  )
}
