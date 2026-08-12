/**
 * lib/console/stages.ts
 *
 * Single source of truth for recruiter pipeline application stages (§14.7, Part 20 D-01, Part 21 §21.5).
 * Compile-time exhaustiveness checks guarantee no DB enum stage is silently excluded from the arithmetic.
 * Uses the warm-adjusted series palette (--color-series-1..6) to harmonise with the warm light field.
 */

import { type applications } from '@/lib/db/schema'

export type DbApplicationStage = NonNullable<typeof applications.$inferSelect.stage>

export const PIPELINE_STAGES = [
  'received',
  'under_review',
  'shortlisted',
  'interview_scheduled',
  'interviewed',
  'offered',
  'hired',
] as const

export const TERMINAL_STAGES = [
  'rejected',
  'withdrawn',
  'duplicate',
] as const

export const ALL_STAGES = [...PIPELINE_STAGES, ...TERMINAL_STAGES] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]
export type TerminalStage = (typeof TERMINAL_STAGES)[number]
export type ApplicationStage = (typeof ALL_STAGES)[number]

// ── Compile-time Exhaustiveness Check ──────────────────────────────────────────
// If a stage is added to the DB schema enum without being added to ALL_STAGES,
// TypeScript compilation will fail here rather than producing wrong totals in production.
type AssertEqual<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false
type ExhaustivenessCheck = AssertEqual<DbApplicationStage, ApplicationStage>
const _assertExhaustive: ExhaustivenessCheck = true

export interface StageConfig {
  id: ApplicationStage
  label: string
  shortLabel: string
  color: string
  textColor: string
  borderColor: string
  badgeColor: string
  isTerminal: boolean
}

export const STAGE_CONFIGS: Record<ApplicationStage, StageConfig> = {
  received: {
    id: 'received',
    label: 'Received',
    shortLabel: 'RECEIVED',
    color: 'bg-[#4A586E]/10 text-[#4A586E] border-[#4A586E]/30',
    textColor: 'text-[#4A586E]',
    borderColor: 'border-[#4A586E]/30',
    badgeColor: 'text-[#4A586E]',
    isTerminal: false,
  },
  under_review: {
    id: 'under_review',
    label: 'Under Review',
    shortLabel: 'IN REVIEW',
    color: 'bg-[#7A4B22]/10 text-[#7A4B22] border-[#7A4B22]/30',
    textColor: 'text-[#7A4B22]',
    borderColor: 'border-[#7A4B22]/30',
    badgeColor: 'text-[#7A4B22]',
    isTerminal: false,
  },
  shortlisted: {
    id: 'shortlisted',
    label: 'Shortlisted',
    shortLabel: 'SHORTLISTED',
    color: 'bg-[#8A6140]/10 text-[#8A6140] border-[#8A6140]/30',
    textColor: 'text-[#8A6140]',
    borderColor: 'border-[#8A6140]/30',
    badgeColor: 'text-[#8A6140]',
    isTerminal: false,
  },
  interview_scheduled: {
    id: 'interview_scheduled',
    label: 'Interview Scheduled',
    shortLabel: 'SCHEDULED',
    color: 'bg-[#73566B]/10 text-[#73566B] border-[#73566B]/30',
    textColor: 'text-[#73566B]',
    borderColor: 'border-[#73566B]/30',
    badgeColor: 'text-[#73566B]',
    isTerminal: false,
  },
  interviewed: {
    id: 'interviewed',
    label: 'Interviewed',
    shortLabel: 'INTERVIEWED',
    color: 'bg-[#4A5D3F]/10 text-[#4A5D3F] border-[#4A5D3F]/30',
    textColor: 'text-[#4A5D3F]',
    borderColor: 'border-[#4A5D3F]/30',
    badgeColor: 'text-[#4A5D3F]',
    isTerminal: false,
  },
  offered: {
    id: 'offered',
    label: 'Offered',
    shortLabel: 'OFFERED',
    color: 'bg-[#3E6958]/10 text-[#3E6958] border-[#3E6958]/30',
    textColor: 'text-[#3E6958]',
    borderColor: 'border-[#3E6958]/30',
    badgeColor: 'text-[#3E6958]',
    isTerminal: false,
  },
  hired: {
    id: 'hired',
    label: 'Hired',
    shortLabel: 'HIRED',
    color: 'bg-[#2E5444]/15 text-[#2E5444] border-[#2E5444]/30',
    textColor: 'text-[#2E5444]',
    borderColor: 'border-[#2E5444]/30',
    badgeColor: 'text-[#2E5444]',
    isTerminal: false,
  },
  rejected: {
    id: 'rejected',
    label: 'Rejected',
    shortLabel: 'REJECTED',
    color: 'bg-[#A8201A]/10 text-[#A8201A] border-[#A8201A]/25',
    textColor: 'text-[#A8201A]',
    borderColor: 'border-[#A8201A]/25',
    badgeColor: 'text-[#A8201A]',
    isTerminal: true,
  },
  withdrawn: {
    id: 'withdrawn',
    label: 'Withdrawn',
    shortLabel: 'WITHDRAWN',
    color: 'bg-[#6E6153]/10 text-[#6E6153] border-[#6E6153]/25',
    textColor: 'text-[#6E6153]',
    borderColor: 'border-[#6E6153]/25',
    badgeColor: 'text-[#6E6153]',
    isTerminal: true,
  },
  duplicate: {
    id: 'duplicate',
    label: 'Duplicate',
    shortLabel: 'DUPLICATE',
    color: 'bg-[#8B7D67]/10 text-[#8B7D67] border-[#8B7D67]/25',
    textColor: 'text-[#8B7D67]',
    borderColor: 'border-[#8B7D67]/25',
    badgeColor: 'text-[#8B7D67]',
    isTerminal: true,
  },
}
