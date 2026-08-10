/**
 * components/ui/Select.tsx
 *
 * §2.6 — Native <select> styled consistently.
 * States: default | focus | disabled | error
 * 
 * We use native <select> (not custom dropdown) for mobile compatibility and
 * accessibility. The combobox is a separate component (Combobox.tsx).
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
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          data-testid={`field-${id}`}
          className={[
            'w-full min-h-[44px] px-[--spacing-s4] py-[--spacing-s3]',
            'font-[family-name:--font-body] text-[--font-size-step-0] text-[--color-graphite]',
            'bg-[--color-chalk] rounded-[--radius-md]',
            'border border-[--color-ink-900]/20',
            'transition-colors duration-[--duration-fast]',
            'appearance-none pr-10', // room for chevron
            'hover:border-[--color-ink-900]/40',
            'focus:outline-none focus:border-[--color-marigold] focus:ring-1 focus:ring-[--color-marigold]',
            'disabled:bg-[--color-ink-900]/4 disabled:text-[--color-ink-400] disabled:cursor-not-allowed',
            hasError
              ? 'border-[--color-kumkum] ring-1 ring-[--color-kumkum]/30'
              : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>

        {/* Chevron icon */}
        <span
          className="pointer-events-none absolute inset-y-0 right-[--spacing-s4] flex items-center text-[--color-ink-400]"
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    )
  },
)
