/**
 * components/apply/JobApplyForm.tsx
 *
 * Client-side multi-step application form wizard with candidate registration & status lookup.
 * Handles Zod validation per step, direct-to-R2 resume upload (with mock fallback),
 * and candidate status tracking lookup.
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
  const [mode, setMode] = useState<'register' | 'lookup'>('register')
  const [step, setStep] = useState(1)

  // Status Lookup State
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)

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

  // ── Candidate Lookup Flow ──────────────────────────────────────────────────
  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLookupError(null)

    if (!lookupQuery.trim()) {
      setLookupError('Please enter your Application Reference ID or Email')
      return
    }

    setIsLookingUp(true)
    try {
      const res = await fetch('/api/status/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: lookupQuery.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setLookupError(data.error || 'Application not found. Please verify your reference ID.')
        return
      }

      if (data.statusToken) {
        router.push(`/status/${data.statusToken}`)
      }
    } catch (err: any) {
      setLookupError('Network error while looking up application.')
    } finally {
      setIsLookingUp(false)
    }
  }

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

      setResumeKey(key)
      setResumeFilename(file.name)
      setResumeSizeBytes(file.size)
      setResumeMime(file.type || 'application/pdf')
      setUploadProgress(100)
    } catch (err: any) {
      console.error(err)
      setUploadError(err.message || 'File upload failed. Please try again.')
      setUploadProgress(undefined)
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
      whatsappOptIn,
    })

    if (!step3Result.success) {
      const fieldErrors: Record<string, string> = {}
      step3Result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message
        }
      })
      setStep3Errors(fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const idempotencyKey = `apply-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      const payload = {
        personalDetails: { fullName, email, phone },
        academicStatus: {
          academicStatus,
          academicNote: academicNote || undefined,
          collegeId: collegeId || undefined,
          collegeRaw,
          courseId: courseId || undefined,
          courseRaw,
          experienceType,
          hasTwoWheeler,
          hasDrivingLicence,
        },
        resumeReview: {
          resumeKey,
          resumeFilename,
          resumeSizeBytes,
          resumeMime,
          consentGiven,
          whatsappOptIn,
        },
        jobId: job.id,
        driveCode: driveCode || undefined,
        source,
        idempotencyKey,
      }

      const res = await fetch('/api/applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Submission failed. Please check your details.')
      }

      setApplicationId(data.applicationId || 'APP-RECEIVED')
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── SUCCESS SCREEN ─────────────────────────────────────────────────────────
  if (applicationId) {
    const waText = encodeURIComponent(
      `Hello Akshara Team, I have registered my candidate profile under application reference ${applicationId}.`
    )
    const waUrl = `https://wa.me/918045689000?text=${waText}`

    return (
      <Card className="max-w-2xl mx-auto p-8 bg-(--color-ink-900) border border-(--color-ink-600) rounded-(--radius-lg) text-center flex flex-col gap-6 shadow-xl text-(--color-text-on-dark)">
        <div className="h-16 w-16 bg-(--color-leaf)/20 text-(--color-leaf) rounded-full flex items-center justify-center mx-auto">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div>
          <h2 className="font-display text-(--font-size-step-3) font-bold text-(--color-text-on-dark)">
            Application Submitted!
          </h2>
          <p className="text-(--font-size-step-0) text-(--color-text-on-dark-muted) mt-2 max-w-md mx-auto">
            Thank you for applying. Your candidate profile has been successfully registered in our recruitment pipeline.
          </p>
        </div>

        <div className="bg-(--color-ink-800) rounded-(--radius-md) p-5 border border-(--color-ink-600) flex flex-col gap-1 max-w-sm mx-auto w-full">
          <span className="text-(--font-size-step--2) text-(--color-text-on-dark-muted) font-mono uppercase tracking-wider">
            YOUR APPLICATION ID
          </span>
          <span className="text-(--font-size-step-2) font-mono font-bold text-(--color-amber-400)" data-testid="success-application-id">
            {applicationId}
          </span>
        </div>

        <div className="flex flex-col gap-3 max-w-sm mx-auto w-full">
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="w-full">
            <button type="button" className="btn btn--md w-full bg-[#25D366] hover:bg-[#20BA5A] border-none text-white flex items-center justify-center gap-2 font-medium">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.022-.014-.029-.022-.05-.043l-.7-.7-.7-.7-.7-.7-.35-.35c-.07-.07-.15-.09-.23-.07-.08.02-.15.07-.2.13l-.5.7c-.12.16-.27.27-.45.32-.18.05-.38.01-.52-.1l-.4-.3c-1.1-1-1.9-2.1-2.4-3.2l-.2-.4c-.1-.14-.14-.34-.09-.52.05-.18.16-.33.32-.45l.7-.5c.06-.05.11-.12.13-.2.02-.08 0-.16-.07-.23l-.35-.35-.7-.7-.7-.7-.7-.7c-.021-.021-.029-.028-.043-.05-.14-.14-.36-.14-.5 0l-.8.8c-.28.28-.42.66-.38 1.05.08 1.25.6 2.45 1.45 3.4l.2.2c.95.85 2.15 1.37 3.4 1.45.39.04.77-.1 1.05-.38l.8-.8c.14-.14.14-.36 0-.5zm3.5-9.4c-4-4-10.5-4-14.5 0-3.6 3.6-4 9.1-1.2 13.1L3 21l3.1-2.2c4 2.8 9.5 2.4 13.1-1.2 4-4 4-10.5 0-14.5zm-1.8 12.7c-3.1 3.1-7.8 3.5-11.4 1.1l-.3-.2-1.9 1.3 1.3-1.9-.2-.3c-2.4-3.6-2-8.3 1.1-11.4 3.6-3.6 9.4-3.6 13 0 3.6 3.6 3.6 9.4 0 13z"/>
              </svg>
              Enable updates on WhatsApp
            </button>
          </a>
          
          <Link href="/careers" className="w-full">
            <button type="button" className="btn btn--md btn--secondary w-full">
              Back to Careers Board
            </button>
          </Link>
        </div>
      </Card>
    )
  }

  // ── WIZARD LAYOUT ──────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto bg-(--color-ink-900) border border-(--color-ink-600) rounded-(--radius-lg) p-6 sm:p-8 shadow-xl text-(--color-text-on-dark)">
      <div className="flex flex-col gap-6">
        
        {/* Mode Selector: Register Application vs Status / Login */}
        <div className="grid grid-cols-2 bg-(--color-ink-950) p-1 rounded-(--radius-md) border border-(--color-ink-600)">
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 px-3 text-(--font-size-step--1) font-semibold rounded-(--radius-sm) transition-all text-center ${
              mode === 'register'
                ? 'bg-(--color-amber-400) text-(--color-ink-950) shadow-sm'
                : 'text-(--color-text-on-dark-muted) hover:text-(--color-text-on-dark)'
            }`}
          >
            ✍️ Apply & Register
          </button>

          <button
            type="button"
            onClick={() => setMode('lookup')}
            className={`py-2 px-3 text-(--font-size-step--1) font-semibold rounded-(--radius-sm) transition-all text-center ${
              mode === 'lookup'
                ? 'bg-(--color-amber-400) text-(--color-ink-950) shadow-sm'
                : 'text-(--color-text-on-dark-muted) hover:text-(--color-text-on-dark)'
            }`}
          >
            🔍 Check Status / Login
          </button>
        </div>

        {/* ── MODE: CHECK STATUS / CANDIDATE LOGIN ────────────────────────────── */}
        {mode === 'lookup' ? (
          <div className="flex flex-col gap-6 pt-2">
            <div className="flex flex-col gap-1.5">
              <h2 className="font-display text-(--font-size-step-2) font-bold text-(--color-text-on-dark)">
                Track Candidate Application
              </h2>
              <p className="text-(--font-size-step--1) text-(--color-text-on-dark-muted) leading-relaxed">
                Enter your <span className="font-mono text-(--color-amber-400)">Application Reference ID</span> (e.g. <span className="font-mono">APP-ORG-34271</span>) or registered Email to view your live status.
              </p>
            </div>

            <form onSubmit={handleLookupSubmit} className="flex flex-col gap-5">
              <FieldWrapper id="lookupQuery" label="Application ID or Email Address" required error={lookupError || undefined}>
                <Input
                  id="lookupQuery"
                  placeholder="e.g. APP-ORG-34271 or aditi@gmail.com"
                  value={lookupQuery}
                  onChange={(e) => {
                    setLookupQuery(e.target.value)
                    setLookupError(null)
                  }}
                />
              </FieldWrapper>

              <button
                type="submit"
                disabled={isLookingUp}
                className="btn btn--md btn--primary w-full mt-1"
              >
                {isLookingUp ? 'Searching Pipeline...' : 'Track Application Status →'}
              </button>
            </form>

            <div className="border-t border-(--color-ink-600)/50 pt-5 mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-(--font-size-step--1) text-(--color-text-on-dark-muted)">
              <span>Recruiter or Team Member?</span>
              <Link
                href="/console/login"
                className="text-(--color-amber-400) hover:underline font-semibold flex items-center gap-1"
              >
                <span>Operator Console Login &rarr;</span>
              </Link>
            </div>
          </div>
        ) : (
          /* ── MODE: REGISTRATION WIZARD ─────────────────────────────────────── */
          <>
            {/* Step Indicator */}
            <ProgressSteps
              currentStep={step}
              stepsLabels={['Personal details', 'Academic status', 'Resume & Review']}
            />

            <div className="border-t border-(--color-ink-600)/60 pt-6">
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

                    <FieldWrapper id="phone" label="WhatsApp Phone Number" required hint="We will prepended +91 automatically" error={step1Errors.phone}>
                      <Input
                        id="phone"
                        prefix="+91"
                        placeholder="98765 43210"
                        value={phone.replace(/^\+91/, '')}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </FieldWrapper>

                    <div className="flex justify-between items-center mt-2">
                      <button
                        type="button"
                        onClick={() => setMode('lookup')}
                        className="text-(--font-size-step--2) text-(--color-text-on-dark-muted) hover:text-(--color-amber-400) underline font-mono"
                      >
                        Already registered? Check status
                      </button>

                      <button
                        type="button"
                        onClick={handleStep1Next}
                        className="btn btn--md btn--primary min-w-[140px]"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
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
                        <div className="pt-2 sm:pt-6">
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
                        className="btn btn--md btn--primary min-w-[140px]"
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

                    <div className="flex flex-col gap-3 mt-2 border-t border-(--color-ink-600)/50 pt-4">
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
                      <div className="p-4 bg-red-500/15 border border-red-500/30 text-red-300 text-(--font-size-step--1) rounded-(--radius-sm) font-medium">
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
                        className="btn btn--md btn--primary min-w-[180px]"
                        data-testid="submit-application"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </div>
                  </div>
                )}

              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
