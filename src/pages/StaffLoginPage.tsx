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
    <div className="min-h-dvh bg-[#F5F1EA] px-4 py-4 text-[#15120E]">
      <main className="mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-[980px] items-center gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(390px,0.72fr)]">
        <section className="hidden rounded-[28px] border border-[rgba(21,18,14,0.08)] bg-[#15120E] p-7 text-white shadow-[0_24px_70px_rgba(21,18,14,0.18)] lg:block">
          <div className="flex items-center gap-3">
            <BrandMark variant="light" size="md" className="bg-[#15120E]" />
            <div>
              <p className="text-[17px] font-black leading-5 text-white">vroom</p>
              <p className="text-[12px] font-extrabold leading-4 text-white/54">рабочий пульт автошколы</p>
            </div>
          </div>
          <h2 className="mt-12 max-w-[420px] text-[48px] font-black leading-[0.98] tracking-[-0.04em] text-white">
            День, деньги и проблемы на одном экране.
          </h2>
          <div className="mt-8 grid gap-2">
            {['занятия на сегодня', 'долги и оплаты', 'свободное время инструкторов'].map((item) => (
              <div key={item} className="flex min-h-12 items-center gap-3 rounded-[15px] bg-white/[0.07] px-3 text-[14px] font-extrabold text-white/78">
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white text-[#15120E]">
                  <ArrowRight size={15} />
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={submit} className="w-full rounded-[26px] border border-[rgba(21,18,14,0.08)] bg-white p-5 shadow-[0_24px_70px_rgba(63,46,28,0.10)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-[#15120E] text-white">
                <Icon size={24} />
              </span>
              <div>
                <p className="text-[12px] font-black uppercase leading-4 tracking-[0.08em] text-[#8A7D72]">{copy[role].badge}</p>
                <h1 className="mt-1 text-[30px] font-black leading-[1.02] tracking-[-0.03em] text-[#15120E]">
                  {copy[role].title}
                </h1>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[15px] font-bold leading-6 text-[#6F655C]">
            {isWorkspaceDemo
              ? 'Можно сразу открыть демо и посмотреть, как школа ведёт день, записи и оплаты.'
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
            <Button type="button" size="lg" className="mt-6 w-full min-h-[56px] rounded-[17px] bg-[#15120E] text-[16px] hover:bg-black" onClick={openDemo}>
              Открыть демо для школы
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
