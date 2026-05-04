import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const fallbackSupabaseUrl = 'https://example.supabase.co'
const fallbackSupabaseAnonKey = 'public-anon-key'

const configured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('example.supabase.co') &&
  supabaseAnonKey !== 'public-anon-key',
)

if (!configured) {
  console.warn('Supabase is not configured. Public local data will be used where possible.')
}

export const supabase = createClient(
  configured ? supabaseUrl! : fallbackSupabaseUrl,
  configured ? supabaseAnonKey! : fallbackSupabaseAnonKey,
)

export function isSupabaseConfigured(): boolean {
  return configured
}
