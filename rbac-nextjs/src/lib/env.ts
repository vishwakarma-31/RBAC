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
  // Allow Zod to throw validation errors to prevent app startup with bad config
  return envSchema.parse(env);
}
export const envConfig = getEnvConfig();