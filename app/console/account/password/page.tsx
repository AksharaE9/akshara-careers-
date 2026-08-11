'use client'

/**
 * app/console/account/password/page.tsx
 *
 * Mandatory password rotation screen (§14.1.2).
 * Rendered on first login when must_change_password is true.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getErrorMessage } from '@/lib/errors'

export default function PasswordRotationPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/password-rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to rotate password.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/console')
        router.refresh()
      }, 1200)
    } catch (err) {
      setError(getErrorMessage(err) || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-(--color-chalk) flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-(--color-ink-900)/10 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-(--color-kumkum) animate-pulse" />
          <span className="font-mono text-(--font-size-step--2) uppercase tracking-wider text-(--color-graphite) font-semibold">
            Security Gate · Required
          </span>
        </div>

        <h1 className="text-(--font-size-step-2) font-bold text-(--color-ink-900) mb-2">
          Update Your Password
        </h1>
        <p className="text-(--font-size-step--1) text-(--color-graphite) mb-6">
          Your account is currently using a default setup password. Please set a secure password of at least 12 characters to continue.
        </p>

        {error && (
          <div
            data-testid="force-rotate-error"
            className="mb-4 p-3 rounded-lg bg-(--color-kumkum)/10 border border-(--color-kumkum)/20 text-(--color-kumkum) text-(--font-size-step--1)"
          >
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-(--color-leaf)/10 border border-(--color-leaf)/20 text-(--color-leaf) text-(--font-size-step--1)">
            Password updated successfully. Redirecting to console…
          </div>
        )}

        <form onSubmit={handleSubmit} data-testid="force-rotate-form" className="space-y-4">
          <div>
            <label className="block text-(--font-size-step--1) font-medium text-(--color-ink-900) mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full h-11 px-3 border border-(--color-ink-900)/15 rounded-lg text-(--font-size-step-0) focus:outline-none focus:border-(--color-marigold)"
              required
            />
          </div>

          <div>
            <label className="block text-(--font-size-step--1) font-medium text-(--color-ink-900) mb-1">
              New Password (min 12 chars)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              minLength={12}
              className="w-full h-11 px-3 border border-(--color-ink-900)/15 rounded-lg text-(--font-size-step-0) focus:outline-none focus:border-(--color-marigold)"
              required
            />
          </div>

          <div>
            <label className="block text-(--font-size-step--1) font-medium text-(--color-ink-900) mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              minLength={12}
              className="w-full h-11 px-3 border border-(--color-ink-900)/15 rounded-lg text-(--font-size-step-0) focus:outline-none focus:border-(--color-marigold)"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 mt-4 cursor-pointer shadow-md"
          >
            {loading ? 'Securing Account…' : 'Rotate Password & Enter Console'}
          </button>
        </form>
      </div>
    </div>
  )
}
