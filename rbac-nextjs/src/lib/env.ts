import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL. Please check your .env.local file.'
  }).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string({
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required. Please check your .env.local file.'
  }).min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string({
    message: 'NEXT_PUBLIC_APP_URL must be a valid URL. Please check your .env.local file.'
  }).optional(),
})

const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}

function getEnvConfig() {
  try {
    const parsed = envSchema.parse(env);
    
    // Check if required environment variables are present
    if (!parsed.NEXT_PUBLIC_SUPABASE_URL) {
      console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL is not configured. Please check your .env.local file.')
    }
    
    if (!parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. Please check your .env.local file.')
    }
    
    return parsed;
  } catch (error) {
    console.error('❌ Environment variable validation failed:')
    console.error('Please ensure your .env.local file contains valid Supabase credentials.')
    console.error('Refer to the README.md for setup instructions.')
    
    // Return a fallback configuration
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    }
  }
}

export const envConfig = getEnvConfig();