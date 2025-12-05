import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { envConfig } from '../env'

export async function updateSession(request: NextRequest) {
  // Check if environment variables are properly configured
  if (!envConfig.NEXT_PUBLIC_SUPABASE_URL || !envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // SECURITY FIX: Fail closed instead of open
    return new NextResponse('Service Configuration Error: Missing Environment Variables', { status: 500 });
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    envConfig.NEXT_PUBLIC_SUPABASE_URL,
    envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set(name, value)
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set(name, '')
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set(name, '', options)
        },
      },
    }
  )

  // Refresh session if needed
  const { data: { user } } = await supabase.auth.getUser()

  // Handle callback URLs for authentication
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    // Redirect to dashboard after successful authentication
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect dashboard routes - only allow authenticated users
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from login page
  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}