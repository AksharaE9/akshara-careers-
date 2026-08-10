'use client'

/**
 * components/console/CommandPalette.tsx
 *
 * ⌘K / Ctrl+K Command Palette (§14.3.4).
 * Keyboard-first navigation, candidate/job/drive quick search, date range presets, rail toggle.
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onToggleRail?: () => void
}

interface CommandItem {
  id: string
  title: string
  subtitle?: string | undefined
  category: 'Navigation' | 'Insight' | 'Management' | 'Actions'
  href?: string | undefined
  action?: (() => void) | undefined
}

export function CommandPalette({ isOpen, onClose, onToggleRail }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items: CommandItem[] = [
    // Navigation
    { id: 'nav-pulse', title: 'Pulse Dashboard', subtitle: 'Live overview & KPI tiles', category: 'Navigation', href: '/console' },
    { id: 'nav-pipeline', title: 'Applications Pipeline', subtitle: 'Kanban stage board & table', category: 'Navigation', href: '/console/applications' },
    { id: 'nav-candidates', title: 'Candidates 360', subtitle: 'Candidate profiles & deduplication', category: 'Navigation', href: '/console/candidates' },
    { id: 'nav-talent', title: 'Talent Pool', subtitle: 'Passive candidate pipeline', category: 'Navigation', href: '/console/talent-pool' },

    // Insight
    { id: 'ins-funnel', title: 'Funnel & Form Analytics', subtitle: 'Step drop-offs & field analytics', category: 'Insight', href: '/console/insight/funnel' },
    { id: 'ins-traffic', title: 'Traffic & Attribution', subtitle: 'Real-user Web Vitals & UTMs', category: 'Insight', href: '/console/insight/traffic' },
    { id: 'ins-jobs', title: 'Jobs Performance', subtitle: 'View-to-apply conversion', category: 'Insight', href: '/console/insight/jobs' },
    { id: 'ins-drives', title: 'Campus Drives Performance', subtitle: 'QR scan conversions & leaderboard', category: 'Insight', href: '/console/insight/drives' },
    { id: 'ins-colleges', title: 'Colleges & Courses', subtitle: 'D4 merge tool & data hygiene', category: 'Insight', href: '/console/insight/colleges' },

    // Management
    { id: 'mgt-jobs', title: 'Manage Job Requisitions', subtitle: 'Create, edit & publish postings', category: 'Management', href: '/console/jobs' },
    { id: 'mgt-drives', title: 'Manage Campus Drives', subtitle: 'Schedule drives & generate QR codes', category: 'Management', href: '/console/drives' },
    { id: 'mgt-content', title: 'CMS Content Blocks', subtitle: 'Hero copy, benefits, FAQs', category: 'Management', href: '/console/content' },
    { id: 'mgt-lookups', title: 'Colleges & Degrees Directory', subtitle: 'Alias mapping & deduplication', category: 'Management', href: '/console/lookups' },

    // Operations
    { id: 'ops-security', title: 'Security & Bot Activity', subtitle: '8-layer defense monitoring', category: 'Management', href: '/console/security' },
    { id: 'ops-system', title: 'System Health & Probes', subtitle: 'Neon latency, storage, Sentry errors', category: 'Management', href: '/console/system' },
    { id: 'ops-exports', title: 'Exports & Reports', subtitle: 'DPDP CSV & XLSX generator', category: 'Management', href: '/console/exports' },
    { id: 'ops-audit', title: 'Audit Trail', subtitle: 'Immutable mutation history', category: 'Management', href: '/console/audit' },
    { id: 'ops-users', title: 'User Management', subtitle: 'Roles, sessions, access control', category: 'Management', href: '/console/users' },

    // Quick Actions
    { id: 'act-toggle-rail', title: 'Toggle Navigation Rail', subtitle: 'Collapse / expand sidebar', category: 'Actions', action: onToggleRail },
    { id: 'act-date-7d', title: 'Filter: Last 7 Days', subtitle: 'Apply date range to current screen', category: 'Actions', action: () => {
      const now = new Date()
      const prev = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      router.push(`?from=${prev.toISOString().split('T')[0]}&to=${now.toISOString().split('T')[0]}`)
    }},
    { id: 'act-date-30d', title: 'Filter: Last 30 Days', subtitle: 'Apply date range to current screen', category: 'Actions', action: () => {
      const now = new Date()
      const prev = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      router.push(`?from=${prev.toISOString().split('T')[0]}&to=${now.toISOString().split('T')[0]}`)
    }},
  ]

  const filtered = query.trim()
    ? items.filter(
        (it) =>
          it.title.toLowerCase().includes(query.toLowerCase()) ||
          it.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
          it.category.toLowerCase().includes(query.toLowerCase())
      )
    : items

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filtered[selectedIndex]
        if (selected) {
          executeItem(selected)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filtered, selectedIndex])

  const executeItem = (item: CommandItem) => {
    onClose()
    if (item.action) {
      item.action()
    } else if (item.href) {
      router.push(item.href)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-[--color-ink-900]/40 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-[--color-chalk] border border-[--color-ink-900]/15 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-[--color-ink-900]/10 bg-white">
          <svg className="w-5 h-5 text-[--color-ink-400] mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            data-testid="cmdk-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Type a command, screen name, or search..."
            className="w-full bg-transparent text-[--font-size-step-0] text-[--color-ink-900] placeholder-[--color-ink-400] focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[--font-size-step--2] font-mono text-[--color-ink-400] bg-[--color-ink-900]/5 rounded border border-[--color-ink-900]/10">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-[--font-size-step--1] text-[--color-graphite]">
              No commands or screens found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex
              return (
                <button
                  key={item.id}
                  data-testid={`cmdk-result-${item.id}`}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-[--color-marigold]/15 text-[--color-ink-900]' : 'text-[--color-graphite] hover:bg-[--color-ink-900]/5'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[--font-size-step--1] font-medium text-[--color-ink-900]">
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className="text-[--font-size-step--2] text-[--color-graphite]">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                  <span className="text-[--font-size-step--2] font-mono uppercase px-2 py-0.5 rounded bg-[--color-ink-900]/5 text-[--color-ink-600]">
                    {item.category}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
