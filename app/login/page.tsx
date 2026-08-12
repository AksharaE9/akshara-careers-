/**
 * app/login/page.tsx
 *
 * Unified login & registration portal.
 * Accepts Candidate mobile number or Admin/Recruiter credentials.
 * Automatically routes admins to /console and candidates to /dashboard or ?redirect=...
 */

'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { FieldWrapper } from '@/components/ui/FieldWrapper'
import { Input } from '@/components/ui/Input'
import { getErrorMessage } from '@/lib/errors'

function UnifiedLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect') || '/dashboard'
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [identifier, setIdentifier] = useState('')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const validateForm = (): boolean => {
    setError(null)

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Please enter your full name.')
        return false
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid email address.')
        return false
      }
      const cleanPhone = phone.replace(/\D/g, '')
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        setError('Please enter a valid 10-digit mobile number.')
        return false
      }
    } else {
      if (!identifier.trim()) {
        setError('Please enter your mobile number or email address.')
        return false
      }
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInfoMessage(null)
    if (!validateForm()) return

    setIsLoading(true)
    try {
      if (mode === 'signup') {
        // Candidate Registration
        const cleanPhone = phone.replace(/\D/g, '')
        const res = await fetch('/api/auth/candidate/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            email: email.trim(),
            password,
            name: fullName.trim(),
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          if (data.error === 'ALREADY_EXISTS') {
            setMode('login')
            setIdentifier(cleanPhone)
            setInfoMessage('This account already exists. Please sign in with your password.')
            setIsLoading(false)
            return
          }
          throw new Error(data.message || 'Registration failed. Please try again.')
        }

        router.push(redirectTarget)
        router.refresh()
        return
      }

      // Login Flow: Check if identifier is an email (Admin/Recruiter console candidate) or Phone
      const trimmedId = identifier.trim()
      const isEmail = trimmedId.includes('@')

      if (isEmail) {
        // Attempt Admin / Operator console login
        const consoleRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedId, password }),
        })

        const consoleData = await consoleRes.json()

        if (consoleRes.ok) {
          if (consoleData.mustChangePassword) {
            router.push('/console/account/password')
          } else {
            router.push('/console')
          }
          router.refresh()
          return
        }

        // If not a console user, check candidate password with email
        throw new Error(consoleData.error || 'Invalid email or password.')
      } else {
        // Candidate Mobile Login
        const cleanPhone = trimmedId.replace(/\D/g, '')
        const res = await fetch('/api/auth/candidate/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone, password }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.message || 'Mobile number or password is incorrect.')
        }

        router.push(redirectTarget)
        router.refresh()
      }
    } catch (err) {
      setError(getErrorMessage(err) || 'Authentication failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-xs text-amber-700 font-bold uppercase tracking-wider">
          Authentication
        </span>
        <h1 className="font-display text-[clamp(1.75rem,1.50rem+1.10vw,2.40rem)] font-bold text-slate-900">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          {redirectTarget.includes('/apply')
            ? 'Sign in to continue your job application.'
            : mode === 'login'
              ? 'Enter your mobile number or staff email to access your portal.'
              : 'Register your candidate profile to start applying for open opportunities.'}
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full">
        <button
          type="button"
          onClick={() => {
            setMode('login')
            setError(null)
            setInfoMessage(null)
          }}
          className={`py-2 px-3 text-sm font-bold rounded-lg transition-all text-center ${
            mode === 'login'
              ? 'bg-amber-400 text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup')
            setError(null)
            setInfoMessage(null)
          }}
          className={`py-2 px-3 text-sm font-bold rounded-lg transition-all text-center ${
            mode === 'signup'
              ? 'bg-(--color-sand) text-(--color-ink) font-bold shadow-xs border border-(--color-hairline)'
              : 'text-(--color-muted) hover:text-(--color-ink)'
          }`}
        >
          Register
        </button>
      </div>

      {/* Feedback messages */}
      {error && (
        <div data-testid="auth-error-message" className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md font-medium">
          {error}
        </div>
      )}

      {infoMessage && (
        <div data-testid="auth-info-message" className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md font-medium">
          {infoMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {mode === 'signup' ? (
          <>
            <FieldWrapper id="fullName" label="Full Name" required>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </FieldWrapper>

            <FieldWrapper id="email" label="Email Address" required>
              <Input
                id="email"
                type="email"
                placeholder="e.g. rahul@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FieldWrapper>

            <FieldWrapper id="phone" label="Mobile Phone Number" required hint="10-digit mobile number">
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                prefix="+91"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </FieldWrapper>
          </>
        ) : (
          <FieldWrapper id="identifier" label="Mobile Number or Email" required hint="Enter 10-digit phone or staff email">
            <Input
              id="identifier"
              type="text"
              placeholder="e.g. 9876543210 or name@akshara.in"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
            />
          </FieldWrapper>
        )}

        <FieldWrapper id="password" label="Password" required>
          <div className="relative flex items-center">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-control w-full pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-xs font-semibold text-slate-600 hover:text-slate-900 focus:outline-none"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </FieldWrapper>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn--md btn--primary w-full mt-2 font-bold"
        >
          {isLoading ? 'Authenticating...' : mode === 'login' ? 'Sign In →' : 'Create Account & Continue →'}
        </button>
      </form>
    </div>
  )
}

export default function CandidateLoginPage() {
  return (
    <div className="min-h-screen bg-(--color-paper) text-(--color-ink) flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-12">
        <Suspense fallback={<div className="p-8 text-center text-slate-600">Loading portal...</div>}>
          <UnifiedLoginForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
