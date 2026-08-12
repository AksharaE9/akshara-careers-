/**
 * components/ui/Input.tsx
 *
 * §2.6 & §21.2 — Text input with 3:1 WCAG border (--color-border: #8B7D67),
 * white fill, warm ink text, and rust focus ring (--color-rust: #A8432A).
 * States: default | focus | filled | disabled | readonly | error
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
  'w-full min-h-[44px] px-3.5 py-2.5',
  // Typography
  'font-sans text-[clamp(1.00rem,0.95rem+0.25vw,1.13rem)] text-(--color-ink) font-medium',
  // Visual (§21.2: white fill with 3:1 border)
  'bg-white rounded-md',
  'border border-(--color-border) shadow-xs',
  // Transitions
  'transition-colors duration-150',
  // States
  'placeholder:text-(--color-muted) placeholder:font-normal',
  'hover:border-(--color-ink)',
  'focus:outline-none focus:border-(--color-rust) focus:ring-2 focus:ring-(--color-rust)/30',
  'disabled:bg-(--color-sand) disabled:text-(--color-muted) disabled:cursor-not-allowed',
  'read-only:bg-(--color-sand) text-(--color-ink)',
  'aria-invalid:border-(--color-kumkum) aria-invalid:ring-2 aria-invalid:ring-(--color-kumkum)/30',
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
        <div className="relative flex items-center w-full">
          {prefix && (
            <span className="absolute left-3.5 text-(--color-muted-strong) font-semibold text-[clamp(1.00rem,0.95rem+0.25vw,1.13rem)] pointer-events-none select-none z-10">
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
              prefix ? 'pl-14' : '',
              suffix ? 'pr-12' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          />
          {suffix && (
            <span className="absolute right-3.5 text-(--color-muted) text-[clamp(1.00rem,0.95rem+0.25vw,1.13rem)] pointer-events-none select-none z-10">
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
