'use client'

import React, { useState } from 'react'

export function TalentPoolForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [domainInterest, setDomainInterest] = useState('Sales & Business Development')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/console/talent-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          domainInterest,
        }),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Failed to submit profile. Please try again.')
      }
    } catch {
      // Offline / optimistic fallback
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <span className="font-mono text-(--color-leaf) font-bold text-(--font-size-step-0) block mb-2">
          ✓ Profile Registered
        </span>
        <p className="text-(--font-size-step--1) text-(--color-text-on-dark-muted)">
          Thank you, {fullName}. Our recruitment team will review your profile and reach out when relevant opportunities open.
        </p>
      </div>
    )
  }

  return (
    <form data-testid="talent-pool-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="p-3 bg-(--color-kumkum)/20 border border-(--color-kumkum) rounded-md text-(--font-size-step--1) text-(--color-text-on-dark)">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="talent-full-name" className="block text-(--font-size-step--1) font-mono uppercase text-(--color-text-on-dark-muted) mb-1.5 font-medium">
          Full Name
        </label>
        <input
          id="talent-full-name"
          type="text"
          required
          aria-label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Rahul Sharma"
          className="w-full h-12 px-3.5 bg-(--color-ink-800) border border-(--color-ink-500) rounded-md text-(--color-text-on-dark) text-(--font-size-step-0) placeholder:text-(--color-text-on-dark-muted)/50 focus-visible:outline-2 focus-visible:outline-(--color-amber-400)"
        />
      </div>

      <div>
        <label htmlFor="talent-email" className="block text-(--font-size-step--1) font-mono uppercase text-(--color-text-on-dark-muted) mb-1.5 font-medium">
          Email Address
        </label>
        <input
          id="talent-email"
          type="email"
          required
          aria-label="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. rahul.sharma@gmail.com"
          className="w-full h-12 px-3.5 bg-(--color-ink-800) border border-(--color-ink-500) rounded-md text-(--color-text-on-dark) text-(--font-size-step-0) placeholder:text-(--color-text-on-dark-muted)/50 focus-visible:outline-2 focus-visible:outline-(--color-amber-400)"
        />
      </div>

      <div>
        <label htmlFor="talent-domain" className="block text-(--font-size-step--1) font-mono uppercase text-(--color-text-on-dark-muted) mb-1.5 font-medium">
          Domain of Interest
        </label>
        <select
          id="talent-domain"
          aria-label="Domain of Interest"
          value={domainInterest}
          onChange={(e) => setDomainInterest(e.target.value)}
          className="w-full h-12 px-3.5 bg-(--color-ink-800) border border-(--color-ink-500) rounded-md text-(--color-text-on-dark) text-(--font-size-step-0) focus-visible:outline-2 focus-visible:outline-(--color-amber-400)"
        >
          <option value="Sales & Business Development">Sales & Business Development</option>
          <option value="Operations & Verification">Operations & Verification</option>
          <option value="Credit & Risk Underwriting">Credit & Risk Underwriting</option>
          <option value="Software & Platform Engineering">Software & Platform Engineering</option>
        </select>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn btn--md btn--primary w-full sm:w-auto min-w-[180px]"
        >
          {submitting ? 'Registering...' : 'Join Talent Pool →'}
        </button>
      </div>
    </form>
  )
}
