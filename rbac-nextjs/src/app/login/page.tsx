'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

let supabase: ReturnType<typeof createClient> | null = null;
try {
  supabase = createClient();
} catch (error) {
  console.error('Failed to create Supabase client:', error);
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if Supabase client is available
    if (!supabase) {
      setError('Authentication service is not available. Please check your configuration.')
      return
    }
    
    setLoading(true)
    setError('')
    setNeedsConfirmation(false)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          setNeedsConfirmation(true)
          setError('Please confirm your email address before signing in. Check your inbox for the confirmation email.')
        } else {
          setError(error.message)
        }
        console.error('Supabase login error:', error)
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Login error:', err)
      // Handle network errors specifically
      if (err instanceof Error && (err.name === 'AuthRetryableFetchError' || err.message.includes('Failed to fetch'))) {
        setError('Unable to connect to authentication service. Please check your internet connection and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!supabase) {
      setError('Authentication service is not available. Please check your configuration.')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      
      if (error) {
        setError(error.message)
      } else {
        setError('')
        setNeedsConfirmation(false)
        alert('Confirmation email resent! Please check your inbox.')
      }
    } catch (err) {
      // Handle network errors specifically
      if (err instanceof Error && (err.name === 'AuthRetryableFetchError' || err.message.includes('Failed to fetch'))) {
        setError('Unable to connect to authentication service. Please check your internet connection and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to resend confirmation email')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-indigo-200 to-purple-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      <Card className="w-full max-w-md backdrop-blur-xl bg-white/40 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl relative z-10 overflow-hidden">
        {/* Glass effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-white/5"></div>
        
        <CardHeader className="text-center pb-2 relative z-10">
          <div className="mx-auto bg-white/50 dark:bg-black/50 backdrop-blur-sm p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4 border border-white/30 dark:border-white/20 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300 text-sm">
            Sign in to manage roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 tracking-tight">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-white/30 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-white/10 dark:text-white backdrop-blur-sm bg-white/50 shadow-inner"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 tracking-tight">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-white/30 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-white/10 dark:text-white backdrop-blur-sm bg-white/50 shadow-inner"
                placeholder="••••••••"
              />
            </div>
            
            {(error || needsConfirmation) && (
              <div className="text-red-600 text-sm bg-red-50/50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200/30 dark:border-red-800/30 backdrop-blur-sm shadow-inner">
                {error}
                {needsConfirmation && (
                  <div className="mt-2">
                    <Button 
                      type="button" 
                      variant="link" 
                      onClick={handleResendConfirmation}
                      disabled={loading}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-0 h-auto font-normal"
                    >
                      {loading ? 'Sending...' : 'Resend confirmation email'}
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            <Button
              type="submit"
              disabled={loading || !supabase}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : !supabase ? 'Service Unavailable' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 tracking-tight">
              Don&apos;t have an account? 
              <button
                onClick={() => router.push('/register')}
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 ml-1"
              >
                Create one
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}