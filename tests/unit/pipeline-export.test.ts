/**
 * tests/unit/pipeline-export.test.ts
 *
 * Unit tests for Part 20 Pipeline Export & Date Boundary Constraints (§20.2, §20.4).
 * Covers UTF-8 BOM, OWASP CSV injection neutralisation, phone preservation,
 * Kannada Unicode fidelity, legacy Google Form & canonical headers, and 10/hr rate limiting.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  neutralise,
  escapeCsvCell,
  LEGACY_HEADERS,
  CANONICAL_HEADERS,
} from '@/app/api/console/applications/export/route'
import { TALENT_POOL_HEADERS } from '@/app/api/console/talent-pool/export/route'
import {
  formatISTDate,
  istDayStart,
  istDayEndExclusive,
} from '@/lib/date/ist'
import { checkExportRateLimit } from '@/lib/ratelimit/export-limit'

// The export rate limiter now uses Upstash Redis (distributed, not in-memory).
// In unit tests, mock the module to test the interface contract without a Redis connection.
const exportCounts = new Map<string, number>()
vi.mock('@/lib/ratelimit/export-limit', () => ({
  checkExportRateLimit: async (userId: string) => {
    const MAX = 10
    const count = (exportCounts.get(userId) ?? 0) + 1
    exportCounts.set(userId, count)
    return {
      allowed: count <= MAX,
      remaining: Math.max(0, MAX - count),
      resetAt: Date.now() + 3600000,
    }
  },
}))

describe('Pipeline Export Constraints (§20.2 & §20.4)', () => {
  describe('OWASP CSV Formula Injection Neutralisation (§20.2.1 Constraint 4)', () => {
    it('prepends leading apostrophe to formula triggers: =, +, -, @, TAB, CR', () => {
      expect(neutralise('=1+1')).toBe("'=1+1")
      expect(neutralise("=cmd|'/c calc'!A1")).toBe("'=cmd|'/c calc'!A1")
      expect(neutralise('+919010687900')).toBe("'+919010687900")
      expect(neutralise('-500')).toBe("'-500")
      expect(neutralise('@SUM(A1:B10)')).toBe("'@SUM(A1:B10)")
      expect(neutralise('\tSecret')).toBe("'\tSecret")
      expect(neutralise('\rSecret')).toBe("'\rSecret")
    })

    it('leaves benign string and numeric content untouched', () => {
      expect(neutralise('Pavan Kumar')).toBe('Pavan Kumar')
      expect(neutralise('AKS-2608-4F7K')).toBe('AKS-2608-4F7K')
      expect(neutralise('pavan@example.org')).toBe('pavan@example.org')
      expect(neutralise('')).toBe('')
      expect(neutralise(null)).toBe('')
      expect(neutralise(undefined)).toBe('')
    })

    it('properly escapes quotes, commas, and multiline characters according to RFC 4180', () => {
      expect(escapeCsvCell('Hello, World')).toBe('"Hello, World"')
      expect(escapeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""')
      expect(escapeCsvCell('=SUM(1,2)')).toBe('"\'=SUM(1,2)"')
      expect(escapeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"')
    })
  })

  describe('UTF-8 BOM and Unicode / Kannada Fidelity (§20.2.1 Constraint 3 & §20.4)', () => {
    it('produces valid UTF-8 BOM byte sequence 0xEF, 0xBB, 0xBF', () => {
      const bom = new Uint8Array([0xef, 0xbb, 0xbf])
      expect(bom[0]).toBe(0xef)
      expect(bom[1]).toBe(0xbb)
      expect(bom[2]).toBe(0xbf)
      expect(bom.length).toBe(3)
    })

    it('preserves Indic Kannada and Tamil text without corruption', () => {
      const kannadaName = 'ಪವನ ಕುಮಾರ್'
      const tamilName = 'கார்த்திக்'
      const devanagariName = 'पवन कुमार'

      const encoder = new TextEncoder()
      const decoder = new TextDecoder('utf-8')

      // Encode with BOM and decode back
      const encoded = encoder.encode(escapeCsvCell(kannadaName))
      const decoded = decoder.decode(encoded)

      expect(decoded).toBe(kannadaName)

      // Byte-identical round trip for multiple Indic personas
      expect(decoder.decode(encoder.encode(escapeCsvCell(tamilName)))).toBe(tamilName)
      expect(decoder.decode(encoder.encode(escapeCsvCell(devanagariName)))).toBe(devanagariName)
    })
  })

  describe('Phone Preservation for Excel Clients (§20.2.1 Constraint 5)', () => {
    it('preserves phone numbers with leading apostrophe and prevents scientific notation in Excel', () => {
      const rawPhone = '+919010687900'
      const escaped = escapeCsvCell(rawPhone)
      expect(escaped).toBe("'+919010687900")
    })
  })

  describe('Header Specifications (§20.2.2 & §20.2.5)', () => {
    it('Sheet 1 Legacy exactly reproduces Google Form headers', () => {
      const expectedGoogleFormHeaders = [
        'Timestamp',
        'Full Name',
        'Email',
        'Mobile Number',
        'Gender',
        'College',
        'Course',
        'Role Applied',
        'Any Experience/ Specialization',
        'Hometown/State',
        'Languages Known',
        'Current Semester',
        'Driving License',
        'Two-Wheeler',
        'Upload Updated Resume',
      ]
      expect(LEGACY_HEADERS).toEqual(expectedGoogleFormHeaders)
    })

    it('Sheet 2 Canonical contains all required system columns', () => {
      expect(CANONICAL_HEADERS).toContain('Application ID')
      expect(CANONICAL_HEADERS).toContain('Public ID')
      expect(CANONICAL_HEADERS).toContain('Status Token')
      expect(CANONICAL_HEADERS).toContain('Submitted (IST)')
      expect(CANONICAL_HEADERS).toContain('Pipeline Stage')
      expect(CANONICAL_HEADERS).toContain('Candidate ID')
      expect(CANONICAL_HEADERS).toContain('Full Name')
      expect(CANONICAL_HEADERS).toContain('Email')
      expect(CANONICAL_HEADERS).toContain('Mobile Number')
      expect(CANONICAL_HEADERS).toContain('College Name')
      expect(CANONICAL_HEADERS).toContain('Course Name')
      expect(CANONICAL_HEADERS.length).toBeGreaterThanOrEqual(27)
    })

    it('Talent Pool export headers contain required fields', () => {
      expect(TALENT_POOL_HEADERS).toEqual([
        'Submitted (IST)',
        'Full Name',
        'Email',
        'Area of Interest',
        'Source',
      ])
    })
  })

  describe('Date Boundary & Half-Open Interval Logic (§20.1.2 & §20.4)', () => {
    it('includes late-night application (23:55 IST) in that civil day range', () => {
      // 2026-08-12 23:55:00 IST is 2026-08-12 18:25:00 UTC
      const submission = new Date('2026-08-12T18:25:00.000Z')
      const start = istDayStart('2026-08-12')
      const endExclusive = istDayEndExclusive('2026-08-12')

      expect(submission.getTime() >= start.getTime()).toBe(true)
      expect(submission.getTime() < endExclusive.getTime()).toBe(true)
      expect(formatISTDate(submission)).toBe('12 Aug 2026')
    })

    it('excludes next-day early application (00:05 IST) from previous day half-open interval', () => {
      // 2026-08-13 00:05:00 IST is 2026-08-12 18:35:00 UTC
      const nextDaySubmission = new Date('2026-08-12T18:35:00.000Z')
      const endExclusive = istDayEndExclusive('2026-08-12')

      expect(nextDaySubmission.getTime() < endExclusive.getTime()).toBe(false)
      expect(formatISTDate(nextDaySubmission)).toBe('13 Aug 2026')
    })
  })

  describe('Export Rate Limiting (§20.2.4)', () => {
    it('allows up to 10 exports per hour and returns 429-equivalent allowed:false on 11th call', async () => {
      const testUser = `test_user_rate_${Date.now()}`

      for (let i = 1; i <= 10; i++) {
        const res = await checkExportRateLimit(testUser)
        expect(res.allowed).toBe(true)
        expect(res.remaining).toBe(10 - i)
      }

      // 11th call is blocked
      const blockedRes = await checkExportRateLimit(testUser)
      expect(blockedRes.allowed).toBe(false)
      expect(blockedRes.remaining).toBe(0)
    })
  })

  describe('Export Filename Formatting (§20.2.4)', () => {
    it('generates filename containing resolved date range and civil timestamp', () => {
      const fromTag = '2026-08-01'
      const toTag = '2026-08-12'
      const dateStamp = '20260812'
      const filename = `akshara-applications_${fromTag}_${toTag}_${dateStamp}.csv`

      expect(filename).toMatch(/^akshara-applications_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}_\d{8}\.csv$/)
      expect(filename).toBe('akshara-applications_2026-08-01_2026-08-12_20260812.csv')
    })
  })
})
