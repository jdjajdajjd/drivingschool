import { FormEvent, useState } from 'react'
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { AccessRole, getAccessConfig, grantAccess, isAccessGranted } from '../services/accessControl'

interface StaffLoginPageProps {
  role: AccessRole
}

const copy = {
  admin: {
    title: 'Вход администратора',
    subtitle: 'Панель автошколы открывается только после входа.',
    badge: 'Автошкола Вираж',
  },
  superadmin: {
    title: 'Вход супер-админа',
    subtitle: 'Служебный раздел платформы скрыт от публичных страниц.',
    badge: 'DriveDesk Core',
  },
}

export function StaffLoginPage({ role }: StaffLoginPageProps) {
  const navigate = useNavigate()
  const config = getAccessConfig(role)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isAccessGranted(role)) {
    return <Navigate to={config.redirect} replace />
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (login.trim() !== config.login || password !== config.password) {
      setError('Логин или пароль не подошли')
      return
    }
    grantAccess(role, password)
    navigate(config.redirect, { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] px-4 py-6 text-stone-900">
      <main className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center">
        <form onSubmit={submit} className="w-full rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-stone-950 text-white shadow-soft">
              {role === 'admin' ? <LockKeyhole size={24} /> : <ShieldCheck size={24} />}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">{copy[role].badge}</p>
              <h1 className="mt-1 text-2xl font-semibold">{copy[role].title}</h1>
            </div>
          </div>

          <p className="mt-4 text-base leading-relaxed text-stone-500">{copy[role].subtitle}</p>

          <div className="mt-7 space-y-4">
            <Input
              label="Логин"
              value={login}
              onChange={(event) => {
                setLogin(event.target.value)
                setError('')
              }}
              placeholder="Введите логин"
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
              error={error}
            />
          </div>

          <Button type="submit" size="lg" className="mt-7 w-full min-h-14 text-lg">
            Войти
            <ArrowRight size={20} />
          </Button>
        </form>
      </main>
    </div>
  )
}
