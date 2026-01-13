import { z } from 'zod'

// Check if we're in a build environment
const isBuildTime = typeof process.env.NODE_ENV !== 'undefined' && 
                   (process.env.NEXT_ENV === 'build' || process.env.NODE_ENV === 'production');

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: isBuildTime 
    ? z.string().url("Invalid Supabase URL").optional() 
    : z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: isBuildTime 
    ? z.string().min(1, "Missing Supabase Anon Key").optional() 
    : z.string().min(1, "Missing Supabase Anon Key"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

// Handle the case where variables are optional during build
const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsedEnv.success && !isBuildTime) {
  console.error('Environment validation error:', parsedEnv.error.flatten());
  throw new Error('Invalid environment variables. Please check your environment configuration.');
}

// Export with fallback values for build time
export const envConfig = {
  NEXT_PUBLIC_SUPABASE_URL: parsedEnv.success ? parsedEnv.data.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co' : 'https://dummy.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: parsedEnv.success ? parsedEnv.data.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_anon_key' : 'dummy_anon_key',
  NEXT_PUBLIC_APP_URL: parsedEnv.success ? parsedEnv.data.NEXT_PUBLIC_APP_URL : undefined,
};