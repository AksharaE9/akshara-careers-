/**
 * lib/date/ist.ts
 *
 * Authoritative IST (Asia/Kolkata, UTC+05:30) date formatting, civil boundary calculation,
 * and date preset resolution engine (§14.7, Part 20 §20.1 & D-02).
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000 // +05:30 in milliseconds

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * Converts any Date/ISO string/epoch to civil year, month, day, hours, minutes, seconds in IST.
 */
export function getISTComponents(dateInput: Date | string | number) {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) {
    return { year: 1970, month: 1, day: 1, hours: 0, minutes: 0, seconds: 0, monthName: 'Jan' }
  }
  const istTime = new Date(d.getTime() + IST_OFFSET_MS)
  const year = istTime.getUTCFullYear()
  const month = istTime.getUTCMonth() + 1 // 1-indexed
  const day = istTime.getUTCDate()
  const hours = istTime.getUTCHours()
  const minutes = istTime.getUTCMinutes()
  const seconds = istTime.getUTCSeconds()
  const monthName = MONTHS_SHORT[month - 1] || 'Jan'

  return { year, month, day, hours, minutes, seconds, monthName }
}

/**
 * Unambiguous date formatting: "12 Aug 2026" (D-02).
 */
export function formatISTDate(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '—'
  const { day, monthName, year } = getISTComponents(dateInput)
  return `${day} ${monthName} ${year}`
}

/**
 * Detailed date-time formatting: "12 Aug 2026, 03:47 PM IST" (D-02).
 */
export function formatISTDateTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '—'
  const { day, monthName, year, hours, minutes } = getISTComponents(dateInput)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const paddedMinutes = String(minutes).padStart(2, '0')
  return `${day} ${monthName} ${year}, ${String(displayHours).padStart(2, '0')}:${paddedMinutes} ${ampm} IST`
}

/**
 * Sortable ISO-like civil IST string for CSV/XLSX export: "2026-08-12 15:47:03" (D-02).
 */
export function toISTDateTimeString(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return ''
  const { year, month, day, hours, minutes, seconds } = getISTComponents(dateInput)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${year}-${p(month)}-${p(day)} ${p(hours)}:${p(minutes)}:${p(seconds)}`
}

/**
 * Formats a civil IST date as YYYY-MM-DD.
 */
export function toISTDateOnlyString(dateInput: Date | string | number): string {
  const { year, month, day } = getISTComponents(dateInput)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${year}-${p(month)}-${p(day)}`
}

/**
 * Given a civil date string 'YYYY-MM-DD' (or Date), returns the exact UTC Date
 * representing 00:00:00.000 in Asia/Kolkata on that day.
 * (e.g. 2026-08-12 00:00 IST = 2026-08-11 18:30:00.000Z).
 */
export function istDayStart(dateInput: string | Date): Date {
  let dateStr = typeof dateInput === 'string' ? dateInput.trim() : toISTDateOnlyString(dateInput)
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0]!
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const year = parseInt(yearStr || '2026', 10)
  const month = parseInt(monthStr || '1', 10) - 1
  const day = parseInt(dayStr || '1', 10)

  // Construct UTC timestamp corresponding to 00:00:00 IST
  const utcMillis = Date.UTC(year, month, day, 0, 0, 0, 0) - IST_OFFSET_MS
  return new Date(utcMillis)
}

/**
 * Given a civil date string 'YYYY-MM-DD' (or Date), returns the exact UTC Date
 * representing the EXCLUSIVE upper bound (next day 00:00:00.000 IST).
 * (e.g. 2026-08-12 end exclusive = 2026-08-13 00:00 IST = 2026-08-12 18:30:00.000Z).
 */
export function istDayEndExclusive(dateInput: string | Date): Date {
  let dateStr = typeof dateInput === 'string' ? dateInput.trim() : toISTDateOnlyString(dateInput)
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0]!
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const year = parseInt(yearStr || '2026', 10)
  const month = parseInt(monthStr || '1', 10) - 1
  const day = parseInt(dayStr || '1', 10)

  // Day + 1 at 00:00:00 IST
  const utcMillis = Date.UTC(year, month, day + 1, 0, 0, 0, 0) - IST_OFFSET_MS
  return new Date(utcMillis)
}

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'all_time'
  | 'custom'

export type DatePresetId = DatePreset

export interface ResolvedDateRange {
  preset: DatePreset
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD (civil inclusive)
  startDate: Date | null // half-open start UTC
  endDateExclusive: Date | null // half-open end UTC
  label: string
  compareStartDate?: Date | null
  compareEndDateExclusive?: Date | null
  isCustom: boolean
}

export type ResolvedRange = ResolvedDateRange

/**
 * Resolves presets into civil date strings, UTC half-open bounds, human-readable labels,
 * and baseline comparison intervals (§20.1.3).
 */
