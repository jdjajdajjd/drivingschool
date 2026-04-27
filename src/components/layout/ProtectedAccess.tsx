import { Navigate, Outlet } from 'react-router-dom'
import { AccessRole, ADMIN_LOGIN_PATH, SUPERADMIN_LOGIN_PATH, isAccessGranted } from '../../services/accessControl'

interface ProtectedAccessProps {
  role: AccessRole
}

export function ProtectedAccess({ role }: ProtectedAccessProps) {
  if (!isAccessGranted(role)) {
    return <Navigate to={role === 'admin' ? ADMIN_LOGIN_PATH : SUPERADMIN_LOGIN_PATH} replace />
  }

  return <Outlet />
}
