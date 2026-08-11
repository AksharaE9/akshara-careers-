/**
 * lib/security/client-ip.ts
 *
 * Extracts and normalizes the client IP address from a request, for use as
 * a rate-limiting / brute-force-lockout key.
 *
 * F12 (2026-08-11 verification campaign): candidate login lockout appeared
 * to intermittently fail to engage — reproduced deterministically on
 * Firefox only, never on Chromium, and never via a plain Node fetch
 * reproduction script. Root cause: on this machine, "localhost" resolves
 * to different loopback addresses depending on which network stack
 * resolves it — Playwright's own Node-based `page.request` API context
 * consistently used one representation, while different browser engines'
 * own fetch/XHR implementations used another. The 5 logged failures and
 * the final lockout check ended up keyed on two different IP strings for
 * the exact same client, so the failure count the lockout check saw was 0,
 * not 5.
 *
 * This isn't purely a local-dev artifact: any dual-stack client, proxy, or
 * load balancer that can present a request over either IPv4 or IPv6 for
 * the same underlying connection has the same fragility against a literal
 * string-equality rate-limit key. Normalizing collapses the common
 * loopback and IPv4-mapped-IPv6 cases so the same real client always maps
 * to the same key.
 */
export function getClientIp(headers: {
  get(name: string): string | null
}): string {
  const raw =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    '127.0.0.1'

  return normalizeIp(raw)
}

export function normalizeIp(raw: string): string {
  const trimmed = raw.trim()

  // IPv6 loopback -> canonical IPv4 loopback
  if (trimmed === '::1') return '127.0.0.1'

  // IPv4-mapped IPv6 (::ffff:127.0.0.1) -> the IPv4 form it's mapping
  const mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (mapped?.[1]) return mapped[1]

  return trimmed
}
