/**
 * components/ui/Switch.tsx
 *
 * §2.6 — Switch / Toggle component for binary choices (e.g. fresher-toggle).
 * States: default | hover | active | focus | disabled | checked
 *
 * Implements aria-checked, role="switch" for accessibility.
 */

'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  hint?: string
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch({ id, checked, onChange, label, hint, disabled = false, className = '', ...rest }, ref) {
    const hintId = hint ? `${id}-hint` : undefined

    return (
      <div className="flex items-center gap-(--spacing-s3)">
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-describedby={hintId}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          data-testid={`fresher-toggle`}
          className={[
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-(--duration-base) ease-in-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-marigold) focus-visible:ring-offset-2',
            checked ? 'bg-(--color-ink-900)' : 'bg-(--color-ink-900)/15',
            disabled ? 'opacity-40 cursor-not-allowed' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        >
          <span
            className={[
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-(--color-chalk) shadow ring-0',
              'transition duration-(--duration-base) ease-in-out',
              checked ? 'translate-x-5' : 'translate-x-0',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        </button>

        {label && (
          <div className="flex flex-col gap-(--spacing-s1)">
            <label
              htmlFor={id}
              className={[
                'text-(--font-size-step-0) font-medium leading-none cursor-pointer',
                disabled ? 'opacity-40 cursor-not-allowed' : 'text-(--color-graphite)',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {label}
            </label>
            {hint && (
              <span id={hintId} className="text-(--font-size-step--1) text-(--color-ink-400)">
                {hint}
              </span>
            )}
          </div>
        )}
      </div>
    )
  },
)
