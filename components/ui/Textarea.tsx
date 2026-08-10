/**
 * components/ui/Textarea.tsx
 *
 * §2.6 — Textarea with live character counter.
 * States: default | focus | filled | disabled | error
 * 
 * Live counter: announces remaining characters to screen readers via aria-live.
 */

'use client'

import { forwardRef, useState, type TextareaHTMLAttributes } from 'react'
import { buildDescribedBy } from './FieldWrapper'

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string
  hint?: string | undefined
  error?: string | undefined
  /** Character limit — shows counter if set */
  maxChars?: number | undefined
  rows?: number | undefined
}

const baseTextarea = [
  'w-full px-(--spacing-s4) py-(--spacing-s3)',
  'font-sans text-(--font-size-step-0) text-(--color-graphite)',
  'bg-(--color-chalk) rounded-(--radius-md)',
  'border border-(--color-ink-900)/20',
  'transition-colors duration-(--duration-fast)',
  'resize-y',
  'placeholder:text-(--color-ink-400)',
  'hover:border-(--color-ink-900)/40',
  'focus:outline-none focus:border-(--color-marigold) focus:ring-1 focus:ring-(--color-marigold)',
  'disabled:bg-(--color-ink-900)/4 disabled:text-(--color-ink-400) disabled:cursor-not-allowed',
  'aria-invalid:border-(--color-kumkum) aria-invalid:ring-1 aria-invalid:ring-(--color-kumkum)/30',
].join(' ')

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      id,
      hint,
      error,
      maxChars,
      rows = 4,
      className = '',
      onChange,
      defaultValue,
      value,
      ...rest
    },
    ref,
  ) {
    const [charCount, setCharCount] = useState(
      typeof value === 'string'
        ? value.length
        : typeof defaultValue === 'string'
          ? defaultValue.length
          : 0,
    )

    const describedBy = buildDescribedBy(id, { hint, error })
    const counterId = maxChars ? `${id}-counter` : undefined
    const hasError = Boolean(error)
    const remaining = maxChars !== undefined ? maxChars - charCount : undefined

    const allDescribedBy = [describedBy, counterId].filter(Boolean).join(' ') || undefined

    return (
      <div className="relative">
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={allDescribedBy}
          data-testid={`field-${id}`}
          maxLength={maxChars}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            setCharCount(e.target.value.length)
            onChange?.(e)
          }}
          className={[baseTextarea, className].filter(Boolean).join(' ')}
          {...rest}
        />
        {maxChars !== undefined && (
          <p
            id={counterId}
            aria-live="polite"
            aria-atomic="true"
            className={[
              'mt-(--spacing-s1) text-right text-(--font-size-step--1) tabular',
              remaining !== undefined && remaining <= 20
                ? 'text-(--color-kumkum) font-medium'
                : 'text-(--color-ink-400)',
            ].join(' ')}
          >
            <span className="sr-only">Characters remaining: </span>
            {remaining !== undefined ? remaining : maxChars - charCount}
          </p>
        )}
      </div>
    )
  },
)
