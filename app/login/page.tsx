/**
 * app/login/page.tsx
 *
 * Candidate login / register portal with password-based authentication.
 * Supersedes the OTP design.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { FieldWrapper } from '@/components/ui/FieldWrapper'
import { Input } from '@/components/ui/Input'

export default function CandidateLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const handlePhoneChange = (val: string) => {
    // Strip non-digits
    const cleanDigits = val.replace(/\D/g, '').slice(0, 10)
    setPhone(cleanDigits)
  }

  const validateForm = (): boolean => {
    setError(null)

    // 1. Phone number check
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.')
      return false
    }

    // 2. Mode-specific checks
    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Please enter your full name.')
        return false
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid email address.')
        return false
      }
    }

    // 3. Password check
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
      const endpoint = mode === 'login' ? '/api/auth/candidate/login' : '/api/auth/candidate/signup'
      const payload =
        mode === 'login'
          ? { phone, password }
          : { phone, email, password, name: fullName }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        if (mode === 'signup' && data.error === 'ALREADY_EXISTS') {
          // Auto switch to login mode as requested
          setMode('login')
          setInfoMessage('This phone number is already registered. Please log in instead.')
          setIsLoading(false)
          return
        }
        throw new Error(data.message || 'Authentication failed. Please try again.')
      }

      // Successful auth - route to candidate dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-(--color-ink-950) text-(--color-text-on-dark) flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-12">
        <div className="w-full max-w-md bg-(--color-ink-900) border border-(--color-ink-600) rounded-(--radius-lg) p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-(--font-size-step--2) text-(--color-amber-400) font-bold uppercase tracking-wider">
              Candidate Portal
            </span>
            <h1 className="font-display text-(--font-size-step-3) font-bold text-(--color-text-on-dark)">
              {mode === 'login' ? 'Candidate Login' : 'Create Account'}
            </h1>
            <p className="text-(--font-size-step--1) text-(--color-text-on-dark-muted) leading-relaxed">
              {mode === 'login'
                ? 'Sign in to check application status, track interviews, and manage your candidate profile.'
                : 'Register your candidate profile to start applying for open opportunities.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 bg-(--color-ink-950) p-1 rounded-(--radius-md) border border-(--color-ink-600) w-full">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError(null)
                setInfoMessage(null)
              }}
              className={`py-2 px-3 text-(--font-size-step--1) font-semibold rounded-(--radius-sm) transition-all text-center ${
                mode === 'login'
                  ? 'bg-(--color-amber-400) text-(--color-ink-950) shadow-sm'
                  : 'text-(--color-text-on-dark-muted) hover:text-(--color-text-on-dark)'
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
              className={`py-2 px-3 text-(--font-size-step--1) font-semibold rounded-(--radius-sm) transition-all text-center ${
                mode === 'signup'
                  ? 'bg-(--color-amber-400) text-(--color-ink-950) shadow-sm'
                  : 'text-(--color-text-on-dark-muted) hover:text-(--color-text-on-dark)'
              }`}
            >
              Register
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div data-testid="auth-error-message" className="p-4 bg-red-500/15 border border-red-500/30 text-red-300 text-(--font-size-step--1) rounded-(--radius-sm) font-medium">
              {error}
            </div>
          )}

          {infoMessage && (
            <div data-testid="auth-info-message" className="p-4 bg-(--color-amber-400)/15 border border-(--color-amber-400)/30 text-(--color-amber-400) text-(--font-size-step--1) rounded-(--radius-sm) font-medium">
              {infoMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {mode === 'signup' && (
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
                    placeholder="e.g. aditi@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FieldWrapper>
              </>
            )}

            <FieldWrapper id="phone" label="Mobile Phone Number" required hint="10-digit mobile number">
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                prefix="+91"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                autoFocus={mode === 'login'}
              />
            </FieldWrapper>

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
                  className="absolute right-3 text-(--font-size-step--2) text-(--color-text-on-dark-muted) hover:text-(--color-text-on-dark) focus:outline-none"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </FieldWrapper>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn--md btn--primary w-full mt-2"
            >
              {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          {/* Recruiter link */}
          <div className="border-t border-(--color-ink-600)/50 pt-4 flex items-center justify-between text-(--font-size-step--2) text-(--color-text-on-dark-muted)">
            <span>Recruiter or Admin?</span>
            <Link
              href="/console/login"
              className="text-(--color-amber-400) hover:underline font-semibold"
            >
              Operator Console &rarr;
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
