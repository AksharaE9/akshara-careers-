/**
 * components/ui/Checkbox.tsx
 *
 * §2.6 & §21.2 — Checkbox component with 3:1 border (--color-border),
 * rust focus ring (--color-rust), ink checked fill, and warm typography.
 * States: default | hover | focus-visible | checked | disabled | error
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
      <div className="flex items-start gap-3">
        <div className="relative flex items-center h-6">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-describedby={hintId}
            aria-invalid={error ? true : undefined}
            data-testid={`field-${id}`}
            className={[
              'peer h-5 w-5 rounded-(--radius-xs)',
              'border border-(--color-border) bg-white',
              'text-(--color-ink) cursor-pointer',
              'transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-rust) focus-visible:ring-offset-2',
              'checked:bg-(--color-ink) checked:border-(--color-ink)',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              error ? 'border-(--color-kumkum) focus-visible:ring-(--color-kumkum)' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          />
          {/* Custom Checkmark indicator */}
          <span className="absolute left-[2px] pointer-events-none opacity-0 peer-checked:opacity-100 text-white transition-opacity duration-150 flex items-center justify-center">
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
          <div className="flex flex-col gap-1">
            <label
              htmlFor={id}
              className={[
                'text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] font-medium leading-none cursor-pointer',
                rest.disabled ? 'opacity-40 cursor-not-allowed' : 'text-(--color-ink)',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {label}
            </label>
            {hint && (
              <span id={hintId} className="text-[clamp(0.69rem,0.66rem+0.12vw,0.78rem)] text-(--color-muted)">
                {hint}
              </span>
            )}
          </div>
        )}
      </div>
    )
  },
)
