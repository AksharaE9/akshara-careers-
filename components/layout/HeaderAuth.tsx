'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface HeaderAuthProps {
  candidateName?: string | null | undefined
}

export function HeaderAuth({ candidateName: initialName }: HeaderAuthProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [candidateName, setCandidateName] = useState<string | null>(initialName || null)
  const [prevInitialName, setPrevInitialName] = useState(initialName)

  if (initialName !== prevInitialName) {
    setPrevInitialName(initialName)
    setCandidateName(initialName || null)
  }

  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (initialName !== undefined) {
      return
    }

    // Check candidate session via client fetch
    let isMounted = true
    fetch('/api/auth/candidate/me')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.authenticated && data.candidate) {
          setCandidateName(data.candidate.fullName)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [initialName])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/candidate/logout', { method: 'POST' })
      setCandidateName(null)
      setIsOpen(false)
      router.push('/login')
      router.refresh()
    } catch {
      router.push('/login')
    }
  }

  if (candidateName) {
    return (
      <div className="relative flex items-center gap-2" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-lg bg-white border border-slate-200 shadow-xs text-xs font-mono font-bold text-slate-800 hover:border-slate-300 transition-all cursor-pointer"
        >
          <span className="h-2 w-2 rounded-full bg-green-600" />
          <span className="truncate max-w-[120px]">{candidateName}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 flex flex-col gap-1 text-xs">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-semibold"
            >
              <span>📊</span> Candidate Dashboard
            </Link>
            <Link
              href="/careers#roles"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-800 hover:bg-slate-100 font-semibold"
            >
              <span>💼</span> Explore Open Roles
            </Link>
            <div className="border-t border-slate-100 my-1" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 font-semibold text-left w-full cursor-pointer"
            >
              <span>🚪</span> Sign Out
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href="/login"
      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 shadow-xs text-xs font-mono font-bold text-slate-900 transition-all"
    >
      <span>👤</span>
      <span>Login</span>
    </Link>
  )
}
