/**
 * components/ui/FieldWrapper.tsx
 *
 * §2.6 — Wraps all form fields with label, hint, error, required marker.
 * Used by Input, Textarea, Select, Combobox, etc.
 * Implements ARIA best practices: label[for], aria-describedby, aria-invalid.
 */

import type { ReactNode } from 'react'

export interface FieldWrapperProps {
  /** Unique ID — must match the input's id (for label[for] and aria-describedby) */
  id: string
  label: string
  /** Shows an asterisk and adds aria-required semantics */
  required?: boolean | undefined
  hint?: string | undefined
  error?: string | undefined
  children: ReactNode
  className?: string | undefined
  /** data-testid for the field root — per §10.1 pattern: field-{name} */
  'data-testid'?: string | undefined
}

export function FieldWrapper({
  id,
  label,
  required,
  hint,
  error,
  children,
  className = '',
  'data-testid': testId,
}: FieldWrapperProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  // Clone children to inject aria props — children should be a single form element
  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      data-testid={testId}
    >
      <label
        htmlFor={id}
        className="text-(--font-size-step--1) font-semibold text-(--color-text-on-dark) [data-ground=light]:text-(--color-text-on-light) leading-tight"
      >
        {label}
        {required && (
          <span
            className="ml-1 text-(--color-amber-400)"
            aria-hidden="true"
          >
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>

      <div className="relative">
        {children}
      </div>

      {hint && !error && (
        <p
          id={hintId}
          className="text-(--font-size-step--2) text-(--color-text-on-dark-muted) [data-ground=light]:text-(--color-text-on-light-muted) leading-snug"
        >
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          data-testid={`error-${id}`}
          className="flex items-center gap-1.5 text-(--font-size-step--2) text-red-400 font-medium leading-snug"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0 mt-px"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Helper to build aria-describedby string from hint/error IDs.
 * Used inside Input, Textarea, etc. to wire up the correct IDs.
 *
 * Usage in Input:
 *   aria-describedby={buildDescribedBy(id, { hint, error })}
 */
export function buildDescribedBy(
  id: string,
  { hint, error }: { hint?: string | undefined; error?: string | undefined },
): string | undefined {
  const parts: string[] = []
  if (hint && !error) parts.push(`${id}-hint`)
  if (error) parts.push(`${id}-error`)
  return parts.length > 0 ? parts.join(' ') : undefined
}
