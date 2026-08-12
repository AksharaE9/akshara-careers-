/**
 * components/apply/JobApplyForm.tsx
 *
 * Client-side multi-step application form wizard with candidate registration.
 * Handles Zod validation per step, direct-to-R2 resume upload (with mock fallback),
 * and pre-filled candidate profile details.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { trackEvent } from '@/lib/analytics/track'
import { Textarea } from '@/components/ui/Textarea'
import { Combobox } from '@/components/ui/Combobox'
import { Checkbox } from '@/components/ui/Checkbox'
import { Switch } from '@/components/ui/Switch'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { FieldWrapper } from '@/components/ui/FieldWrapper'
import { getErrorMessage } from '@/lib/errors'
import {
  personalDetailsSchema,
  academicStatusSchemaForForm as academicStatusSchema,
  resumeReviewSchema,
} from '@/lib/validation/application'

interface JobApplyFormProps {
  job: {
    id: string
    title: string
    slug: string
    requiresTwoWheeler: boolean
    requiresDrivingLicence: boolean
  }
  driveCode: string | null
  source: string
  candidate?: {
    id?: string
    fullName?: string
    emailNormalised?: string
    phoneE164?: string
  } | null
}

export function JobApplyForm({ job, driveCode, source, candidate }: JobApplyFormProps) {
  const [step, setStep] = useState(1)

  // Track apply started on mount
  useEffect(() => {
    trackEvent('apply_started', {
      jobId: job.id,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    })
  }, [job.id])

  // Step 1 State — prefilled from candidate session if available
  const [fullName, setFullName] = useState(candidate?.fullName || '')
  const [email, setEmail] = useState(candidate?.emailNormalised || '')
  const [phone, setPhone] = useState(candidate?.phoneE164 ? candidate.phoneE164.replace(/^\+91/, '') : '')
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({})

  // Step 2 State
  const [academicStatus, setAcademicStatus] = useState('')
  const [academicNote, setAcademicNote] = useState('')
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [collegeRaw, setCollegeRaw] = useState('')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseRaw, setCourseRaw] = useState('')
  const [experienceType, setExperienceType] = useState('fresher')
  const [hasTwoWheeler, setHasTwoWheeler] = useState('no')
  const [hasDrivingLicence, setHasDrivingLicence] = useState(false)
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({})

  // Step 3 State
  const [resumeKey, setResumeKey] = useState('')
  const [resumeFilename, setResumeFilename] = useState('')
  const [resumeSizeBytes, setResumeSizeBytes] = useState(0)
  const [resumeMime, setResumeMime] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined)
  const [uploadError, setUploadError] = useState<string | undefined>(undefined)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({})

  // Success State
  const [applicationId, setApplicationId] = useState<string | null>(null)

  // ── Step 1 Navigation ──────────────────────────────────────────────────────
  const handleStep1Next = () => {
    setStep1Errors({})
    const result = personalDetailsSchema.safeParse({ fullName, email, phone })
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = getErrorMessage(err)
        }
      })
      setStep1Errors(fieldErrors)
      return
    }

    setPhone(result.data.phone)
    trackEvent('apply_step_completed', {
      props: { step: 1 },
      jobId: job.id,
    })
    setStep(2)
  }

  // ── Step 2 Navigation ──────────────────────────────────────────────────────
  const handleStep2Next = () => {
    setStep2Errors({})
    const result = academicStatusSchema.safeParse({
      academicStatus,
      academicNote: academicNote || undefined,
      collegeId,
      collegeRaw,
      courseId,
      courseRaw,
      experienceType,
      hasTwoWheeler,
      hasDrivingLicence,
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = getErrorMessage(err)
        }
      })
      setStep2Errors(fieldErrors)
      return
    }

    trackEvent('apply_step_completed', {
      props: { step: 2 },
      jobId: job.id,
    })
    setStep(3)
  }

  // ── API Course/College lookup actions ──────────────────────────────────────
  const searchCollegesApi = async (q: string) => {
    const res = await fetch(`/api/lookup/colleges?q=${encodeURIComponent(q)}`)
    return res.json()
  }

  const searchCoursesApi = async (q: string) => {
    const res = await fetch(`/api/lookup/courses?q=${encodeURIComponent(q)}`)
    return res.json()
  }

  // ── File Upload Flow ───────────────────────────────────────────────────────
  const handleFileSelected = async (file: File) => {
    setUploadError(undefined)
    setUploadProgress(0)
    trackEvent('resume_upload_started', { jobId: job.id })

    try {
      const presignRes = await fetch('/api/applications/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      })

      if (!presignRes.ok) {
        const data = await presignRes.json()
        throw new Error(data.error || 'Failed to get upload authorization')
      }

      const { uploadUrl, key, headers, isMock } = await presignRes.json()

      if (isMock) {
        for (let p = 20; p <= 100; p += 20) {
          await new Promise((r) => setTimeout(r, 80))
          setUploadProgress(p)
        }
      } else {
        const uploadHeaders: Record<string, string> = {
          'Content-Type': file.type,
          ...headers,
        }

        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl, true)
        Object.entries(uploadHeaders).forEach(([k, v]) => xhr.setRequestHeader(k, v))

        await new Promise((resolve, reject) => {
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              setUploadProgress(Math.round((evt.loaded / evt.total) * 100))
            }
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve(true)
            else reject(new Error(`R2 upload rejected with status ${xhr.status}`))
          }
          xhr.onerror = () => reject(new Error('Network error during file upload'))
          xhr.send(file)
        })
      }

      const inferredMime =
        file.type ||
        (file.name.endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : file.name.endsWith('.doc')
            ? 'application/msword'
            : 'application/pdf')

      setResumeKey(key)
      setResumeFilename(file.name)
      setResumeSizeBytes(file.size)
      setResumeMime(inferredMime)
      setUploadProgress(100)
      trackEvent('resume_upload_succeeded', { jobId: job.id })
    } catch (err) {
      console.error(err)
      setUploadError(getErrorMessage(err) || 'File upload failed. Please try again.')
      setUploadProgress(undefined)
      trackEvent('resume_upload_failed', { jobId: job.id })
    }
  }

  // ── Form Submission ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setStep3Errors({})

    const step3Result = resumeReviewSchema.safeParse({
      resumeKey,
      resumeFilename,
      resumeSizeBytes,
      resumeMime,
      consentGiven,
    })

    if (!step3Result.success) {
      const fieldErrors: Record<string, string> = {}
      step3Result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = getErrorMessage(err)
        }
      })
      setStep3Errors(fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const idempotencyKey = `apply-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      const formattedPhone = phone.startsWith('+91')
        ? phone
        : `+91${phone.replace(/\D/g, '').slice(0, 10)}`

      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: formattedPhone,
        academicStatus,
        academicNote: academicNote?.trim() || undefined,
        collegeId: collegeId || undefined,
        collegeRaw: collegeRaw.trim(),
        courseId: courseId || undefined,
        courseRaw: courseRaw.trim(),
        experienceType,
        hasTwoWheeler,
        hasDrivingLicence,
        resumeKey,
        resumeFilename,
        resumeSizeBytes,
        resumeMime: resumeMime || 'application/pdf',
        consentGiven,
        jobId: job.id,
        driveCode: driveCode || undefined,
        source: source || 'organic',
        idempotencyKey,
      }

      const res = await fetch('/api/applications/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Application submission failed')
      }

      trackEvent('apply_submitted', { jobId: job.id })
      setApplicationId(data.applicationId || 'APP-2026-CONFIRMED')
    } catch (err) {
      console.error(err)
      setSubmitError(getErrorMessage(err) || 'Something went wrong. Please check your details and try again.')
      trackEvent('apply_submit_failed', { jobId: job.id })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── SUCCESS CONFIRMATION ───────────────────────────────────────────────────
  if (applicationId) {
    return (
      <Card className="max-w-2xl mx-auto p-8 bg-white border border-slate-200 rounded-2xl text-center flex flex-col gap-6 shadow-xl text-slate-900">
        <div className="h-16 w-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div>
          <h2 className="font-display text-[clamp(1.75rem,1.50rem+1.10vw,2.40rem)] font-bold text-slate-900">
            Application Submitted!
          </h2>
          <p className="text-[clamp(1.00rem,0.95rem+0.25vw,1.13rem)] text-slate-600 mt-2 max-w-md mx-auto">
            Thank you for applying. Your candidate profile has been successfully registered in our recruitment pipeline.
          </p>
        </div>

        <div className="bg-(--color-paper) rounded-xl p-5 border border-(--color-hairline) flex flex-col gap-1 max-w-sm mx-auto w-full">
          <span className="text-xs text-(--color-muted) font-mono uppercase tracking-wider">
            YOUR APPLICATION ID
          </span>
          <span className="text-2xl font-mono font-bold text-(--color-rust)" data-testid="success-application-id">
            {applicationId}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto w-full pt-2">
          <Link href="/dashboard" className="flex-1">
            <button type="button" className="btn btn--md btn--primary w-full font-bold shadow-xs">
              Go to Dashboard &rarr;
            </button>
          </Link>
          
          <Link href="/careers" className="flex-1">
            <button type="button" className="btn btn--md btn--secondary w-full font-semibold">
              Careers Board
            </button>
          </Link>
        </div>
      </Card>
    )
  }

  // ── WIZARD LAYOUT ──────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl text-slate-900">
      <div className="flex flex-col gap-6">
        
        {/* Step Indicator */}
        <ProgressSteps
          currentStep={step}
          stepsLabels={['Personal details', 'Academic status', 'Resume & Review']}
        />

        <div className="border-t border-slate-200 pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* ── STEP 1: Personal Details ──────────────────────────────────── */}
            {step === 1 && (
              <div className="flex flex-col gap-5" data-testid="apply-step-1">
                <FieldWrapper id="fullName" label="Full Name" required error={step1Errors.fullName}>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </FieldWrapper>

                <FieldWrapper id="email" label="Email Address" required error={step1Errors.email}>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. aditi@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FieldWrapper>

                <FieldWrapper id="phone" label="Mobile Phone Number" required hint="We will prepend +91 automatically" error={step1Errors.phone}>
                  <Input
                    id="phone"
                    prefix="+91"
                    placeholder="98765 43210"
                    value={phone.replace(/^\+91/, '')}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </FieldWrapper>

                <div className="flex justify-end items-center mt-2">
                  <button
                    type="button"
                    onClick={handleStep1Next}
                    className="btn btn--md btn--primary min-w-[140px] font-bold"
                    data-testid="step-next"
                  >
                    Continue &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Academic Status & College ─────────────────────────── */}
            {step === 2 && (
              <div className="flex flex-col gap-5" data-testid="apply-step-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FieldWrapper id="academicStatus" label="Current Academic Status" required error={step2Errors.academicStatus}>
                    <Select
                      id="academicStatus"
                      value={academicStatus}
                      onChange={(e) => setAcademicStatus(e.target.value)}
                    >
                      <option value="">Select status...</option>
                      <option value="sem_1">Semester 1</option>
                      <option value="sem_2">Semester 2</option>
                      <option value="sem_3">Semester 3</option>
                      <option value="sem_4">Semester 4</option>
                      <option value="sem_5">Semester 5</option>
                      <option value="sem_6">Semester 6</option>
                      <option value="sem_7">Semester 7</option>
                      <option value="sem_8">Semester 8</option>
                      <option value="final_year_results_awaited">Final Year Results Awaited</option>
                      <option value="graduated">Graduated</option>
                    </Select>
                  </FieldWrapper>

                  <FieldWrapper id="experienceType" label="Experience Level" required error={step2Errors.experienceType}>
                    <Select
                      id="experienceType"
                      value={experienceType}
                      onChange={(e) => setExperienceType(e.target.value)}
                    >
                      <option value="fresher">Fresher (Graduate / Student)</option>
                      <option value="experienced">Experienced (1+ Years)</option>
                    </Select>
                  </FieldWrapper>
                </div>

                <FieldWrapper id="collegeRaw" label="College Name" required hint="Type your college name or pick from suggestions" error={step2Errors.collegeRaw}>
                  <Combobox
                    id="collegeRaw"
                    placeholder="Enter or search college name..."
                    onSearch={searchCollegesApi}
                    onSelect={(opt) => {
                      setCollegeId(opt.value)
                      setCollegeRaw(opt.label)
                    }}
                    onFreeText={(text) => {
                      setCollegeId(null)
                      setCollegeRaw(text)
                    }}
                    value={collegeRaw}
                  />
                </FieldWrapper>

                <FieldWrapper id="courseRaw" label="Degree Course" required hint="Type your course/degree (e.g. B.Com, BCA, BBA, B.Tech)" error={step2Errors.courseRaw}>
                  <Combobox
                    id="courseRaw"
                    placeholder="Enter or search degree course..."
                    onSearch={searchCoursesApi}
                    onSelect={(opt) => {
                      setCourseId(opt.value)
                      setCourseRaw(opt.label)
                    }}
                    onFreeText={(text) => {
                      setCourseId(null)
                      setCourseRaw(text)
                    }}
                    value={courseRaw}
                  />
                </FieldWrapper>

                <FieldWrapper id="hasTwoWheeler" label="Two-wheeler Ownership" required error={step2Errors.hasTwoWheeler}>
                  <Select
                    id="hasTwoWheeler"
                    value={hasTwoWheeler}
                    onChange={(e) => setHasTwoWheeler(e.target.value)}
                  >
                    <option value="no">No vehicle</option>
                    <option value="yes">Yes, I own a two-wheeler</option>
                    <option value="can_arrange">No, but I can arrange one</option>
                  </Select>
                </FieldWrapper>

                <FieldWrapper id="academicNote" label="Academic / Backlog Notes" hint="Optional, max 240 characters" error={step2Errors.academicNote}>
                  <Textarea
                    id="academicNote"
                    placeholder="Any semesters with backlogs or specific scores to mention..."
                    value={academicNote}
                    onChange={(e) => setAcademicNote(e.target.value)}
                    maxChars={240}
                  />
                </FieldWrapper>

                <div className="flex justify-between items-center mt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn btn--md btn--secondary"
                    data-testid="step-back"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStep2Next}
                    className="btn btn--md btn--primary min-w-[140px] font-bold"
                    data-testid="step-next"
                  >
                    Continue &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Resume Upload & Review ────────────────────────────── */}
            {step === 3 && (
              <div className="flex flex-col gap-5" data-testid="apply-step-3">
                <FieldWrapper id="resumeKey" label="Upload Resume (PDF, DOC or DOCX)" required hint="File size limit is 5 MB" error={step3Errors.resumeKey || uploadError}>
                  <FileDropzone
                    onFileSelected={handleFileSelected}
                    progress={uploadProgress}
                    uploadedFilename={resumeFilename}
                    onReplace={() => {
                      setResumeKey('')
                      setResumeFilename('')
                      setResumeSizeBytes(0)
                      setResumeMime('')
                    }}
                  />
                </FieldWrapper>

                <div className="flex flex-col gap-3 mt-2 border-t border-slate-200 pt-4">
                  <Checkbox
                    id="consentGiven"
                    label="I consent to Akshara processing and retaining my candidate profile for 24 months."
                    hint="Required under the Digital Personal Data Protection (DPDP) Act."
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven((e.target as HTMLInputElement).checked)}
                    error={Boolean(step3Errors.consentGiven)}
                  />
                </div>

                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] rounded-md font-medium">
                    {submitError}
                  </div>
                )}

                <div className="flex justify-between items-center mt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={isSubmitting}
                    className="btn btn--md btn--secondary"
                    data-testid="step-back"
                  >
                    &larr; Back
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn--md btn--primary min-w-[180px] font-bold"
                    data-testid="submit-application"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  )
}
