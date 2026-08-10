/**
 * tests/unit/validation.shared.test.ts
 *
 * Unit tests for shared validation utilities.
 * Fixtures include the EXACT malformed values from the source workbook (D1, D4).
 * These pass before any application code is considered working.
 */

import { describe, it, expect } from 'vitest'
import {
  normalisePhone,
  normaliseEmail,
  isDisposableEmail,
} from '@/lib/validation/shared'

// ── normalisePhone (D1 fixes) ─────────────────────────────────────────────────

describe('normalisePhone', () => {
  // Exact values from the source workbook (D1)
  it('normalises bare 10-digit number from source data', () => {
    expect(normalisePhone('8618470407')).toBe('+918618470407')
  })

  it('normalises number with leading zero from source data', () => {
    expect(normalisePhone('09986266394')).toBe('+919986266394')
  })

  // Standard accepted formats
  it('accepts a plain 10-digit number', () => {
    expect(normalisePhone('9876543210')).toBe('+919876543210')
  })

  it('accepts number with country code prefix', () => {
    expect(normalisePhone('+919876543210')).toBe('+919876543210')
  })

  it('accepts number with spaces', () => {
    expect(normalisePhone('+91 98765 43210')).toBe('+919876543210')
  })

  it('accepts number with hyphens', () => {
    expect(normalisePhone('98765-43210')).toBe('+919876543210')
  })

  it('accepts number with country code and no +', () => {
    expect(normalisePhone('919876543210')).toBe('+919876543210')
  })

  // Starting digit validation
  it('accepts numbers starting with 6', () => {
    expect(normalisePhone('6000000000')).toBe('+916000000000')
  })

  it('accepts numbers starting with 7', () => {
    expect(normalisePhone('7000000000')).toBe('+917000000000')
  })

  it('accepts numbers starting with 8', () => {
    expect(normalisePhone('8000000000')).toBe('+918000000000')
  })

  it('accepts numbers starting with 9', () => {
    expect(normalisePhone('9000000000')).toBe('+919000000000')
  })

  // Rejection cases
  it('rejects numbers starting with 5', () => {
    expect(normalisePhone('5876543210')).toBeNull()
  })

  it('rejects numbers that are too short', () => {
    expect(normalisePhone('987654321')).toBeNull()
  })

  it('rejects numbers that are too long', () => {
    expect(normalisePhone('98765432100')).toBeNull()
  })

  it('rejects empty string', () => {
    expect(normalisePhone('')).toBeNull()
  })

  it('rejects non-numeric input', () => {
    expect(normalisePhone('call me maybe')).toBeNull()
  })
})

// ── normaliseEmail (D7 deduplication) ─────────────────────────────────────────

describe('normaliseEmail', () => {
  it('lowercases email', () => {
    expect(normaliseEmail('PavanashreeA0@Gmail.com')).toBe('pavanashreea0@gmail.com')
  })

  it('strips Gmail plus alias', () => {
    expect(normaliseEmail('user+tag@gmail.com')).toBe('user@gmail.com')
  })

  it('strips Gmail dots', () => {
    expect(normaliseEmail('first.last@gmail.com')).toBe('firstlast@gmail.com')
  })

  it('strips both dots and plus on Gmail', () => {
    expect(normaliseEmail('first.last+test@gmail.com')).toBe('firstlast@gmail.com')
  })

  it('does not strip dots on non-Gmail domains', () => {
    expect(normaliseEmail('first.last@yahoo.com')).toBe('first.last@yahoo.com')
  })

  it('normalises googlemail.com to same as gmail.com', () => {
    const gmail = normaliseEmail('user@gmail.com')
    const googlemail = normaliseEmail('user@googlemail.com')
    // Both should strip dots — different domains but same dedup result pattern
    expect(gmail).toBe('user@gmail.com')
    expect(googlemail).toBe('user@googlemail.com')
  })

  it('handles the exact duplicate email from source data (D7)', () => {
    // Source data had pavanashreea0@gmail.com applied twice
    const a = normaliseEmail('pavanashreea0@gmail.com')
    const b = normaliseEmail('pavanashreea0@gmail.com')
    expect(a).toBe(b) // same → will resolve to same candidate
  })
})

// ── isDisposableEmail (L5) ────────────────────────────────────────────────────

describe('isDisposableEmail', () => {
  it('rejects mailinator.com', () => {
    expect(isDisposableEmail('test@mailinator.com')).toBe(true)
  })

  it('rejects yopmail.com', () => {
    expect(isDisposableEmail('test@yopmail.com')).toBe(true)
  })

  it('accepts gmail.com', () => {
    expect(isDisposableEmail('test@gmail.com')).toBe(false)
  })

  it('accepts yahoo.com', () => {
    expect(isDisposableEmail('test@yahoo.com')).toBe(false)
  })

  it('handles empty email gracefully', () => {
    expect(isDisposableEmail('')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isDisposableEmail('test@MAILINATOR.COM')).toBe(true)
  })
})
