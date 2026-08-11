/**
 * components/candidate/CandidateLogoutButton.tsx
 *
 * Client-side logout button for candidate session.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CandidateLogoutButton() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/candidate/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="btn btn--sm btn--secondary"
    >
      {isLoggingOut ? 'Signing out...' : 'Sign Out'}
    </button>
  )
}
