/**
 * lib/console/metrics.ts
 *
 * Safe metric builder implementing strict sample-size constraints (Task 2).
 * Prevents statistics fabrication, mock deltas, and decorative sparklines.
 */

export type ComparisonStatus = 'ok' | 'insufficient'

export type ComparisonReason =
  | 'no_previous_period'
  | 'previous_period_empty'
  | 'sample_too_small'
  | 'insufficient_data'

export interface Comparison {
  status: ComparisonStatus
  delta?: string | undefined
  reason?: ComparisonReason | undefined
}

export interface Metric<T = number> {
  value: T
  sampleSize: number
  comparison: Comparison
  computedAt: string
  unavailable?: { reason: string } | undefined
}

export interface DistributionItem {
  key: string
  label: string
  count: number
  share: string // e.g. "58.3%"
}

/**
 * Builds a Metric object, validating sample sizes of current and previous periods.
 * Delta percentage is computed only when both periods have sample sizes >= 20.
 */
export function buildMetric<T>(
  currentValue: T,
  currentSampleSize: number,
  previousValue: number | null | undefined,
  previousSampleSize: number | null | undefined,
  options?: {
    customReason?: ComparisonReason
    isNegativeBetter?: boolean // e.g. completion time - shorter is better
    unit?: string
  }
): Metric<T> {
  const computedAt = new Date().toISOString()

  // Guard: if no previous period provided
  if (previousValue === undefined || previousValue === null || previousSampleSize === undefined || previousSampleSize === null) {
    return {
      value: currentValue,
      sampleSize: currentSampleSize,
      comparison: {
        status: 'insufficient',
        reason: options?.customReason || 'no_previous_period',
      },
      computedAt,
    }
  }

  // Guard: Division by zero / no previous data
  if (previousSampleSize === 0 || previousValue === 0) {
    return {
      value: currentValue,
      sampleSize: currentSampleSize,
      comparison: {
        status: 'insufficient',
        reason: 'previous_period_empty',
      },
      computedAt,
    }
  }

  // Guard: Sample size too small (AA/A rules)
  if (currentSampleSize < 20 || previousSampleSize < 20) {
    return {
      value: currentValue,
      sampleSize: currentSampleSize,
      comparison: {
        status: 'insufficient',
        reason: 'sample_too_small',
      },
      computedAt,
    }
  }

  // Calculate delta percentage change
  let delta = '—'
  const currNum = typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue))
  const prevNum = previousValue

  if (!isNaN(currNum) && !isNaN(prevNum)) {
    const diff = currNum - prevNum
    const change = (diff / prevNum) * 100
    
    // Formatting: e.g. "+14.2%" or "-5.1%"
    const sign = change > 0 ? '+' : ''
    const unit = options?.unit || '%'
    delta = `${sign}${change.toFixed(1)}${unit}`
    if (options?.isNegativeBetter && change < 0) {
      // Highlight positive performance (e.g. faster completion)
      delta += ' faster'
    }
  }

  return {
    value: currentValue,
    sampleSize: currentSampleSize,
    comparison: {
      status: 'ok',
      delta,
    },
    computedAt,
  }
}

/**
 * Builds an honest distribution where shares are computed directly from counts.
 * Returns 0% shares if the total is 0.
 */
export function buildDistribution(
  items: Array<{ key: string; label: string; count: number }>
): DistributionItem[] {
  const total = items.reduce((sum, item) => sum + item.count, 0)

  return items.map((item) => {
    const shareNum = total > 0 ? (item.count / total) * 100 : 0
    return {
      key: item.key,
      label: item.label,
      count: item.count,
      share: `${shareNum.toFixed(1)}%`,
    };
  })
}

/**
 * Safe guard for sparklines.
 * Returns null if points length is less than 5 or all points are zero.
 */
export function sparklineOrNull(points: number[] | null | undefined): number[] | null {
  if (!points || points.length < 5) return null
  const allZero = points.every((val) => val === 0)
  if (allZero) return null
  return points
}

/**
 * Convenience builder to return an unavailable metric (Pipeline not yet built).
 */
export function unavailableMetric<T>(value: T, reason: string): Metric<T> {
  return {
    value,
    sampleSize: 0,
    comparison: {
      status: 'insufficient',
      reason: 'insufficient_data',
    },
    computedAt: new Date().toISOString(),
    unavailable: { reason },
  }
}
