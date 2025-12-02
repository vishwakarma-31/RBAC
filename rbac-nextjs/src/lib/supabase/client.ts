import { createBrowserClient } from '@supabase/ssr'
import { envConfig } from '../env'

export function createClient() {
  return createBrowserClient(
    envConfig.NEXT_PUBLIC_SUPABASE_URL,
    envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}