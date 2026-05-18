import { FormEvent, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Spinner as LoaderCircle, LockKey, ShieldCheck } from '@phosphor-icons/react'
const LockKeyhole = LockKey
import { BrandMark } from '../components/layout/BrandMark'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import {
  AccessRole,
  ADMIN_BASE_PATH,
  DEMO_ADMIN_BASE_PATH,
  grantAccess,
  isAccessConfigured,
  isAccessGranted,
  getLegacyAccessConfig,
  isLegacyAccessConfigured,
  SUPERADMIN_BASE_PATH,
  setWorkspaceStaffContext,
} from '../services/accessControl'
import { openSupabaseStaffSession } from '../services/staffSessionService'
import { setDataNamespace } from '../services/storage'
import { syncSupabaseSchoolToLocalDb } from '../services/supabaseSync'

interface StaffLoginPageProps {
  role: AccessRole
  mode?: 'demo' | 'workspace'
}

const copy = {
  admin: {
    title: 'Кабинет школы',
    subtitle: 'Управление расписанием, учениками, оплатами и работой инструкторов.',
    badge: 'Автошкола',
    Icon: LockKeyhole,
  },
  superadmin: {
    title: 'Операторский вход',
    subtitle: 'Внутреннее управление школами, доступами и рабочими пространствами vroom.',
    badge: 'закрытый доступ',
    Icon: ShieldCheck,
  },
}

export function StaffLoginPage({ role, mode = 'demo' }: StaffLoginPageProps) {
  const navigate = useNavigate()
  const { Icon } = copy[role]
  const isDemoAdmin = role === 'admin' && mode === 'demo'
  const remoteAccessReady = isAccessConfigured(role, mode)
  const legacyAccess = getLegacyAccessConfig(role)
  const redirect = role === 'admin' ? (mode === 'demo' ? DEMO_ADMIN_BASE_PATH : ADMIN_BASE_PATH) : SUPERADMIN_BASE_PATH

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setDataNamespace(mode)
  }, [mode])

  if (isAccessGranted(role)) {
    return <Navigate to={redirect} replace />
  }

  function openDemo(): void {
    if (!isDemoAdmin) return
    setDataNamespace('demo')
    grantAccess(role)
    navigate(redirect, { replace: true })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (isDemoAdmin) {
      openDemo()
      return
    }

    if (!remoteAccessReady) {
      setError('Боевой вход пока не подключён к Supabase.')
      return
    }

    if (!login.trim() || !password.trim()) {
      setError('Введите логин и пароль.')
      return
    }

    try {
      setPending(true)
      setDataNamespace(mode)
      const canUseLegacyAccess = role !== 'admin' || mode === 'demo'
      if (canUseLegacyAccess && isLegacyAccessConfigured(role) && login.trim() === legacyAccess.login && password.trim() === legacyAccess.password) {
        grantAccess(role, password.trim())
      } else {
        const session = await openSupabaseStaffSession(role, login, password.trim())
        if (role === 'admin' && session.staffContext) {
          setWorkspaceStaffContext(session.staffContext)
        }
        grantAccess(role, session.sessionToken)
        if (role === 'admin' && session.staffContext?.schoolId) {
          await syncSupabaseSchoolToLocalDb({ schoolId: session.staffContext.schoolId })
        }
      }
      navigate(redirect, { replace: true })
    } catch (authError) {
      setError(authError instanceof Error && authError.message.includes('Staff access denied') ? 'Логин или пароль не совпадают. Проверьте логин из карточки школы и последний сохранённый пароль.' : authError instanceof Error ? authError.message : 'Не удалось войти. Проверьте логин и пароль.')
    } finally {
      setPending(false)
    }
  }

  const helperText = isDemoAdmin
    ? 'Это безопасная демо-админка. Её можно показывать, переключать и сбрасывать без риска для рабочих данных.'
    : role === 'admin'
      ? 'Это рабочий вход для реальной автошколы. После входа откроется живой кабинет школы.'
      : copy[role].subtitle

  return (
    <div className="min-h-dvh bg-[#F3F7FB] px-4 py-4 text-[#111827]">
      <main className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[430px] items-center">
        <form
          onSubmit={submit}
          className="w-full rounded-[30px] border border-white/70 bg-white/72 p-5 shadow-[0_20px_58px_rgba(32,45,62,0.08)] backdrop-blur-2xl sm:p-6"
        >
          <BrandMark size="md" className="mb-6" />

          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#EAF4FF] text-[#315A7C]">
              <Icon size={23} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-normal leading-4 text-[#687381]">
                {isDemoAdmin ? 'Демо автошколы' : copy[role].badge}
              </p>
              <h1 className="mt-1 text-[30px] font-semibold leading-[1.04] text-[#111827]">
                {copy[role].title}
              </h1>
            </div>
          </div>

          <p className="mt-5 text-[15px] font-normal leading-6 text-[#687381]">{helperText}</p>

          {isDemoAdmin ? (
            <Button
              type="button"
              size="lg"
              className="mt-6 w-full min-h-[56px] rounded-full text-[16px]"
              onClick={openDemo}
            >
              Открыть демо-админку
              <ArrowRight size={20} />
            </Button>
          ) : (
            <>
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
                <p className="mt-3 text-[13px] font-normal leading-5 text-[#7A8794]">
                  Демо и рабочая школа разделены. Этот вход открывает только рабочий кабинет школы.
                </p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                variant={role === 'admin' ? 'secondary' : 'primary'}
                className="mt-6 w-full min-h-[56px] rounded-full text-[16px]"
                disabled={pending}
              >
                {pending ? (
                  <>
                    <LoaderCircle className="animate-spin" size={20} />
                    Входим…
                  </>
                ) : (
                  <>
                    Войти
                    <ArrowRight size={20} />
                  </>
                )}
              </Button>

              {error ? (
                <p className="mt-3 rounded-[18px] border border-[#F5D0D0] bg-[#FFF6F6] px-4 py-3 text-[13px] font-normal text-[#B42318]">
                  {error}
                </p>
              ) : null}
            </>
          )}
        </form>
      </main>
    </div>
  )
}
