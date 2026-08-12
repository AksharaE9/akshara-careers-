/**
 * tests/unit/ist-date.test.ts
 *
 * Tests for lib/date/ist.ts (Part 20 §20.1 & D-02).
 */

import { describe, it, expect } from 'vitest'
import {
  formatISTDate,
  formatISTDateTime,
  toISTDateTimeString,
  istDayStart,
  istDayEndExclusive,
  resolveDatePreset,
} from '@/lib/date/ist'

describe('IST Date Utilities & Boundary Logic (Part 20 §20.1 & D-02)', () => {
  // Frozen test time: 12 Aug 2026, 15:47:03 IST (10:17:03 UTC)
  const frozenDate = new Date('2026-08-12T10:17:03.000Z')

  it('formats dates in unambiguous format "12 Aug 2026" without M/D/Y confusion', () => {
    expect(formatISTDate(frozenDate)).toBe('12 Aug 2026')
    expect(formatISTDate('2026-12-08T00:00:00.000Z')).toBe('8 Dec 2026')
  })

  it('formats date-time in IST with AM/PM and timezone marker', () => {
    expect(formatISTDateTime(frozenDate)).toBe('12 Aug 2026, 03:47 PM IST')
  })

  it('generates sortable ISO-like civil string for CSV export', () => {
    expect(toISTDateTimeString(frozenDate)).toBe('2026-08-12 15:47:03')
  })

  it('correctly maps late evening UTC times to next IST civil day (IST correctness)', () => {
    // 20:00 UTC on Aug 12 is 01:30 IST on Aug 13
    const lateUtc = new Date('2026-08-12T20:00:00.000Z')
    expect(formatISTDate(lateUtc)).toBe('13 Aug 2026')
  })

  it('computes exact half-open UTC boundaries for IST civil days', () => {
    const start = istDayStart('2026-08-12')
    const endExclusive = istDayEndExclusive('2026-08-12')

    // 00:00:00 IST on Aug 12 is 18:30:00 UTC on Aug 11
    expect(start.toISOString()).toBe('2026-08-11T18:30:00.000Z')

    // 00:00:00 IST on Aug 13 (end of Aug 12) is 18:30:00 UTC on Aug 12
    expect(endExclusive.toISOString()).toBe('2026-08-12T18:30:00.000Z')

    // An event at 23:55 IST on Aug 12 (18:25 UTC Aug 12) falls inside [start, endExclusive)
    const eventInside = new Date('2026-08-12T18:25:00.000Z')
    expect(eventInside.getTime() >= start.getTime()).toBe(true)
    expect(eventInside.getTime() < endExclusive.getTime()).toBe(true)

    // An event at 00:05 IST on Aug 13 (18:35 UTC Aug 12) falls OUTSIDE [start, endExclusive)
    const eventOutside = new Date('2026-08-12T18:35:00.000Z')
    expect(eventOutside.getTime() < endExclusive.getTime()).toBe(false)
  })

  it('resolves presets against frozen clock correctly', () => {
    const todayRes = resolveDatePreset('today', undefined, undefined, frozenDate)
    expect(todayRes.from).toBe('2026-08-12')
    expect(todayRes.to).toBe('2026-08-12')
    expect(todayRes.label).toBe('12 Aug 2026')

    const last7Res = resolveDatePreset('last7', undefined, undefined, frozenDate)
    expect(last7Res.from).toBe('2026-08-06')
    expect(last7Res.to).toBe('2026-08-12')
    expect(last7Res.label).toBe('6 Aug – 12 Aug 2026')

    const last30Res = resolveDatePreset('last30', undefined, undefined, frozenDate)
    expect(last30Res.from).toBe('2026-07-14')
    expect(last30Res.to).toBe('2026-08-12')
    expect(last30Res.label).toBe('14 Jul – 12 Aug 2026')

    const thisMonthRes = resolveDatePreset('this_month', undefined, undefined, frozenDate)
    expect(thisMonthRes.from).toBe('2026-08-01')
    expect(thisMonthRes.to).toBe('2026-08-12')

    const lastMonthRes = resolveDatePreset('last_month', undefined, undefined, frozenDate)
    expect(lastMonthRes.from).toBe('2026-07-01')
    expect(lastMonthRes.to).toBe('2026-07-31')

    const thisQuarterRes = resolveDatePreset('this_quarter', undefined, undefined, frozenDate)
    expect(thisQuarterRes.from).toBe('2026-07-01')
    expect(thisQuarterRes.to).toBe('2026-08-12')
  })

  it('handles custom ranges: auto-swaps reversed dates and enforces 366-day cap', () => {
    // Reversed
    const reversed = resolveDatePreset('custom', '2026-08-15', '2026-08-01', frozenDate)
    expect(reversed.from).toBe('2026-08-01')
    expect(reversed.to).toBe('2026-08-15')

    // Exceeds 366 days
    const wide = resolveDatePreset('custom', '2025-01-01', '2026-08-12', frozenDate)
    const spanDays = (wide.endDateExclusive!.getTime() - wide.startDate!.getTime()) / (24 * 60 * 60 * 1000)
    expect(spanDays).toBeLessThanOrEqual(367)
  })
})
