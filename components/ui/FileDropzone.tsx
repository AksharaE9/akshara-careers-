/**
 * components/ui/FileDropzone.tsx
 *
 * §2.6, §4.3 — Resume upload dropzone.
 * States: idle | drag-over | uploading | success | error | replace
 *
 * Client-side guards:
 *   - 5 MB size limit (rejecting 6 MB on client per §10.2)
 *   - Accept only PDF/DOC/DOCX by declared type
 *   - Magic byte verification happens server-side (§4.3, L6)
 *
 * data-testid attributes per §10.1:
 *   resume-dropzone | resume-progress | resume-filename
 */

'use client'

import {
  useRef,
  useState,
  type DragEvent,
  type ChangeEvent,
} from 'react'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const ACCEPTED_EXT = '.pdf,.doc,.docx'

export type DropzoneState =
  | 'idle'
  | 'drag'
  | 'uploading'
  | 'success'
  | 'error'
  | 'replace'

export interface FileDropzoneProps {
  /** Called when the file passes client-side validation and is ready to upload */
  onFileSelected: (file: File) => void
  /** Upload progress 0–100 */
  progress?: number | undefined
  /** Filename of the successfully uploaded file */
  uploadedFilename?: string | undefined
  /** Error message to display */
  error?: string | undefined
  /** Whether to show the replace button after success */
  onReplace?: (() => void) | undefined
  disabled?: boolean | undefined
}

const ICON = {
  upload: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  check: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
}

export function FileDropzone({
  onFileSelected,
  progress,
  uploadedFilename,
  error,
  onReplace,
  disabled = false,
}: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [clientError, setClientError] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const state: DropzoneState = (() => {
    if (error || clientError) return 'error'
    if (uploadedFilename) return onReplace ? 'replace' : 'success'
    if (progress !== undefined && progress > 0 && progress < 100)
      return 'uploading'
    if (dragOver) return 'drag'
    return 'idle'
  })()

  const validate = (file: File): string | null => {
    if (file.size > MAX_SIZE_BYTES) return 'File must be 5 MB or smaller.'
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['pdf', 'doc', 'docx'].includes(ext))
      return 'Only PDF, DOC, or DOCX files are accepted.'
    // We check declared MIME client-side — magic bytes are checked server-side
    if (!ACCEPTED_TYPES.includes(file.type) && file.type !== '') {
      return 'Only PDF, DOC, or DOCX files are accepted.'
    }
    return null
  }

  const handle = (file: File) => {
    const err = validate(file)
    if (err) {
      setClientError(err)
      return
    }
    setClientError('')
    onFileSelected(file)
  }

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handle(file)
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handle(file)
  }

  const displayError = error ?? clientError

  const zoneStyles: Record<DropzoneState, string> = {
    idle: 'border-(--color-ink-900)/20 bg-(--color-chalk) hover:border-(--color-marigold)/60 hover:bg-(--color-marigold)/4',
    drag: 'border-(--color-marigold) bg-(--color-marigold)/8 scale-[1.01]',
    uploading: 'border-(--color-ink-900)/20 bg-(--color-chalk) cursor-wait',
    success: 'border-(--color-leaf) bg-(--color-leaf)/5',
    replace: 'border-(--color-leaf) bg-(--color-leaf)/5',
    error: 'border-(--color-kumkum) bg-(--color-kumkum)/4',
  }

  return (
    <div data-testid="resume-dropzone">
      <button
        type="button"
        disabled={disabled || state === 'uploading'}
        onClick={() => state !== 'uploading' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          'w-full rounded-(--radius-lg) border-2 border-dashed',
          'flex flex-col items-center justify-center gap-(--spacing-s3)',
          'py-(--spacing-s7) px-(--spacing-s5)',
          'transition-all duration-(--duration-base)',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-marigold) focus-visible:ring-offset-2',
          zoneStyles[state],
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
        aria-label={
          state === 'success' || state === 'replace'
            ? `Resume uploaded: ${uploadedFilename}. Click to replace.`
            : 'Upload your resume. Click or drag and drop.'
        }
      >
        {/* Icon */}
        <span
          className={[
            state === 'success' || state === 'replace'
              ? 'text-(--color-leaf)'
              : state === 'error'
                ? 'text-(--color-kumkum)'
                : 'text-(--color-ink-400)',
          ].join('')}
        >
          {state === 'success' || state === 'replace'
            ? ICON.check
            : state === 'error'
              ? ICON.error
              : ICON.upload}
        </span>

        {/* Text */}
        {state === 'idle' || state === 'drag' ? (
          <div className="text-center">
            <p className="text-(--font-size-step-0) font-medium text-(--color-graphite)">
              {state === 'drag' ? 'Drop to upload' : 'Drag your résumé here'}
            </p>
            <p className="text-(--font-size-step--1) text-(--color-ink-400) mt-(--spacing-s1)">
              or click to browse · PDF, DOC, DOCX · max 5 MB
            </p>
          </div>
        ) : state === 'uploading' ? (
          <div className="w-full max-w-xs text-center">
            <p className="text-(--font-size-step--1) font-medium text-(--color-graphite) mb-(--spacing-s3)">
              Uploading…
            </p>
            <div
              role="progressbar"
              aria-valuenow={progress ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Upload progress"
              data-testid="resume-progress"
              className="h-1 w-full bg-(--color-ink-900)/10 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-(--color-marigold) transition-all duration-(--duration-fast)"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
          </div>
        ) : state === 'success' || state === 'replace' ? (
          <div className="text-center">
            <p
              data-testid="resume-filename"
              className="text-(--font-size-step-0) font-medium text-(--color-graphite) truncate max-w-[280px]"
            >
              {uploadedFilename}
            </p>
            <p className="text-(--font-size-step--1) text-(--color-leaf) mt-(--spacing-s1)">
              Uploaded successfully · Click to replace
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-(--font-size-step-0) font-medium text-(--color-kumkum)">
              {displayError}
            </p>
            <p className="text-(--font-size-step--1) text-(--color-graphite) mt-(--spacing-s1)">
              Click to try again
            </p>
          </div>
        )}
      </button>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXT}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onInputChange}
      />
    </div>
  )
}
