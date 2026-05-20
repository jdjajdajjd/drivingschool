import { useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import {
  AccessRole,
  ADMIN_LOGIN_PATH,
  WORKSPACE_ADMIN_LOGIN_PATH,
  SUPERADMIN_LOGIN_PATH,
  canUseLegacyAccess,
  clearAccess,
  getAccessSecret,
  getLegacyAccessConfig,
  getWorkspaceStaffContext,
  grantAccess,
  isAccessGranted,
  isLegacyAccessConfigured,
} from '../../services/accessControl'
import { isSupabaseRemoteConfigured } from '../../lib/supabase'
import { verifySupabaseStaffSession } from '../../services/staffSessionService'
import { setDataNamespace } from '../../services/storage'
import { LoadingScreen } from '../ui/loader'

interface ProtectedAccessProps {
  role: AccessRole
  mode?: 'demo' | 'workspace'
}

export function ProtectedAccess({ role, mode = 'demo' }: ProtectedAccessProps) {
  if (role === 'admin') setDataNamespace(mode)

  const demoAdminAccess = role === 'admin' && mode === 'demo'
  if (demoAdminAccess && !isAccessGranted(role)) {
    grantAccess(role)
  }

  const loginPath = role === 'admin'
    ? (mode === 'workspace' ? WORKSPACE_ADMIN_LOGIN_PATH : ADMIN_LOGIN_PATH)
    : SUPERADMIN_LOGIN_PATH
  const shouldVerifyRemoteSession = useMemo(
    () => isSupabaseRemoteConfigured() && (role === 'superadmin' || mode === 'workspace'),
    [mode, role],
  )
  const accessGranted = demoAdminAccess || isAccessGranted(role)
  const [remoteSessionState, setRemoteSessionState] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')

  useEffect(() => {
    if (!accessGranted) return

    const accessSecret = getAccessSecret(role)
    const legacyAccess = getLegacyAccessConfig(role)
    const isLegacySession =
      canUseLegacyAccess() &&
      isLegacyAccessConfigured(role) &&
      Boolean(accessSecret) &&
      accessSecret === legacyAccess.password

    if (!shouldVerifyRemoteSession) {
      setRemoteSessionState('valid')
      return
    }

    if (isLegacySession) {
      setRemoteSessionState('valid')
      return
    }

    let disposed = false
    setRemoteSessionState('checking')

    const workspaceRole = getWorkspaceStaffContext().role
    const staffRole = role === 'admin' && mode === 'workspace'
      ? workspaceRole
      : role
    verifySupabaseStaffSession(staffRole, accessSecret).then((isValid) => {
      if (disposed) return
      if (!isValid) {
        clearAccess(role)
        setRemoteSessionState('invalid')
        return
      }
      setRemoteSessionState('valid')
    })

    return () => {
      disposed = true
    }
  }, [accessGranted, mode, role, shouldVerifyRemoteSession])

  if (!accessGranted) {
    return <Navigate to={loginPath} replace />
  }

  if (remoteSessionState === 'checking' || remoteSessionState === 'idle') {
    return <LoadingScreen tone={role === 'admin' ? 'admin' : 'student'} label="Проверка доступа" />
  }

  if (remoteSessionState === 'invalid') {
    return <Navigate to={loginPath} replace />
  }

  return <Outlet />
}
