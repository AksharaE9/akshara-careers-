/**
 * components/ui/MultiChipInput.tsx
 *
 * §2.6 — Multi-select chip input for languages (D5).
 * Fixed option list with "Other" text escape hatch.
 * States: unselected | selected | hover | focus | disabled
 *
 * Renders as a group of toggle buttons (role="group" > role="checkbox" semantics).
 */

'use client'

import { useState } from 'react'

export interface ChipOption {
  label: string
  value: string
}

export interface MultiChipInputProps {
  id: string
  options: ChipOption[]
  value: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
  error?: string
  /** If true, shows a text input for custom values */
  allowOther?: boolean
}

export function MultiChipInput({
  id,
  options,
  value: selected,
  onChange,
  disabled = false,
  error,
  allowOther = false,
}: MultiChipInputProps) {
  const [otherValue, setOtherValue] = useState('')
  const hasError = Boolean(error)

  const toggle = (chipValue: string) => {
    if (selected.includes(chipValue)) {
      onChange(selected.filter((v) => v !== chipValue))
    } else {
      onChange([...selected, chipValue])
    }
  }

  const addOther = () => {
    const trimmed = otherValue.trim()
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed])
      setOtherValue('')
    }
  }

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      data-testid={`field-${id}`}
      className={[
        'flex flex-wrap gap-[--spacing-s2]',
        hasError ? 'ring-1 ring-[--color-kumkum]/30 rounded-[--radius-md] p-[--spacing-s2]' : '',
      ].join(' ')}
    >
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => toggle(opt.value)}
            className={[
              'inline-flex items-center min-h-[36px] px-[--spacing-s4] rounded-full',
              'text-[--font-size-step--1] font-medium',
              'border transition-all duration-[--duration-fast]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-marigold] focus-visible:ring-offset-1',
              isSelected
                ? 'bg-[--color-ink-900] text-white border-[--color-ink-900]'
                : 'bg-transparent text-[--color-graphite] border-[--color-ink-900]/20 hover:border-[--color-ink-900]/50',
              disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'cursor-pointer active:scale-95',
            ].join(' ')}
          >
            {isSelected && (
              <svg
                className="mr-[--spacing-s1] -ml-[--spacing-s1]"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {opt.label}
          </button>
        )
      })}

      {allowOther && (
        <div className="flex items-center gap-[--spacing-s2]">
          <input
            type="text"
            value={otherValue}
            onChange={(e) => setOtherValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOther())}
            placeholder="Other…"
            disabled={disabled}
            className={[
              'min-h-[36px] px-[--spacing-s3] py-[--spacing-s2]',
              'text-[--font-size-step--1] text-[--color-graphite]',
              'bg-[--color-chalk] rounded-full',
              'border border-[--color-ink-900]/20',
              'focus:outline-none focus:border-[--color-marigold] focus:ring-1 focus:ring-[--color-marigold]',
              'placeholder:text-[--color-ink-400]',
              'w-28',
            ].join(' ')}
          />
          <button
            type="button"
            onClick={addOther}
            disabled={!otherValue.trim() || disabled}
            className="text-[--font-size-step--1] text-[--color-marigold] font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
