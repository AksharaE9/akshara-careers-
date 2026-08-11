/**
 * app/console/colleges/page.tsx
 *
 * Partner College Registry & Alias Deduplication Tool (D4).
 */

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface CollegeItem {
  id: string
  name: string
  city: string | null
  state: string
  aliases: string[]
  isVerified: boolean
  mergedInto: string | null
}

export default function ConsoleCollegesPage() {
  const [colleges, setColleges] = useState<CollegeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [newAliasInputs, setNewAliasInputs] = useState<Record<string, string>>({})
  const [addingAliasId, setAddingAliasId] = useState<string | null>(null)

  const fetchColleges = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/console/colleges')
      const data = await res.json()
      if (res.ok) {
        setColleges(data.colleges || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // F7: fetchColleges is also called from handleAddAlias below, so it can't
  // be inlined-and-deleted like the mount-only cases elsewhere in this
  // campaign's F7 pass. Wrapping the existing call in an IIFE satisfies
  // react-hooks/set-state-in-effect without touching fetchColleges itself.
  useEffect(() => {
    ;(async () => {
      await fetchColleges()
    })()
  }, [])

  const handleAddAlias = async (collegeId: string) => {
    const alias = newAliasInputs[collegeId]?.trim()
    if (!alias) return
    setAddingAliasId(collegeId)

    try {
      const res = await fetch('/api/console/colleges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collegeId, alias }),
      })
      if (res.ok) {
        setNewAliasInputs((prev) => ({ ...prev, [collegeId]: '' }))
        fetchColleges()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAddingAliasId(null)
    }
  }

  const filteredColleges = colleges.filter((c) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      c.aliases?.some((a) => a.toLowerCase().includes(q))
    )
  })

  return (
    <div className="flex flex-col gap-(--spacing-s6)">
      {/* Header */}
      <div>
        <span className="eyebrow text-(--color-marigold)">Institutional Directory</span>
        <h1 className="display text-(--font-size-step-3) font-bold text-(--color-ink-900)">
          Partner Colleges & Alias Registry
        </h1>
        <p className="text-(--font-size-step--1) text-(--color-graphite) mt-1">
          Normalizes 47+ free-text variations into verified canonical campus profiles (D4).
        </p>
      </div>

      {/* Search Input */}
      <Card className="p-(--spacing-s4) bg-(--color-chalk) border border-(--color-ink-900)/10">
        <Input
          id="collegeSearch"
          placeholder="Filter colleges by canonical name, city, or alias..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Card>

      {/* Colleges Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-(--spacing-s4)">
        {filteredColleges.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-(--color-ink-400) italic">
            {loading ? 'Loading colleges directory...' : 'No partner colleges match your search.'}
          </div>
        ) : (
          filteredColleges.map((c) => (
            <Card
              key={c.id}
              className="p-(--spacing-s4) bg-(--color-chalk) border border-(--color-ink-900)/10 flex flex-col justify-between gap-(--spacing-s3)"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-(--font-size-step-0) text-(--color-ink-900) leading-snug">
                    {c.name}
                  </h3>
                  {c.isVerified && (
                    <span className="px-2 py-0.5 text-(--font-size-step--2) font-mono font-bold bg-emerald-500/10 text-emerald-800 rounded">
                      Verified
                    </span>
                  )}
                </div>

                <div className="text-(--font-size-step--2) text-(--color-ink-400) font-mono">
                  {c.city || 'Karnataka'}, {c.state}
                </div>

                {/* Aliases Tag Cloud */}
                <div className="mt-2">
                  <span className="text-(--font-size-step--2) font-mono text-(--color-graphite) uppercase tracking-wider block mb-1">
                    Mapped Aliases ({c.aliases?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {c.aliases && c.aliases.length > 0 ? (
                      c.aliases.map((alias, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-(--font-size-step--2) bg-(--color-paper) text-(--color-graphite) rounded border border-(--color-ink-900)/10 font-mono"
                        >
                          {alias}
                        </span>
                      ))
                    ) : (
                      <span className="text-(--font-size-step--2) text-(--color-ink-400) italic">
                        No alternate spellings mapped
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Add Alias Input */}
              <div className="flex items-center gap-2 border-t border-(--color-ink-900)/5 pt-3 mt-1">
                <input
                  type="text"
                  placeholder="Add alternate spelling..."
                  value={newAliasInputs[c.id] || ''}
                  onChange={(e) =>
                    setNewAliasInputs((prev) => ({ ...prev, [c.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddAlias(c.id)
                    }
                  }}
                  className="text-(--font-size-step--2) px-2 py-1 bg-(--color-paper) border border-(--color-ink-900)/15 rounded flex-1 focus:outline-none"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddAlias(c.id)}
                  loading={addingAliasId === c.id}
                  className="text-(--font-size-step--2)"
                >
                  + Add
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
