'use client'

/**
 * app/console/content/page.tsx
 *
 * Screen 11 — CMS Content Blocks Management (§14.15).
 * Modifies public copy with design-safe character limits and audit logging.
 */

import React, { useState, useEffect } from 'react'

interface ContentBlockItem {
  slug: string
  label: string
  charLimit: number
  content: string
}

export default function ContentManagementPage() {
  const [blocks, setBlocks] = useState<ContentBlockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)

  const fetchBlocks = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/console/content')
      if (res.ok) {
        const json = await res.json()
        setBlocks(json.blocks || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBlocks()
  }, [])

  const handleSave = async (slug: string, content: string) => {
    try {
      const res = await fetch('/api/console/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, content }),
      })
      if (res.ok) {
        setSavedSlug(slug)
        setTimeout(() => setSavedSlug(null), 2500)
      }
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-(--color-ink-900)/10">
        <div>
          <span className="font-mono text-(--font-size-step--2) uppercase text-(--color-graphite) font-semibold tracking-wider">
            Copy & Landing Page CMS
          </span>
          <h1 className="text-(--font-size-step-2) font-bold text-(--color-ink-900) tracking-tight">
            Content Blocks
          </h1>
        </div>
      </div>

      <div className="space-y-4">
        {blocks.map((block) => {
          const isSaved = savedSlug === block.slug
          return (
            <div key={block.slug} className="p-5 bg-white border border-(--color-ink-900)/10 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-(--font-size-step-0) text-(--color-ink-900)">{block.label}</h3>
                  <span className="font-mono text-(--font-size-step--2) text-(--color-graphite)">slug: {block.slug}</span>
                </div>
                <span className="font-mono text-(--font-size-step--2) px-2 py-0.5 rounded bg-(--color-ink-900)/5 text-(--color-ink-600)">
                  Max {block.charLimit} chars
                </span>
              </div>

              <textarea
                value={block.content}
                maxLength={block.charLimit}
                onChange={(e) => {
                  const val = e.target.value
                  setBlocks((prev) => prev.map((b) => (b.slug === block.slug ? { ...b, content: val } : b)))
                }}
                rows={3}
                className="w-full p-3 border border-(--color-ink-900)/15 rounded-lg text-(--font-size-step--1) focus:outline-none focus:border-(--color-marigold)"
              />

              <div className="flex items-center justify-between">
                <span className="font-mono text-(--font-size-step--2) text-(--color-graphite)">
                  {block.content.length} / {block.charLimit} characters
                </span>
                <div className="flex items-center gap-2">
                  {isSaved && (
                    <span className="text-(--font-size-step--2) text-(--color-leaf) font-medium font-mono">
                      ✓ Published & Audit Logged
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSave(block.slug, block.content)}
                    className="px-3.5 py-1.5 rounded-lg bg-(--color-marigold) text-white text-(--font-size-step--1) font-semibold hover:bg-(--color-marigold)/90 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
