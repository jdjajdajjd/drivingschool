import { Navigate, Outlet } from 'react-router-dom'
import { AccessRole, ADMIN_LOGIN_PATH, WORKSPACE_ADMIN_LOGIN_PATH, SUPERADMIN_LOGIN_PATH, isAccessGranted } from '../../services/accessControl'
import { setDataNamespace } from '../../services/storage'

interface ProtectedAccessProps {
  role: AccessRole
  mode?: 'demo' | 'workspace'
}

export function ProtectedAccess({ role, mode = 'demo' }: ProtectedAccessProps) {
  if (role === 'admin') setDataNamespace(mode)

  if (!isAccessGranted(role)) {
    return <Navigate to={role === 'admin' ? (mode === 'workspace' ? WORKSPACE_ADMIN_LOGIN_PATH : ADMIN_LOGIN_PATH) : SUPERADMIN_LOGIN_PATH} replace />
  }

  return <Outlet />
}
