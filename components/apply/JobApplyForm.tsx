/**
 * components/apply/JobApplyForm.tsx
 *
 * Client-side multi-step application form wizard.
 * Handles Zod validation per step, direct-to-R2 resume upload (with mock fallback),
 * and submits candidate details.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Combobox } from '@/components/ui/Combobox'
import { Checkbox } from '@/components/ui/Checkbox'
import { Switch } from '@/components/ui/Switch'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { FieldWrapper } from '@/components/ui/FieldWrapper'
import {
  personalDetailsSchema,
  academicStatusSchemaForForm as academicStatusSchema,
  resumeReviewSchema,
  type PersonalDetailsInput,
  type AcademicStatusInput,
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
}

export function JobApplyForm({ job, driveCode, source }: JobApplyFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1 State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
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
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)
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
          fieldErrors[err.path[0].toString()] = err.message
        }
      })
      setStep1Errors(fieldErrors)
      return
    }

    // Set normalized phone returned by transformer
    setPhone(result.data.phone)
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
          fieldErrors[err.path[0].toString()] = err.message
        }
      })
      setStep2Errors(fieldErrors)
      return
    }

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

    try {
      // 1. Get presigned URL
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
        const errData = await presignRes.json()
        throw new Error(errData.error || 'Failed to request upload signature')
      }

      const { uploadUrl, key, isMock } = await presignRes.json()

      // 2. PUT file directly to S3/R2 or mock upload endpoint
      setUploadProgress(30)
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadRes.ok) {
        throw new Error('Upload request to storage failed')
      }

      setUploadProgress(70)

      // 3. Finalize upload (trigger server magic byte checks)
      const finalizeRes = await fetch('/api/applications/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })

      if (!finalizeRes.ok) {
        const errData = await finalizeRes.json()
        throw new Error(errData.error || 'Resume verification failed')
      }

      const { mimeType, sizeBytes } = await finalizeRes.json()

      setResumeKey(key)
      setResumeFilename(file.name)
      setResumeSizeBytes(sizeBytes)
      setResumeMime(mimeType)
      setUploadProgress(100)
      
      // Clear progress indicator after brief delay
      setTimeout(() => setUploadProgress(undefined), 1000)
    } catch (err: any) {
      console.error(err)
      setUploadError(err.message || 'File upload failed. Ensure file is under 5 MB and is a PDF/DOCX.')
      setUploadProgress(undefined)
    }
  }

  // ── Application Form Submission ───────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setStep3Errors({})

    const validationResult = resumeReviewSchema.safeParse({
      resumeKey,
      resumeFilename,
      resumeSizeBytes,
      resumeMime,
      consentGiven,
      whatsappOptIn,
    })

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {}
      validationResult.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message
        }
      })
      setStep3Errors(fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const idempotencyKey = `${email}-${job.id}-${Date.now()}`
      const payload = {
        fullName,
        email,
        phone,
        academicStatus,
        academicNote: academicNote || undefined,
        collegeId,
        collegeRaw,
        courseId,
        courseRaw,
        experienceType,
        hasTwoWheeler,
        hasDrivingLicence,
        resumeKey,
        resumeFilename,
        resumeSizeBytes,
        resumeMime,
        consentGiven,
        whatsappOptIn,
        jobId: job.id,
        driveCode,
        source,
        idempotencyKey,
      }

      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      // Success! Set application ID to show confirmation screen
      setApplicationId(data.applicationId)
    } catch (err: any) {
      console.error(err)
      setSubmitError(err.message || 'An unexpected error occurred during submission.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── SUCCESS CONFIRMATION SCREEN ──────────────────────────────────────────
  if (applicationId) {
    // Generate deep WhatsApp opt-in message
    const waText = `Hi, I have successfully applied for the ${job.title} role at Akshara. My Application ID is ${applicationId}. Please keep me updated on the next steps.`
    const waUrl = `https://wa.me/919986266394?text=${encodeURIComponent(waText)}`

    return (
      <Card className="max-w-xl mx-auto p-(--spacing-s6) text-center flex flex-col gap-(--spacing-s5) bg-(--color-chalk) border border-(--color-ink-900)/10 shadow-lg">
        <div className="mx-auto h-12 w-12 rounded-full bg-(--color-leaf)/10 text-(--color-leaf) flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div>
          <h2 className="display text-(--font-size-step-2) font-bold text-(--color-ink-900)">
            Application Submitted!
          </h2>
          <p className="text-(--font-size-step-0) text-(--color-graphite) mt-(--spacing-s2)">
            Thank you for applying. Your candidate profile has been successfully registered.
          </p>
        </div>

        <div className="bg-(--color-paper) rounded-(--radius-md) p-(--spacing-s4) border border-(--color-ink-900)/5 flex flex-col gap-(--spacing-s1)">
          <span className="text-(--font-size-step--2) text-(--color-ink-400) font-mono">YOUR APPLICATION ID</span>
          <span className="text-(--font-size-step-1) font-mono font-bold text-(--color-ink-900)" data-testid="success-application-id">
            {applicationId}
          </span>
        </div>

        <div className="flex flex-col gap-(--spacing-s3)">
          <a href={waUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" className="w-full bg-[#25D366] hover:bg-[#20BA5A] border-none text-white flex items-center justify-center gap-(--spacing-s2)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.022-.014-.029-.022-.05-.043l-.7-.7-.7-.7-.7-.7-.35-.35c-.07-.07-.15-.09-.23-.07-.08.02-.15.07-.2.13l-.5.7c-.12.16-.27.27-.45.32-.18.05-.38.01-.52-.1l-.4-.3c-1.1-1-1.9-2.1-2.4-3.2l-.2-.4c-.1-.14-.14-.34-.09-.52.05-.18.16-.33.32-.45l.7-.5c.06-.05.11-.12.13-.2.02-.08 0-.16-.07-.23l-.35-.35-.7-.7-.7-.7-.7-.7c-.021-.021-.029-.028-.043-.05-.14-.14-.36-.14-.5 0l-.8.8c-.28.28-.42.66-.38 1.05.08 1.25.6 2.45 1.45 3.4l.2.2c.95.85 2.15 1.37 3.4 1.45.39.04.77-.1 1.05-.38l.8-.8c.14-.14.14-.36 0-.5zm3.5-9.4c-4-4-10.5-4-14.5 0-3.6 3.6-4 9.1-1.2 13.1L3 21l3.1-2.2c4 2.8 9.5 2.4 13.1-1.2 4-4 4-10.5 0-14.5zm-1.8 12.7c-3.1 3.1-7.8 3.5-11.4 1.1l-.3-.2-1.9 1.3 1.3-1.9-.2-.3c-2.4-3.6-2-8.3 1.1-11.4 3.6-3.6 9.4-3.6 13 0 3.6 3.6 3.6 9.4 0 13z"/>
              </svg>
              Enable updates on WhatsApp
            </Button>
          </a>
          
          <Link href="/careers">
            <Button variant="secondary" className="w-full">
              Back to Careers Board
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  // ── WIZARD LAYOUT ──────────────────────────────────────────────────────────
  return (
    <Card className="max-w-2xl mx-auto p-(--spacing-s6) bg-(--color-chalk) border border-(--color-ink-900)/10 shadow-md">
      <div className="flex flex-col gap-(--spacing-s5)">
        {/* Step Indicator */}
        <ProgressSteps
          currentStep={step}
          stepsLabels={['Personal details', 'Academic status', 'Resume & Review']}
        />

        <div className="border-t border-(--color-ink-900)/10 pt-(--spacing-s5)">
          <form onSubmit={handleSubmit} className="flex flex-col gap-(--spacing-s5)">
            
            {/* ── STEP 1: Personal Details ──────────────────────────────────── */}
            {step === 1 && (
              <div className="flex flex-col gap-(--spacing-s4)" data-testid="apply-step-1">
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

                <FieldWrapper id="phone" label="WhatsApp Phone Number" required hint="We will prepended +91 automatically" error={step1Errors.phone}>
                  <Input
                    id="phone"
                    prefix="+91"
                    placeholder="98765 43210"
                    value={phone.replace(/^\+91/, '')}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </FieldWrapper>

                <Button variant="primary" type="button" onClick={handleStep1Next} className="self-end mt-(--spacing-s2)" data-testid="step-next">
                  Continue &rarr;
                </Button>
              </div>
            )}

            {/* ── STEP 2: Academic Status & College ─────────────────────────── */}
            {step === 2 && (
              <div className="flex flex-col gap-(--spacing-s4)" data-testid="apply-step-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-(--spacing-s4)">
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

                <FieldWrapper id="collegeRaw" label="College Name" required hint="Fuzzy search partner colleges" error={step2Errors.collegeRaw}>
                  <Combobox
                    id="collegeRaw"
                    placeholder="Type to search college..."
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

                <FieldWrapper id="courseRaw" label="Degree Course" required hint="Fuzzy search degrees (e.g. B.Com)" error={step2Errors.courseRaw}>
                  <Combobox
                    id="courseRaw"
                    placeholder="Type to search course..."
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-(--spacing-s4) items-center">
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

                  {job.requiresDrivingLicence && (
                    <div className="pt-6">
                      <Switch
                        id="hasDrivingLicence"
                        label="I have a valid Driving Licence"
                        checked={hasDrivingLicence}
                        onChange={setHasDrivingLicence}
                      />
                    </div>
                  )}
                </div>

                <FieldWrapper id="academicNote" label="Academic / Backlog Notes" hint="Optional, max 240 characters" error={step2Errors.academicNote}>
                  <Textarea
                    id="academicNote"
                    placeholder="Any semesters with backlogs or specific scores to mention..."
                    value={academicNote}
                    onChange={(e) => setAcademicNote(e.target.value)}
                    maxChars={240}
                  />
                </FieldWrapper>

                <div className="flex justify-between items-center mt-(--spacing-s2)">
                  <Button variant="secondary" type="button" onClick={() => setStep(1)} data-testid="step-back">
                    &larr; Back
                  </Button>
                  <Button variant="primary" type="button" onClick={handleStep2Next} data-testid="step-next">
                    Continue &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Resume Upload & Review ────────────────────────────── */}
            {step === 3 && (
              <div className="flex flex-col gap-(--spacing-s4)" data-testid="apply-step-3">
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

                <div className="flex flex-col gap-(--spacing-s3) mt-(--spacing-s2) border-t border-(--color-ink-900)/5 pt-(--spacing-s4)">
                  <Checkbox
                    id="consentGiven"
                    label="I consent to Akshara processing and retaining my candidate profile for 24 months."
                    hint="Required under the Digital Personal Data Protection (DPDP) Act."
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven((e.target as HTMLInputElement).checked)}
                    error={Boolean(step3Errors.consentGiven)}
                  />

                  <Checkbox
                    id="whatsappOptIn"
                    label="Send me application updates and interview schedules via WhatsApp."
                    checked={whatsappOptIn}
                    onChange={(e) => setWhatsappOptIn((e.target as HTMLInputElement).checked)}
                  />
                </div>

                {submitError && (
                  <div className="p-(--spacing-s3) bg-(--color-kumkum)/10 border border-(--color-kumkum)/20 text-(--color-kumkum) text-(--font-size-step--1) rounded-(--radius-sm) font-medium">
                    {submitError}
                  </div>
                )}

                <div className="flex justify-between items-center mt-(--spacing-s2)">
                  <Button variant="secondary" type="button" onClick={() => setStep(2)} disabled={isSubmitting} data-testid="step-back">
                    &larr; Back
                  </Button>
                  
                  <Button variant="primary" type="submit" loading={isSubmitting} disabled={isSubmitting} data-testid="submit-application">
                    Submit Application
                  </Button>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </Card>
  )
}
