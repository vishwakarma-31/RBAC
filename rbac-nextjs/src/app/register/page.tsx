'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

let supabase: ReturnType<typeof createClient> | null = null;
try {
  supabase = createClient();
} catch (error) {
  console.error('Failed to create Supabase client:', error);
}

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resending, setResending] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    // Check if Supabase client is available
    if (!supabase) {
      setError('Authentication service is not available. Please check your configuration.')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        console.error('Supabase signup error:', error)
      } else {
        setSuccess(true)
        toast.success('Account created successfully!', {
          description: 'Please check your email to confirm your account before signing in.'
        })
      }
    } catch (err) {
      console.error('Registration error:', err)
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
    
    setResending(true)
    setError('')
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      
      if (error) {
        setError(error.message)
      } else {
        toast.success('Confirmation email sent!', {
          description: 'Please check your inbox and spam folder for the confirmation email.'
        })
      }
    } catch (err) {
      // Handle network errors specifically
      if (err instanceof Error && (err.name === 'AuthRetryableFetchError' || err.message.includes('Failed to fetch'))) {
        setError('Unable to connect to authentication service. Please check your internet connection and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to resend confirmation email')
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-indigo-200 to-purple-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-400/20 via-transparent to-transparent animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      <Card className="w-full max-w-md backdrop-blur-xl bg-white/40 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl relative z-10 overflow-hidden">
        {/* Glass effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-white/5"></div>
        
        <CardHeader className="text-center pb-2 relative z-10">
          <div className="mx-auto bg-white/50 dark:bg-black/50 backdrop-blur-sm p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4 border border-white/30 dark:border-white/20 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Create Account</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300 text-sm">
            Join the RBAC Configuration Tool
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <form onSubmit={handleRegister} className="space-y-4">
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
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 tracking-tight">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-white/30 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-white/10 dark:text-white backdrop-blur-sm bg-white/50 shadow-inner"
                placeholder="••••••••"
              />
            </div>
            
            {error && (
              <div className="text-red-600 text-sm bg-red-50/50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200/30 dark:border-red-800/30 backdrop-blur-sm shadow-inner">
                {error}
              </div>
            )}
            
            {success && (
              <div className="text-green-600 text-sm bg-green-50/50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200/30 dark:border-green-800/30 backdrop-blur-sm shadow-inner">
                <p>Account created successfully!</p>
                <p className="mt-1">A confirmation email has been sent to <span className="font-medium">{email}</span>.</p>
                <p className="mt-2">Please check your inbox and spam folder.</p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleResendConfirmation}
                    disabled={resending}
                    className="text-sm"
                  >
                    {resending ? 'Sending...' : 'Resend Email'}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => router.push('/login')}
                    className="text-sm"
                  >
                    Go to Sign In
                  </Button>
                </div>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <p>Didn&apos;t receive the email?</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Check your spam/junk folder</li>
                    <li>Verify the email address is correct</li>
                    <li>Try resending the confirmation email</li>
                  </ul>
                </div>
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
                  Creating Account...
                </span>
              ) : !supabase ? 'Service Unavailable' : 'Create Account'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 tracking-tight">
              Already have an account? 
              <button
                onClick={() => router.push('/login')}
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 ml-1"
              >
                Sign in
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}