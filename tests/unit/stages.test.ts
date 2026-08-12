/**
 * tests/unit/stages.test.ts
 *
 * Tests for lib/console/stages.ts (Part 20 D-01).
 * Verifies stage enum exhaustiveness, partition completeness, and arithmetic invariants.
 */

import { describe, it, expect } from 'vitest'
import {
  PIPELINE_STAGES,
  TERMINAL_STAGES,
  ALL_STAGES,
  STAGE_CONFIGS,
} from '@/lib/console/stages'

describe('Recruiter Pipeline Stage Enum Exhaustiveness (D-01)', () => {
  it('contains no duplicate stage identifiers in ALL_STAGES', () => {
    const stageSet = new Set(ALL_STAGES)
    expect(stageSet.size).toBe(ALL_STAGES.length)
  })

  it('partitions stages into disjoint active and terminal groups', () => {
    const pipelineSet = new Set(PIPELINE_STAGES)
    const terminalSet = new Set(TERMINAL_STAGES)

    // Disjoint
    for (const stage of pipelineSet) {
      expect(terminalSet.has(stage as any)).toBe(false)
    }

    // Complete union
    expect(ALL_STAGES.length).toBe(PIPELINE_STAGES.length + TERMINAL_STAGES.length)
    expect(new Set([...PIPELINE_STAGES, ...TERMINAL_STAGES])).toEqual(new Set(ALL_STAGES))
  })

  it('has a complete configuration for every stage in ALL_STAGES', () => {
    for (const stage of ALL_STAGES) {
      const config = STAGE_CONFIGS[stage]
      expect(config).toBeDefined()
      expect(config.id).toBe(stage)
      expect(config.label).toBeTruthy()
      expect(config.shortLabel).toBeTruthy()
      expect(config.textColor).toBeTruthy()
      expect(config.borderColor).toBeTruthy()
      expect(config.badgeColor).toBeTruthy()
      expect(typeof config.isTerminal).toBe('boolean')
    }
  })

  it('correctly calculates total as sum of all active and terminal stage counts', () => {
    const mockCounts: Record<string, number> = {
      received: 5,
      under_review: 12,
      shortlisted: 4,
      interview_scheduled: 7,
      interviewed: 3,
      offered: 2,
      hired: 1,
      rejected: 8,
      withdrawn: 2,
      duplicate: 1,
    }

    const total = ALL_STAGES.reduce((sum, stage) => sum + (mockCounts[stage] || 0), 0)
    expect(total).toBe(45)

    const activeTotal = PIPELINE_STAGES.reduce((sum, stage) => sum + (mockCounts[stage] || 0), 0)
    const terminalTotal = TERMINAL_STAGES.reduce((sum, stage) => sum + (mockCounts[stage] || 0), 0)

    expect(activeTotal + terminalTotal).toBe(total)
  })
})
