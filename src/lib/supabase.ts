import { createClient } from '@supabase/supabase-js'

const defaultSupabaseUrl = 'https://onpeiyzoirtpztulabxy.supabase.co'
const defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ucGVpeXpvaXJ0cHp0dWxhYnh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjg4MzEsImV4cCI6MjA5MjgwNDgzMX0.Y3xuz3Oyppt3qN_ZUXbiBw5QEHPFmHJ1lui_T49IAXY'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || defaultSupabaseUrl
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || defaultSupabaseAnonKey
const fallbackSupabaseUrl = defaultSupabaseUrl
const fallbackSupabaseAnonKey = defaultSupabaseAnonKey

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