export function resolveDatePreset(
  preset: DatePreset = 'last30',
  customFrom?: string,
  customTo?: string,
  nowInput: Date = new Date()
): ResolvedDateRange {
  const p = (n: number) => String(n).padStart(2, '0')
  const nowIST = getISTComponents(nowInput)
  const todayStr = `${nowIST.year}-${p(nowIST.month)}-${p(nowIST.day)}`

  if (preset === 'all_time') {
    return {
      preset: 'all_time',
      from: '',
      to: '',
      startDate: null,
      endDateExclusive: null,
      label: 'All Time',
      isCustom: false,
    }
  }

  if (preset === 'custom') {
    let fromStr = customFrom?.trim() || todayStr
    let toStr = customTo?.trim() || todayStr

    // Swap if reversed
    if (fromStr > toStr) {
      const temp = fromStr
      fromStr = toStr
      toStr = temp
    }

    // Cap custom range at 366 days
    const start = istDayStart(fromStr)
    const endExclusive = istDayEndExclusive(toStr)
    const diffDays = Math.round((endExclusive.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))

    let cappedToStr = toStr
    let cappedEndExclusive = endExclusive
    if (diffDays > 366) {
      const maxEnd = new Date(start.getTime() + 366 * 24 * 60 * 60 * 1000)
      cappedToStr = toISTDateOnlyString(new Date(maxEnd.getTime() - 1000))
      cappedEndExclusive = istDayEndExclusive(cappedToStr)
    }

    const startComp = getISTComponents(start)
    const endComp = getISTComponents(new Date(cappedEndExclusive.getTime() - 1000))

    const label = `${startComp.day} ${startComp.monthName} ${startComp.year} – ${endComp.day} ${endComp.monthName} ${endComp.year}`

    return {
      preset: 'custom',
      from: fromStr,
      to: cappedToStr,
      startDate: start,
      endDateExclusive: cappedEndExclusive,
      label,
      isCustom: true,
    }
  }

  let fromDateStr = todayStr
  let toDateStr = todayStr

  if (preset === 'today') {
    fromDateStr = todayStr
    toDateStr = todayStr
  } else if (preset === 'yesterday') {
    const yesterdayDate = new Date(istDayStart(todayStr).getTime() - 24 * 60 * 60 * 1000)
    const yIST = getISTComponents(yesterdayDate)
    fromDateStr = `${yIST.year}-${p(yIST.month)}-${p(yIST.day)}`
    toDateStr = fromDateStr
  } else if (preset === 'last7') {
    // 7 days inclusive: today - 6 days through today
    const sevenDaysAgo = new Date(istDayStart(todayStr).getTime() - 6 * 24 * 60 * 60 * 1000)
    const sIST = getISTComponents(sevenDaysAgo)
    fromDateStr = `${sIST.year}-${p(sIST.month)}-${p(sIST.day)}`
    toDateStr = todayStr
  } else if (preset === 'last30') {
    // 30 days inclusive: today - 29 days through today
    const thirtyDaysAgo = new Date(istDayStart(todayStr).getTime() - 29 * 24 * 60 * 60 * 1000)
    const tIST = getISTComponents(thirtyDaysAgo)
    fromDateStr = `${tIST.year}-${p(tIST.month)}-${p(tIST.day)}`
    toDateStr = todayStr
  } else if (preset === 'this_month') {
    fromDateStr = `${nowIST.year}-${p(nowIST.month)}-01`
    toDateStr = todayStr
  } else if (preset === 'last_month') {
    const prevMonth = nowIST.month === 1 ? 12 : nowIST.month - 1
    const prevYear = nowIST.month === 1 ? nowIST.year - 1 : nowIST.year
    const lastDayPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate()
    fromDateStr = `${prevYear}-${p(prevMonth)}-01`
    toDateStr = `${prevYear}-${p(prevMonth)}-${p(lastDayPrevMonth)}`
  } else if (preset === 'this_quarter') {
    const quarterStartMonth = Math.floor((nowIST.month - 1) / 3) * 3 + 1
    fromDateStr = `${nowIST.year}-${p(quarterStartMonth)}-01`
    toDateStr = todayStr
  }

  const startDate = istDayStart(fromDateStr)
  const endDateExclusive = istDayEndExclusive(toDateStr)

  // Label formatting
  const startComp = getISTComponents(startDate)
  const endComp = getISTComponents(new Date(endDateExclusive.getTime() - 1000))
  const label =
    fromDateStr === toDateStr
      ? `${startComp.day} ${startComp.monthName} ${startComp.year}`
      : `${startComp.day} ${startComp.monthName} – ${endComp.day} ${endComp.monthName} ${endComp.year}`

  // Calculate prior period of equal length for comparison
  const durationMs = endDateExclusive.getTime() - startDate.getTime()
  const compareStartDate = new Date(startDate.getTime() - durationMs)
  const compareEndDateExclusive = startDate

  return {
    preset,
    from: fromDateStr,
    to: toDateStr,
    startDate,
    endDateExclusive,
    label,
    compareStartDate,
    compareEndDateExclusive,
    isCustom: false,
  }
}
