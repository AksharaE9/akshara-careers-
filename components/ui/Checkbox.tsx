/**
 * components/ui/Checkbox.tsx
 *
 * §2.6 — Checkbox component with standard states.
 * States: default | hover | focus-visible | checked | disabled | error
 *
 * Implements accessible keyboard activation (Space) and focus rings.
 */

import { forwardRef, type InputHTMLAttributes } from 'react'

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string
  label?: string
  error?: boolean
  hint?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ id, label, error, hint, className = '', ...rest }, ref) {
    const hintId = hint ? `${id}-hint` : undefined

    return (
      <div className="flex items-start gap-[--spacing-s3]">
        <div className="relative flex items-center h-6">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-describedby={hintId}
            aria-invalid={error ? true : undefined}
            data-testid={`field-${id}`}
            className={[
              'peer h-5 w-5 rounded-[--radius-sm]',
              'border border-[--color-ink-900]/25 bg-[--color-chalk]',
              'text-[--color-marigold] cursor-pointer',
              'transition-all duration-[--duration-fast]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-marigold] focus-visible:ring-offset-2',
              'checked:bg-[--color-ink-900] checked:border-[--color-ink-900]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              error ? 'border-[--color-kumkum] focus-visible:ring-[--color-kumkum]' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          />
          {/* Custom Checkmark indicator */}
          <span className="absolute left-[2px] pointer-events-none opacity-0 peer-checked:opacity-100 text-white transition-opacity duration-[--duration-fast] flex items-center justify-center">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </div>

        {label && (
          <div className="flex flex-col gap-[--spacing-s1]">
            <label
              htmlFor={id}
              className={[
                'text-[--font-size-step-0] font-medium leading-none cursor-pointer',
                rest.disabled ? 'opacity-40 cursor-not-allowed' : 'text-[--color-graphite]',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {label}
            </label>
            {hint && (
              <span id={hintId} className="text-[--font-size-step--1] text-[--color-ink-400]">
                {hint}
              </span>
            )}
          </div>
        )}
      </div>
    )
  },
)
