/**
 * lib/validation/application.ts
 *
 * Zod validation schemas for candidate applications.
 * Reuses canonical schemas from shared.ts to enforce single-source-of-truth rules.
 */

import { z } from 'zod'
import { nameSchema, phoneSchema, emailSchema, academicStatusSchema } from './shared'

// 1. Step 1: Personal Details
export const personalDetailsSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
})

// 2. Step 2: Academic & College Lookup
export const academicStatusSchemaForForm = z.object({
  academicStatus: academicStatusSchema,
  academicNote: z
    .string()
    .trim()
    .max(240, 'Academic notes must be under 240 characters')
    .optional(),
  collegeId: z.string().uuid('Invalid college selection').optional().nullable(),
  collegeRaw: z
    .string()
    .trim()
    .min(3, 'Type or select a valid college name')
    .max(200, 'College name must be under 200 characters'),
  courseId: z.string().uuid('Invalid course selection').optional().nullable(),
  courseRaw: z
    .string()
    .trim()
    .min(2, 'Type or select a valid course name')
    .max(200, 'Course name must be under 200 characters'),
  experienceType: z.enum(['fresher', 'experienced'], {
    message: 'Select your experience type',
  }),
  hasTwoWheeler: z.enum(['yes', 'no', 'can_arrange'], {
    message: 'Select if you have a two-wheeler',
  }),
  hasDrivingLicence: z.boolean(),
})

// 3. Step 3: Resume Review
export const resumeReviewSchema = z.object({
  resumeKey: z.string().min(1, 'Resume upload is required'),
  resumeFilename: z.string().min(1, 'Resume file name is required'),
  resumeSizeBytes: z.number().max(5 * 1024 * 1024, 'File exceeds 5 MB limit'),
  resumeMime: z.enum([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ], {
    message: 'Accept only PDF, DOC, or DOCX resumes',
  }),
  consentGiven: z.literal(true, {
    message: 'You must consent to proceed',
  }),
  whatsappOptIn: z.boolean().default(false),
})

// 4. Unified Application Submission schema (Public form submission payload)
export const publicApplicationSchema = personalDetailsSchema
  .merge(academicStatusSchemaForForm)
  .merge(resumeReviewSchema)
  .extend({
    jobId: z.string().uuid('Invalid job identifier'),
    driveCode: z.string().optional().nullable(),
    source: z.enum(['organic', 'campus_drive', 'referral', 'job_board', 'social']).default('organic'),
    idempotencyKey: z.string().min(1, 'Idempotency key is required'),
  })

export type UnifiedApplicationInput = z.infer<typeof publicApplicationSchema>
export type PersonalDetailsInput = z.infer<typeof personalDetailsSchema>
export type AcademicStatusInput = z.infer<typeof academicStatusSchemaForForm>
export type ResumeReviewInput = z.infer<typeof resumeReviewSchema>
