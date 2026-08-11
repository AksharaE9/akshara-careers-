/**
 * app/console/(auth)/login/page.tsx
 *
 * Recruiter & Administrator console authentication portal.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FieldWrapper } from '@/components/ui/FieldWrapper'
import { getErrorMessage } from '@/lib/errors'

export default function ConsoleLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    setError(null)
    setLoading(true)
    const targetEmail = (loginEmail || email).trim()
    const targetPassword = loginPassword || password

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Email or password is incorrect.')
      }

      if (data.mustChangePassword) {
        router.push('/console/account/password')
      } else {
        router.push('/console')
      }
      router.refresh()
    } catch (err) {
      setError(getErrorMessage(err) || 'Email or password is incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-(--color-paper) flex flex-col items-center justify-center p-(--spacing-s4)">
      <div className="w-full max-w-md flex flex-col gap-(--spacing-s6)">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-(--spacing-s2)">
          <Link href="/careers" className="inline-block">
            <Image
              src="/images/akshara-logo.svg"
              alt="Akshara Careers"
              width={160}
              height={36}
              priority
              style={{ width: 'auto', height: '36px' }}
            />
          </Link>
          <span className="eyebrow text-(--color-marigold) mt-(--spacing-s1)">
            Talent Operations Console
          </span>
          <h1 className="display text-(--font-size-step-2) font-bold text-(--color-ink-900)">
            Sign in to Console
          </h1>
          <p className="text-(--font-size-step--1) text-(--color-graphite)">
            Internal portal for recruiters, interviewers, and hiring managers.
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-(--spacing-s6) bg-(--color-chalk) border border-(--color-ink-900)/10 shadow-lg flex flex-col gap-(--spacing-s5)">
          {/* Quick Demo Logins */}
          <div className="flex flex-col gap-(--spacing-s2) bg-(--color-marigold)/10 p-(--spacing-s3) rounded-(--radius-md) border border-(--color-marigold)/20">
            <span className="text-(--font-size-step--2) font-mono uppercase tracking-wider text-(--color-graphite) font-semibold">
              Fast Demo Logins
            </span>
            <div className="grid grid-cols-2 gap-(--spacing-s2)">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => handleLogin('recruiter1@akshara.in', 'DemoPassword@123')}
                disabled={loading}
                className="text-(--font-size-step--2)"
                data-testid="demo-recruiter-login"
              >
                Sign in as Recruiter
              </Button>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => handleLogin('admin@akshara.in', 'DemoPassword@123')}
                disabled={loading}
                className="text-(--font-size-step--2)"
                data-testid="demo-admin-login"
              >
                Sign in as Admin
              </Button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-(--color-ink-900)/10 w-full" />
            <span className="bg-(--color-chalk) px-(--spacing-s2) text-(--font-size-step--2) text-(--color-ink-400) uppercase font-mono tracking-widest absolute">
              Or email
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleLogin()
            }}
            className="flex flex-col gap-(--spacing-s4)"
          >
            <FieldWrapper id="email" label="Work Email Address" required>
              <Input
                id="email"
                type="email"
                placeholder="name@akshara.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="console-login-email"
              />
            </FieldWrapper>

            <FieldWrapper id="password" label="Password" required>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="console-login-password"
              />
            </FieldWrapper>

            {error && (
              <div
                data-testid="console-login-error"
                className="p-(--spacing-s3) bg-(--color-kumkum)/10 border border-(--color-kumkum)/20 text-(--color-kumkum) text-(--font-size-step--1) rounded-(--radius-sm)"
              >
                {error}
              </div>
            )}

            <Button
              variant="primary"
              type="submit"
              onClick={(e) => {
                e.preventDefault()
                handleLogin()
              }}
              loading={loading}
              className="w-full mt-(--spacing-s2)"
              data-testid="console-login-submit"
            >
              Sign In to Console &rarr;
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <div className="text-center text-(--font-size-step--2) text-(--color-ink-400)">
          <p>Protected under Akshara Information Security Policy.</p>
          <Link href="/careers" className="hover:underline text-(--color-graphite) mt-(--spacing-s1) inline-block">
            &larr; Back to Public Careers Board
          </Link>
        </div>
      </div>
    </div>
  )
}
