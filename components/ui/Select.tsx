/**
 * components/ui/Select.tsx
 *
 * §2.6 & §21.2 — Native <select> styled with 3:1 WCAG border (--color-border),
 * white fill, warm ink text, and rust focus ring (--color-rust).
 * States: default | focus | disabled | error
 */

import { forwardRef, type SelectHTMLAttributes } from 'react'
import { buildDescribedBy } from './FieldWrapper'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string
  hint?: string | undefined
  error?: string | undefined
  placeholder?: string | undefined
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { id, hint, error, placeholder, className = '', children, ...rest },
    ref,
  ) {
    const describedBy = buildDescribedBy(id, { hint, error })
    const hasError = Boolean(error)

    return (
      <div className="relative w-full">
        <select
          ref={ref}
          id={id}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          data-testid={`field-${id}`}
          className={[
            'w-full min-h-[44px] px-3.5 py-2.5',
            'font-sans text-[clamp(1.00rem,0.95rem+0.25vw,1.13rem)] text-(--color-ink) font-medium',
            'bg-white rounded-md shadow-xs',
            'border border-(--color-border)',
            'transition-colors duration-150',
            'appearance-none pr-10', // room for chevron
            'hover:border-(--color-ink)',
            'focus:outline-none focus:border-(--color-rust) focus:ring-2 focus:ring-(--color-rust)/30',
            'disabled:bg-(--color-sand) disabled:text-(--color-muted) disabled:cursor-not-allowed',
            hasError
              ? 'border-(--color-kumkum) ring-2 ring-(--color-kumkum)/30'
              : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled className="text-(--color-muted)">
              {placeholder}
            </option>
          )}
          {children}
        </select>

        {/* Chevron icon */}
        <span
          className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-(--color-muted)"
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    )
  },
)
