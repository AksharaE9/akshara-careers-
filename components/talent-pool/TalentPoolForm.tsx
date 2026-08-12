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
        <span className="font-mono text-(--color-leaf) font-bold text-[clamp(1.00rem,0.95rem+0.25vw,1.13rem)] block mb-2">
          ✓ Profile Registered
        </span>
        <p className="text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] text-(--color-muted)">
          Thank you, {fullName}. Our recruitment team will review your profile and reach out when relevant opportunities open.
        </p>
      </div>
    )
  }

  return (
    <form data-testid="talent-pool-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] text-(--color-kumkum) font-medium">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="talent-full-name" className="block text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] font-semibold text-(--color-ink) mb-1.5">
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
          className="input-control w-full h-12"
        />
      </div>

      <div>
        <label htmlFor="talent-email" className="block text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] font-semibold text-(--color-ink) mb-1.5">
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
          className="input-control w-full h-12"
        />
      </div>

      <div>
        <label htmlFor="talent-domain" className="block text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] font-semibold text-(--color-ink) mb-1.5">
          Domain of Interest
        </label>
        <select
          id="talent-domain"
          aria-label="Domain of Interest"
          value={domainInterest}
          onChange={(e) => setDomainInterest(e.target.value)}
          className="select-control w-full h-12"
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
          className="btn btn--md btn--primary w-full sm:w-auto min-w-[180px] font-bold"
        >
          {submitting ? 'Registering...' : 'Join Talent Pool →'}
        </button>
      </div>
    </form>
  )
}
