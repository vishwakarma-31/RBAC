import { createBrowserClient } from '@supabase/ssr'
import { envConfig } from '../env'

export function createClient() {
  // Validate that the required environment variables are present
  if (!envConfig.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set. Please check your .env.local file.')
    throw new Error('Supabase URL is not configured')
  }
  
  if (!envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Please check your .env.local file.')
    throw new Error('Supabase ANON KEY is not configured')
  }
  
  // Validate URL format
  try {
    new URL(envConfig.NEXT_PUBLIC_SUPABASE_URL)
  } catch (e) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not a valid URL:', envConfig.NEXT_PUBLIC_SUPABASE_URL)
    throw new Error('Supabase URL is not valid')
  }

  return createBrowserClient(
    envConfig.NEXT_PUBLIC_SUPABASE_URL,
    envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}