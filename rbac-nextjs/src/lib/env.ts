import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL. Please check your .env.local file.'
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string({
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required. Please check your .env.local file.'
  }).min(1),
})

const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

function getEnvConfig() {
  try {
    return envSchema.parse(env);
  } catch (error) {
    console.error('❌ Environment variable validation failed:')
    console.error('Please ensure your .env.local file contains valid Supabase credentials.')
    console.error('Refer to the README.md for setup instructions.')
    throw error;
  }
}

export const envConfig = getEnvConfig();