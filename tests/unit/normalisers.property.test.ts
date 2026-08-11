/**
 * tests/unit/normalisers.property.test.ts
 *
 * Property-based tests for normalisePhone and normaliseEmail using fast-check.
 *
 * Properties verified:
 *   Phone:
 *     P1. Idempotency:         normalise(normalise(x)) === normalise(x)
 *     P2. E.164 format:        all valid outputs start with '+91' and are 13 chars
 *     P3. 10-digit coverage:   any 10-digit number starting with [6-9] → valid
 *     P4. Prefix variants:     '0XXXXXXXXXX' and '91XXXXXXXXXX' canonicalize
 *     P5. Invalid rejection:   numbers < 10 digits, starting with [0-5], return null
 *
 *   Email:
 *     E1. Idempotency:         normalise(normalise(x)) === normalise(x)
 *     E2. Always lowercase:    output never contains uppercase
 *     E3. Gmail dot-strip:     dots in local part removed for @gmail.com only
 *     E4. Gmail plus-strip:    +alias suffix removed for @gmail.com only
 *     E5. Non-Gmail intact:    dots/plus preserved for other domains
 *     E6. Domain isolation:    @googlemail.com treated same as @gmail.com
 *     E7. Non-gmail injectivity: two distinct non-gmail emails → distinct outputs
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { normalisePhone, normaliseEmail } from '@/lib/validation/shared'

// ─── Phone Property Tests ────────────────────────────────────────────────────

describe('normalisePhone — property tests', () => {

  // P1: Idempotency — normalising twice is the same as normalising once
  it('P1: idempotent for any 10-digit valid number', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 9 }).chain((first) =>
          fc.tuple(
            fc.constant(first),
            fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 }),
          )
        ),
        ([first, rest]) => {
          const raw = `${first}${rest.join('')}`
          const once = normalisePhone(raw)
          if (!once) return true // If rejected, idempotency is vacuously satisfied
          const twice = normalisePhone(once)
          return once === twice
        },
      ),
      { numRuns: 200 },
    )
  })

  // P2: E.164 format — all valid outputs are exactly '+91XXXXXXXXXX' (13 chars)
  it('P2: all valid outputs are exactly +91[6-9]XXXXXXXXX in E.164 format', () => {
    const validSamples = [
      '9876543210', '8765432109', '7654321098', '6543210987',
      '+919876543210', '09876543210', '919876543210',
    ]
    for (const sample of validSamples) {
      const result = normalisePhone(sample)
      if (result !== null) {
        expect(result).toMatch(/^\+91[6-9]\d{9}$/)
        expect(result).toHaveLength(13)
      }
    }
  })

  // P3: 10-digit coverage — any valid 10-digit number starting with [6-9] → non-null
  it('P3: any 10-digit number starting with [6-9] normalises successfully', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 9 }).chain((first) =>
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 }).map(
            (rest) => `${first}${rest.join('')}`,
          )
        ),
        (phone) => {
          return normalisePhone(phone) !== null
        },
      ),
      { numRuns: 200 },
    )
  })

  // P4: Prefix variants — 0-prefix (11 digits) and 91-prefix (12 digits) work
  it('P4: 0XXXXXXXXXX and 91XXXXXXXXXX variants normalise to same output', () => {
    const base = '9876543210'
    const withZero = `0${base}`
    const with91 = `91${base}`
    const withPlus91 = `+91${base}`

    const r1 = normalisePhone(base)
    const r2 = normalisePhone(withZero)
    const r3 = normalisePhone(with91)
    const r4 = normalisePhone(withPlus91)

    expect(r1).not.toBeNull()
    expect(r1).toBe(r2)
    expect(r1).toBe(r3)
    expect(r1).toBe(r4)
  })

  // P5: Invalid numbers return null
  it('P5: numbers starting with [0-5] are rejected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }).chain((first) =>
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 }).map(
            (rest) => `${first}${rest.join('')}`,
          )
        ),
        (phone) => {
          return normalisePhone(phone) === null
        },
      ),
      { numRuns: 100 },
    )
  })

  it('P5b: numbers shorter than 10 digits are rejected', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 9 }).map(
          (digits) => digits.join(''),
        ),
        (phone) => {
          return normalisePhone(phone) === null
        },
      ),
      { numRuns: 100 },
    )
  })

  it('P5c: numbers longer than 12 digits are rejected', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 13, maxLength: 18 }).map(
          (digits) => digits.join(''),
        ),
        (phone) => {
          return normalisePhone(phone) === null
        },
      ),
      { numRuns: 100 },
    )
  })

  // Spot checks for common source-data formats
  it('Spot check: common source data formats', () => {
    expect(normalisePhone('9876543210')).toBe('+919876543210')
    expect(normalisePhone('09876543210')).toBe('+919876543210')
    expect(normalisePhone('+91 98765 43210')).toBe('+919876543210')
    expect(normalisePhone('+919876543210')).toBe('+919876543210')
    expect(normalisePhone('8618470407')).toBe('+918618470407')
    expect(normalisePhone('00919876543210')).toBeNull()  // double country code
    expect(normalisePhone('12345')).toBeNull()
    expect(normalisePhone('5876543210')).toBeNull()  // starts with 5
  })
})

// ─── Email Property Tests ────────────────────────────────────────────────────

describe('normaliseEmail — property tests', () => {

  // E1: Idempotency
  it('E1: idempotent for any valid email', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const once = normaliseEmail(email)
          const twice = normaliseEmail(once)
          return once === twice
        },
      ),
      { numRuns: 200 },
    )
  })

  // E2: Always lowercase output
  it('E2: output is always lowercase', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const result = normaliseEmail(email)
          return result === result.toLowerCase()
        },
      ),
      { numRuns: 200 },
    )
  })

  // E3: Gmail dot-stripping — only for gmail.com and googlemail.com
  it('E3: dots removed from local part for gmail.com', () => {
    const cases = [
      { input: 'first.last@gmail.com', expected: 'firstlast@gmail.com' },
      { input: 'a.b.c@gmail.com', expected: 'abc@gmail.com' },
      { input: 'First.Last@Gmail.com', expected: 'firstlast@gmail.com' },
    ]
    for (const { input, expected } of cases) {
      expect(normaliseEmail(input)).toBe(expected)
    }
  })

  it('E3b: dots NOT removed for non-gmail domains', () => {
    const cases = [
      { input: 'first.last@yahoo.com', expected: 'first.last@yahoo.com' },
      { input: 'a.b@outlook.com', expected: 'a.b@outlook.com' },
      { input: 'a.b@company.in', expected: 'a.b@company.in' },
    ]
    for (const { input, expected } of cases) {
      expect(normaliseEmail(input)).toBe(expected)
    }
  })

  // E4: Gmail plus-stripping — only for gmail.com
  it('E4: +alias suffix stripped for gmail.com', () => {
    const cases = [
      { input: 'user+tag@gmail.com', expected: 'user@gmail.com' },
      { input: 'user+newsletter@gmail.com', expected: 'user@gmail.com' },
      { input: 'first.last+tag@gmail.com', expected: 'firstlast@gmail.com' },
    ]
    for (const { input, expected } of cases) {
      expect(normaliseEmail(input)).toBe(expected)
    }
  })

  it('E4b: +alias NOT stripped for non-gmail domains', () => {
    const cases = [
      { input: 'user+tag@yahoo.com', expected: 'user+tag@yahoo.com' },
      { input: 'user+tag@outlook.com', expected: 'user+tag@outlook.com' },
      { input: 'user+tag@company.in', expected: 'user+tag@company.in' },
    ]
    for (const { input, expected } of cases) {
      expect(normaliseEmail(input)).toBe(expected)
    }
  })

  // E5: Non-Gmail addresses are just lowercased — structure preserved
  it('E5: non-gmail emails are lowercased only', () => {
    fc.assert(
      fc.property(
        fc.emailAddress().filter((e) => !e.includes('@gmail') && !e.includes('@googlemail')),
        (email) => {
          const result = normaliseEmail(email)
          return result === email.toLowerCase().trim()
        },
      ),
      { numRuns: 200 },
    )
  })

  // E6: googlemail.com treated same as gmail.com
  it('E6: googlemail.com treated same as gmail.com', () => {
    expect(normaliseEmail('first.last+tag@googlemail.com')).toBe('firstlast@googlemail.com')
    expect(normaliseEmail('a.b.c@googlemail.com')).toBe('abc@googlemail.com')
  })

  // E7: Non-gmail injectivity — two distinct emails → distinct normalised forms
  it('E7: distinct non-gmail emails produce distinct normalised forms', () => {
    // Since non-gmail emails are just lowercased (dots/plus preserved),
    // two distinct emails with different local parts must stay distinct
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.emailAddress().filter((e) => !e.includes('@gmail') && !e.includes('@googlemail')),
          { minLength: 2, maxLength: 2 },
        ),
        ([email1, email2]) => {
          // fc.uniqueArray(..., { minLength: 2, maxLength: 2 }) always yields
          // exactly 2 elements, but its type is string[], not a 2-tuple.
          if (email1 === undefined || email2 === undefined) {
            throw new Error('fc.uniqueArray violated its minLength/maxLength: 2 contract')
          }
          const n1 = normaliseEmail(email1)
          const n2 = normaliseEmail(email2)
          // If they normalise to the same thing, they must already be case-identical
          if (n1 === n2) {
            return email1.toLowerCase().trim() === email2.toLowerCase().trim()
          }
          return n1 !== n2
        },
      ),
      { numRuns: 200 },
    )
  })

  // Security: dot/plus merging restricted to Gmail only (D7 comment)
  it('Security: Gmail dot merge does NOT collapse unrelated identities from other domains', () => {
    // john.doe@company.in and johndoe@company.in are DIFFERENT people
    const with_dot = normaliseEmail('john.doe@company.in')
    const without_dot = normaliseEmail('johndoe@company.in')
    expect(with_dot).toBe('john.doe@company.in')
    expect(without_dot).toBe('johndoe@company.in')
    expect(with_dot).not.toBe(without_dot)
  })

  it('Security: plus stripping does NOT affect non-Gmail domains', () => {
    // user+tag@company.in and user@company.in are DIFFERENT addresses
    const with_plus = normaliseEmail('user+tag@company.in')
    const without_plus = normaliseEmail('user@company.in')
    expect(with_plus).toBe('user+tag@company.in')
    expect(without_plus).toBe('user@company.in')
    expect(with_plus).not.toBe(without_plus)
  })
})
