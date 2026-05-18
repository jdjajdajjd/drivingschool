import { createClient } from '@supabase/supabase-js'

const fallbackSupabaseUrl = 'https://example.supabase.co'
const fallbackSupabaseAnonKey = 'public-anon-key-is-not-configured'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

const configured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('example.supabase.co') &&
  supabaseAnonKey.length > 40,
)

if (!configured) {
  console.warn('Supabase is not configured. Public local data will be used where possible.')
}

export const supabase = createClient(
  configured ? supabaseUrl : fallbackSupabaseUrl,
  configured ? supabaseAnonKey : fallbackSupabaseAnonKey,
)

export function isSupabaseRemoteConfigured(): boolean {
  return configured
}

export function markWorkspaceSupabaseReady(ready: boolean): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem('dd:supabase_workspace_ready', ready ? 'true' : 'false')
}

export function isSupabaseConfigured(): boolean {
  if (typeof window !== 'undefined' && window.sessionStorage.getItem('dd:data_namespace') === 'workspace') {
    return configured && window.sessionStorage.getItem('dd:supabase_workspace_ready') === 'true'
  }
  return configured
}

export function isWorkspaceSupabaseReady(): boolean {
  if (typeof window === 'undefined') return false
  return configured && window.sessionStorage.getItem('dd:data_namespace') === 'workspace' && window.sessionStorage.getItem('dd:supabase_workspace_ready') === 'true'
}
