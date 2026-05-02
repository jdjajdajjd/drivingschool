import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabaseTypes'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const configured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('example.supabase.co') &&
  supabaseAnonKey !== 'public-anon-key',
)

if (!configured) {
  console.warn('Supabase is not configured. Public demo data will be used where possible.')
}

export const supabase = createClient<Database>(
  supabaseUrl ?? 'https://example.supabase.co',
  supabaseAnonKey ?? 'public-anon-key',
)

export function isSupabaseConfigured(): boolean {
  return configured
}
