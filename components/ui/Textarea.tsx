/**
 * components/ui/Textarea.tsx
 *
 * §2.6 & §21.2 — Textarea with 3:1 WCAG border (--color-border),
 * white fill, warm ink text, rust focus ring (--color-rust), and live character counter.
 * States: default | focus | filled | disabled | error
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
  'w-full px-3.5 py-2.5',
  'font-sans text-[clamp(1.00rem,0.95rem+0.25vw,1.13rem)] text-(--color-ink) font-medium',
  'bg-white rounded-md shadow-xs',
  'border border-(--color-border)',
  'transition-colors duration-150',
  'resize-y',
  'placeholder:text-(--color-muted) placeholder:font-normal',
  'hover:border-(--color-ink)',
  'focus:outline-none focus:border-(--color-rust) focus:ring-2 focus:ring-(--color-rust)/30',
  'disabled:bg-(--color-sand) disabled:text-(--color-muted) disabled:cursor-not-allowed',
  'aria-invalid:border-(--color-kumkum) aria-invalid:ring-2 aria-invalid:ring-(--color-kumkum)/30',
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
      <div className="relative w-full">
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
              'mt-1 text-right text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] tabular-nums',
              remaining !== undefined && remaining <= 20
                ? 'text-(--color-kumkum) font-medium'
                : 'text-(--color-muted)',
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
