import { Navigate } from 'react-router-dom'
import { ADMIN_BASE_PATH, getAccessConfig, grantAccess } from '../../services/accessControl'
import { setDataNamespace } from '../../services/storage'

export function AutoAdminAccess() {
  setDataNamespace('workspace')
  grantAccess('admin', getAccessConfig('admin').password)
  return <Navigate to={ADMIN_BASE_PATH} replace />
}
