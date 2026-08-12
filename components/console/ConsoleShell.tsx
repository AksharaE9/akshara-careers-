'use client'

/**
 * components/console/ConsoleShell.tsx
 *
 * Full enterprise console shell according to §14.3, Part 20, and Part 21.
 * Left rail (240px -> 56px collapsible, mobile drawer), top bar, breadcrumbs,
 * read-only global date display synced to useFilterState, live SSE status dot, ⌘K trigger, and security banners.
 */

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { SessionUser } from '@/lib/auth/session'
import { can, Capability } from '@/lib/auth/rbac'
import { CommandPalette } from './CommandPalette'
import { useFilterState, installHistoryLoopGuard } from '@/lib/console/use-filter-state'

interface ConsoleShellProps {
  user: SessionUser | null
  children: React.ReactNode
}

interface NavItem {
  label: string
  href: string
  capability?: Capability
  icon: string
}

interface NavGroup {
  group: string
  items: NavItem[]
}

export function ConsoleShell({ user, children }: ConsoleShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { range } = useFilterState()

  const [isRailCollapsed, setIsRailCollapsed] = useState(false)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [isCmdkOpen, setIsCmdkOpen] = useState(false)
  const [isLiveConnected, setIsLiveConnected] = useState(true)

  // Mount loop guard in dev
  useEffect(() => {
    installHistoryLoopGuard()
  }, [])

  // ⌘K hotkey listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCmdkOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Listen for live SSE events if on console
  useEffect(() => {
    if (!user) return

    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource('/api/console/stream')
      eventSource.onopen = () => setIsLiveConnected(true)
      eventSource.onerror = () => setIsLiveConnected(false)
    } catch {
      queueMicrotask(() => setIsLiveConnected(false))
    }

    return () => {
      eventSource?.close()
    }
  }, [user])

  const navGroups: NavGroup[] = [
    {
      group: 'PULSE',
      items: [{ label: 'Pulse', href: '/console', capability: 'view_pulse', icon: '📊' }],
    },
    {
      group: 'PIPELINE',
      items: [
        { label: 'Applications', href: '/console/applications', capability: 'view_applications', icon: '📥' },
        { label: 'Candidates', href: '/console/candidates', capability: 'view_candidate_360', icon: '👥' },
        { label: 'Talent pool', href: '/console/talent-pool', capability: 'view_applications', icon: '⭐' },
      ],
    },
    {
      group: 'INSIGHT',
      items: [
        { label: 'Funnel', href: '/console/insight/funnel', capability: 'view_funnel_analytics', icon: '📉' },
        { label: 'Traffic', href: '/console/insight/traffic', capability: 'view_traffic_analytics', icon: '🌐' },
        { label: 'Jobs', href: '/console/insight/jobs', capability: 'manage_jobs', icon: '💼' },
        { label: 'Colleges', href: '/console/insight/colleges', capability: 'merge_colleges', icon: '🏛️' },
      ],
    },
    {
      group: 'MANAGE',
      items: [
        { label: 'Jobs', href: '/console/jobs', capability: 'manage_jobs', icon: '📝' },
        { label: 'Drives', href: '/console/drives', capability: 'manage_drives', icon: '📅' },
        { label: 'Content', href: '/console/content', capability: 'edit_content', icon: '🖋️' },
        { label: 'Lookups', href: '/console/lookups', capability: 'merge_colleges', icon: '🔍' },
      ],
    },
    {
      group: 'OPERATIONS',
      items: [
        { label: 'Security', href: '/console/security', capability: 'view_security', icon: '🛡️' },
        { label: 'System', href: '/console/system', capability: 'view_system', icon: '⚙️' },
        { label: 'Exports', href: '/console/exports', capability: 'export_data', icon: '📤' },
        { label: 'Audit log', href: '/console/audit', capability: 'view_audit', icon: '📜' },
        { label: 'Users', href: '/console/users', capability: 'manage_users', icon: '👤' },
      ],
    },
  ]

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/console/login')
      router.refresh()
    } catch {}
  }

  // If login page or unauthenticated, render minimal shell
  if (pathname.includes('/login') || !user) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-(--color-paper) text-(--color-ink-900) flex font-sans">
      {/* ⌘K Command Palette */}
      <CommandPalette
        isOpen={isCmdkOpen}
        onClose={() => setIsCmdkOpen(false)}
      />

      {/* Mobile Drawer Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* ── Left Navigation Rail ────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-(--color-ink-900)/10 flex flex-col transition-all duration-200 ${
          isRailCollapsed ? 'w-14' : 'w-60'
        } ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Rail Header & Brand */}
        <div className="h-14 border-b border-(--color-ink-900)/10 px-3 flex items-center justify-between">
          <Link href="/console" className="flex items-center gap-2 overflow-hidden">
            <div className="h-7 w-7 bg-(--color-amber) rounded flex items-center justify-center font-display font-black text-(--color-ink) text-sm shrink-0">
              A
            </div>
            {!isRailCollapsed && (
              <div className="flex items-baseline gap-1 font-sans">
                <span className="font-bold text-sm text-(--color-ink-900)">akshara</span>
                <span className="font-mono text-[9px] uppercase tracking-wider font-extrabold text-(--color-rust)">ADMIN</span>
              </div>
            )}
          </Link>

          {/* Desktop Rail Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsRailCollapsed(!isRailCollapsed)}
            className="hidden lg:flex p-1 text-(--color-graphite) hover:text-(--color-ink-900) rounded hover:bg-(--color-ink-900)/5"
            title={isRailCollapsed ? 'Expand Rail' : 'Collapse Rail'}
          >
            {isRailCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Rail Navigation List */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-4 text-(--font-size-step--1)">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.capability || can(user, item.capability)
            )

            if (visibleItems.length === 0) return null

            return (
              <div key={group.group} className="space-y-1">
                {!isRailCollapsed && (
                  <div className="px-3 py-1 font-mono text-[10px] uppercase font-bold tracking-wider text-(--color-ink-400)">
                    {group.group}
                  </div>
                )}
                {visibleItems.map((item) => {
                  const isActive =
                    item.href === '/console'
                      ? pathname === '/console'
                      : pathname.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isRailCollapsed ? item.label : undefined}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                        isActive
                          ? 'bg-(--color-sand) text-(--color-ink) font-bold border border-(--color-hairline) shadow-xs'
                          : 'text-(--color-muted-strong) hover:bg-(--color-paper) hover:text-(--color-ink)'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      {!isRailCollapsed && <span>{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Rail Footer */}
        <div className="p-2 border-t border-(--color-ink-900)/10">
          {!isRailCollapsed && (
            <div className="px-2 py-1.5 mb-1 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-(--font-size-step--1) font-semibold leading-tight">{user.name}</span>
                <span className="text-(--font-size-step--2) font-mono text-(--color-ink-400) capitalize">{user.role}</span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-(--font-size-step--1) text-(--color-kumkum) hover:bg-red-50 rounded font-medium transition-colors"
          >
            <span>🚪</span>
            {!isRailCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Layout Wrapper ─────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          isRailCollapsed ? 'lg:ml-14' : 'lg:ml-60'
        }`}
      >
        {/* Security / Password Expiry Alert Banner */}
        {user.mustChangePassword && (
          <div className="bg-red-600 text-white px-4 py-2 text-xs font-mono font-medium flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span><strong>Security Requirement:</strong> Your operator password is due for rotation.</span>
            </div>
            <Link
              href="/console/account/password"
              className="underline font-semibold bg-white/10 px-2.5 py-1 rounded hover:bg-white/20"
            >
              Rotate Password Now &rarr;
            </Link>
          </div>
        )}

        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-(--color-ink-900)/10 px-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          {/* Mobile Drawer Trigger & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 text-(--color-graphite) rounded hover:bg-(--color-ink-900)/5"
            >
              ☰
            </button>

            <div className="flex items-center gap-1.5 text-(--font-size-step--1) text-(--color-graphite)">
              <Link href="/console" className="hover:text-(--color-ink-900)">Console</Link>
              <span>/</span>
              <span className="text-(--color-ink-900) font-medium capitalize">
                {pathname.split('/')[2] || 'Pulse'}
              </span>
            </div>
          </div>

          {/* Top Actions: Date Range (read-only per Task 3), ⌘K, Env Badge, SSE Indicator */}
          <div className="flex items-center gap-3">
            {/* Global Date Range Read-Only Display (§Task 3) */}
            <div className="hidden sm:flex items-center gap-1 bg-(--color-chalk) border border-(--color-ink-900)/10 rounded-lg p-1 text-(--font-size-step--2)">
              <span
                data-testid="topbar-date-range"
                className="px-2 py-0.5 rounded font-mono font-medium text-(--color-ink-900)"
              >
                {range.label}
              </span>
            </div>

            {/* ⌘K Command Palette Trigger */}
            <button
              type="button"
              data-testid="cmdk-trigger"
              onClick={() => setIsCmdkOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 bg-(--color-chalk) border border-(--color-ink-900)/10 rounded-lg text-(--font-size-step--2) text-(--color-graphite) hover:text-(--color-ink-900)"
            >
              <span>Search / Jump</span>
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-(--color-ink-900)/10">⌘K</kbd>
            </button>

            {/* Environment Badge */}
            <span className="px-2 py-0.5 font-mono text-(--font-size-step--2) uppercase font-bold rounded bg-(--color-leaf)/15 text-(--color-leaf)">
              {process.env.NODE_ENV === 'production' ? 'PROD' : 'LOCAL'}
            </span>

            {/* Live SSE Status Dot */}
            <div data-testid="sse-status" className="flex items-center gap-1.5 text-(--font-size-step--2) font-mono text-(--color-graphite)">
              <div
                className={`w-2 h-2 rounded-full ${
                  isLiveConnected ? 'bg-(--color-leaf) animate-pulse' : 'bg-(--color-ink-400)'
                }`}
              />
              <span className="hidden sm:inline">{isLiveConnected ? 'Live' : 'Offline'}</span>
            </div>

            {/* Public Careers Board Link */}
            <Link
              href="/careers"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1 text-(--font-size-step--2) text-(--color-graphite) hover:text-(--color-ink-900) font-medium"
            >
              <span>Public Board</span>
              <span>↗</span>
            </Link>
          </div>
        </header>

        {/* Console Viewport Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
