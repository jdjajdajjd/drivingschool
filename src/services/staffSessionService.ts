import { isSupabaseRemoteConfigured, supabase } from '../lib/supabase'
import { getAccessSecret } from './accessControl'
import type { AccessRole, WorkspaceStaffContext, WorkspaceStaffRole } from './accessControl'

type StaffSessionRow = {
  role: WorkspaceStaffRole | 'superadmin'
  session_token: string
  expires_at: string
  school_id: string | null
  branch_ids: string[] | null
  staff_name: string | null
}

async function runStaffAuthRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message || 'Ошибка Supabase RPC.')
  return data as T
}

export async function openSupabaseStaffSession(role: AccessRole, login: string, password: string): Promise<{
  sessionToken: string
  expiresAt: string
  staffContext?: WorkspaceStaffContext
}> {
  if (!isSupabaseRemoteConfigured()) {
    throw new Error('Supabase не подключен для боевого входа.')
  }

  const rows = await runStaffAuthRpc<StaffSessionRow[]>('public_open_staff_session', {
    p_role: role,
    p_login: login.trim(),
    p_password: password.trim(),
  })

  const session = Array.isArray(rows) ? rows[0] : null
  if (!session?.session_token) {
    throw new Error('Не удалось открыть сессию сотрудника.')
  }

  return {
    sessionToken: session.session_token,
    expiresAt: session.expires_at,
    staffContext: role === 'admin'
      ? {
          role: session.role === 'branch_admin' ? 'branch_admin' : 'admin',
          schoolId: session.school_id ?? undefined,
          branchIds: session.branch_ids ?? [],
          name: session.staff_name ?? undefined,
        }
      : undefined,
  }
}

type StaffAuthRole = AccessRole | WorkspaceStaffRole

export async function verifySupabaseStaffSession(role: StaffAuthRole, sessionToken: string): Promise<boolean> {
  if (!isSupabaseRemoteConfigured() || !sessionToken) return false

  try {
    const rows = await runStaffAuthRpc<Array<{ role: AccessRole; expires_at: string }>>(
      'public_verify_staff_session',
      {
        p_role: role,
        p_session_token: sessionToken,
      },
    )

    return Array.isArray(rows) && rows.length > 0
  } catch {
    return false
  }
}

export async function closeSupabaseStaffSession(role: StaffAuthRole, sessionToken: string): Promise<void> {
  if (!isSupabaseRemoteConfigured() || !sessionToken) return

  try {
    await runStaffAuthRpc<null>('public_close_staff_session', {
      p_role: role,
      p_session_token: sessionToken,
    })
  } catch {
    // Best-effort sign-out: local access will still be cleared.
  }
}

export async function upsertSupabaseSchoolStaffCredential(params: {
  schoolId: string
  login: string
  password: string
  staffName?: string
  isActive?: boolean
}): Promise<string> {
  if (!isSupabaseRemoteConfigured()) {
    throw new Error('Supabase не подключен.')
  }

  const superadminSecret = getAccessSecret('superadmin')
  if (!superadminSecret) {
    throw new Error('Войдите в операторскую админку заново.')
  }

  const rows = await runStaffAuthRpc<Array<{ login: string }>>('public_upsert_school_staff_credential', {
    p_school_id: params.schoolId,
    p_login: params.login,
    p_password: params.password.trim(),
    p_staff_name: params.staffName ?? '',
    p_is_active: params.isActive ?? true,
    p_superadmin_password: superadminSecret,
  })

  const row = Array.isArray(rows) ? rows[0] : null
  if (!row?.login) {
    throw new Error('Не удалось сохранить доступ администратора школы.')
  }

  return row.login
}
