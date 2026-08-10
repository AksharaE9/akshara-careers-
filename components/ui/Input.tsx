/**
 * components/ui/Input.tsx
 *
 * §2.6 — Text input with all states.
 * States: default | focus | filled | disabled | readonly | error
 * 
 * Always used inside FieldWrapper for label + error wire-up.
 */

import { forwardRef, type InputHTMLAttributes } from 'react'
import { buildDescribedBy } from './FieldWrapper'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  id: string
  hint?: string | undefined
  error?: string | undefined
  /** Leading decorative icon or text (e.g. "₹", "+91") */
  prefix?: React.ReactNode | undefined
  /** Trailing decorative icon (e.g. calendar icon) */
  suffix?: React.ReactNode | undefined
}

const baseInput = [
  // Layout
  'w-full min-h-[44px] px-(--spacing-s4) py-(--spacing-s3)',
  // Typography
  'font-sans text-(--font-size-step-0) text-(--color-graphite)',
  // Visual
  'bg-(--color-chalk) rounded-(--radius-md)',
  'border border-(--color-ink-900)/20',
  // Transitions
  'transition-colors duration-(--duration-fast)',
  // States
  'placeholder:text-(--color-ink-400)',
  'hover:border-(--color-ink-900)/40',
  'focus:outline-none focus:border-(--color-marigold) focus:ring-1 focus:ring-(--color-marigold)',
  'disabled:bg-(--color-ink-900)/4 disabled:text-(--color-ink-400) disabled:cursor-not-allowed',
  'read-only:bg-(--color-ink-900)/4',
  'aria-invalid:border-(--color-kumkum) aria-invalid:ring-1 aria-invalid:ring-(--color-kumkum)/30',
].join(' ')

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { id, hint, error, prefix, suffix, className = '', ...rest },
    ref,
  ) {
    const describedBy = buildDescribedBy(id, { hint, error })
    const hasError = Boolean(error)

    if (prefix || suffix) {
      return (
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-(--spacing-s4) text-(--color-ink-400) text-(--font-size-step-0) pointer-events-none select-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={describedBy}
            data-testid={`field-${id}`}
            className={[
              baseInput,
              prefix ? 'pl-[calc(var(--spacing-s4)*2+1em)]' : '',
              suffix ? 'pr-[calc(var(--spacing-s4)*2+1em)]' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          />
          {suffix && (
            <span className="absolute right-(--spacing-s4) text-(--color-ink-400) text-(--font-size-step-0) pointer-events-none select-none">
              {suffix}
            </span>
          )}
        </div>
      )
    }

    return (
      <input
        ref={ref}
        id={id}
        aria-invalid={hasError ? true : undefined}
        aria-describedby={describedBy}
        data-testid={`field-${id}`}
        className={[baseInput, className].filter(Boolean).join(' ')}
        {...rest}
      />
    )
  },
)
