/**
 * lib/ratelimit/export-limit.ts
 *
 * Rate limiter for console data exports: 10 exports per user per hour (§20.2.4).
 */

interface RateLimitRecord {
  count: number
  resetAt: number
}

const exportRateLimitMap = new Map<string, RateLimitRecord>()

const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_EXPORTS_PER_WINDOW = 10

export function checkExportRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const record = exportRateLimitMap.get(userId)

  if (!record || now > record.resetAt) {
    const newRecord: RateLimitRecord = { count: 1, resetAt: now + WINDOW_MS }
    exportRateLimitMap.set(userId, newRecord)
    return { allowed: true, remaining: MAX_EXPORTS_PER_WINDOW - 1, resetAt: newRecord.resetAt }
  }

  if (record.count >= MAX_EXPORTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  record.count += 1
  return { allowed: true, remaining: MAX_EXPORTS_PER_WINDOW - record.count, resetAt: record.resetAt }
}
