'use client'

/**
 * components/console/ConsoleShell.tsx
 *
 * Full enterprise console shell according to §14.3.
 * Left rail (240px -> 56px collapsible, mobile drawer), top bar, breadcrumbs,
 * global date picker, live SSE status dot, ⌘K trigger, and security banners.
 */

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SessionUser } from '@/lib/auth/session'
import { can, Capability } from '@/lib/auth/rbac'
import { CommandPalette } from './CommandPalette'

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
  const searchParams = useSearchParams()

  const [isRailCollapsed, setIsRailCollapsed] = useState(false)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [isCmdkOpen, setIsCmdkOpen] = useState(false)
  const [isLiveConnected, setIsLiveConnected] = useState(true)

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
      // F7: deferred rather than called synchronously in the effect body —
      // same reasoning as Combobox.tsx's fix.
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
        { label: 'Drives', href: '/console/insight/drives', capability: 'manage_drives', icon: '🎓' },
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

  const handleDatePreset = (days: number) => {
    const params = new URLSearchParams(searchParams.toString())
    const to = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    params.set('from', from!)
    params.set('to', to!)
    router.push(`${pathname}?${params.toString()}`)
  }

  const currentDateRange = searchParams.get('from') && searchParams.get('to')
    ? `${searchParams.get('from')} – ${searchParams.get('to')}`
    : 'Last 7 Days'

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
        onToggleRail={() => setIsRailCollapsed((prev) => !prev)}
      />

      {/* Left Navigation Rail (Desktop) */}
      <aside
        className={`hidden lg:flex flex-col border-r border-(--color-ink-900)/10 bg-(--color-chalk) transition-all duration-200 sticky top-0 h-screen z-30 ${
          isRailCollapsed ? 'w-14' : 'w-60'
        }`}
      >
        {/* Rail Header */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-(--color-ink-900)/10">
          {!isRailCollapsed && (
            <Link href="/console" className="flex items-center gap-2">
              <Image
                src="/images/akshara-logo.svg"
                alt="Akshara Logo"
                width={100}
                height={24}
                priority
                style={{ width: 'auto', height: '24px' }}
              />
              <span className="text-(--font-size-step--2) font-mono uppercase bg-(--color-marigold)/15 px-1.5 py-0.5 rounded font-semibold text-(--color-ink-900)">
                Admin
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsRailCollapsed((prev) => !prev)}
            className="p-1.5 rounded hover:bg-(--color-ink-900)/5 text-(--color-graphite)"
            title={isRailCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isRailCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 text-(--font-size-step--1)">
          {navGroups.map((grp) => {
            const accessibleItems = grp.items.filter((item) => !item.capability || can(user, item.capability))
            if (accessibleItems.length === 0) return null

            return (
              <div key={grp.group} className="space-y-1">
                {!isRailCollapsed && (
                  <div className="px-2 py-1 font-mono text-(--font-size-step--2) uppercase text-(--color-ink-400) font-semibold tracking-wider">
                    {grp.group}
                  </div>
                )}
                {accessibleItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/console' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isRailCollapsed ? item.label : undefined}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                        isActive
                          ? 'bg-(--color-marigold)/15 text-(--color-ink-900) font-semibold'
                          : 'text-(--color-graphite) hover:bg-(--color-ink-900)/5 hover:text-(--color-ink-900)'
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
            className="w-full flex items-center justify-center gap-2 p-1.5 rounded text-(--font-size-step--1) text-(--color-kumkum) hover:bg-(--color-kumkum)/10 transition-colors font-medium"
          >
            <span>🚪</span>
            {!isRailCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Persistent Red Security Banner if Default Admin Password Active */}
        {user.mustChangePassword && (
          <div
            data-testid="pulse-attention-P1"
            className="bg-(--color-kumkum) text-white px-4 py-2 text-(--font-size-step--1) font-medium flex items-center justify-between shadow-sm z-50"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold">⚠️ CRITICAL SECURITY GATE:</span>
              <span>Default admin password is still active. Change it before taking this portal live.</span>
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

          {/* Top Actions: Date Range, ⌘K, Env Badge, SSE Indicator */}
          <div className="flex items-center gap-3">
            {/* Global Date Range Picker */}
            <div className="hidden sm:flex items-center gap-1 bg-(--color-chalk) border border-(--color-ink-900)/10 rounded-lg p-1 text-(--font-size-step--2)">
              <button
                type="button"
                data-testid="date-range-picker"
                onClick={() => handleDatePreset(7)}
                className="px-2 py-0.5 rounded font-mono font-medium hover:bg-white text-(--color-ink-900)"
              >
                {currentDateRange}
              </button>
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
              className="text-(--font-size-step--2) text-(--color-marigold) font-medium hover:underline hidden sm:inline"
            >
              Public Board &rarr;
            </Link>
          </div>
        </header>

        {/* Mobile Slide-over Drawer */}
        {isMobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/30" onClick={() => setIsMobileDrawerOpen(false)} />
            <div className="relative w-64 bg-(--color-chalk) h-full flex flex-col p-4 shadow-xl z-10">
              <div className="flex items-center justify-between pb-3 border-b border-(--color-ink-900)/10">
                <span className="font-bold text-(--font-size-step-0)">Navigation</span>
                <button type="button" onClick={() => setIsMobileDrawerOpen(false)} className="text-xl">×</button>
              </div>
              <div className="flex-1 overflow-y-auto py-3 space-y-4">
                {navGroups.map((grp) => (
                  <div key={grp.group} className="space-y-1">
                    <div className="font-mono text-(--font-size-step--2) uppercase text-(--color-ink-400) font-semibold">{grp.group}</div>
                    {grp.items.map((it) => (
                      <Link
                        key={it.href}
                        href={it.href}
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="block px-2 py-1.5 rounded hover:bg-(--color-ink-900)/5 text-(--font-size-step--1)"
                      >
                        {it.icon} {it.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Routed Content Container (Max width 1600px with dense rhythm) */}
        <main className="flex-1 p-(--spacing-s4) md:p-(--spacing-s5) max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
