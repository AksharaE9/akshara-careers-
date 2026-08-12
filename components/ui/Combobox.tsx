/**
 * components/ui/Combobox.tsx
 *
 * §2.6 & §21.2 — Async combobox for college/course lookup with 3:1 WCAG border (--color-border),
 * warm ink text, rust focus ring (--color-rust), and sand active option highlighting.
 * ARIA combobox pattern: role="combobox", role="listbox", role="option".
 * Keyboard: Arrow↑↓ to navigate, Enter to select, Escape to close, Home/End.
 */

'use client'

import {
  useRef,
  useState,
  useEffect,
  useId,
  type KeyboardEvent,
} from 'react'
import { buildDescribedBy } from './FieldWrapper'

export interface ComboboxOption {
  value: string
  label: string
  /** Secondary text (e.g. city, course level) */
  meta?: string
}

export interface ComboboxProps {
  id: string
  label?: string | undefined
  placeholder?: string | undefined
  hint?: string | undefined
  error?: string | undefined
  /** Called on every keystroke — returns options (server action or API call) */
  onSearch: (query: string) => Promise<ComboboxOption[]>
  /** Called when user selects an option from the dropdown */
  onSelect: (option: ComboboxOption) => void
  /** Called when user blurs without selecting from dropdown (free-text fallback) */
  onFreeText?: (text: string) => void
  value?: string | undefined
  disabled?: boolean | undefined
  /** Minimum chars before search fires */
  minChars?: number | undefined
  /** data-testid root — per §10.1 pattern */
  'data-testid'?: string | undefined
}

export function Combobox({
  id,
  placeholder = 'Start typing…',
  hint,
  error,
  onSearch,
  onSelect,
  onFreeText,
  value = '',
  disabled = false,
  minChars = 2,
  'data-testid': testId,
}: ComboboxProps) {
  const listboxId = useId()
  const [inputValue, setInputValue] = useState(value)
  const [options, setOptions] = useState<ComboboxOption[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSelectingRef = useRef(false)

  const describedBy = buildDescribedBy(id, { hint, error })
  const hasError = Boolean(error)

  const onSearchRef = useRef(onSearch)
  useEffect(() => {
    onSearchRef.current = onSearch
  }, [onSearch])

  useEffect(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false
      return
    }
    if (inputValue.length < minChars) {
      queueMicrotask(() => {
        setOptions([])
        setOpen(false)
      })
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await onSearchRef.current(inputValue)
        setOptions(results)
        setOpen(results.length > 0)
        setActiveIndex(-1)
      } catch {
        setOptions([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inputValue, minChars])

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleSelect = (option: ComboboxOption) => {
    isSelectingRef.current = true
    setInputValue(option.label)
    setOpen(false)
    setActiveIndex(-1)
    onSelect(option)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (options.length > 0) setOpen(true)
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1))
        break
      case 'Enter':
        if (open && activeIndex >= 0 && options[activeIndex]) {
          e.preventDefault()
          handleSelect(options[activeIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
        break
      case 'Tab':
        setOpen(false)
        if (!isSelectingRef.current && inputValue.trim().length >= (minChars ?? 1)) {
          onFreeText?.(inputValue.trim())
        }
        break
    }
  }

  return (
    <div
      className="relative w-full"
      data-testid={testId}
    >
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          data-testid={`field-${id}`}
          type="text"
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            const newVal = e.target.value
            setInputValue(newVal)
            onFreeText?.(newVal)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (options.length > 0 && inputValue.length >= minChars) {
              setOpen(true)
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              setOpen(false)
              if (!isSelectingRef.current && inputValue.trim()) {
                onFreeText?.(inputValue.trim())
              }
            }, 200)
          }}
          className={[
            'w-full min-h-[44px] px-3.5 py-2.5 pr-10',
            'font-sans text-[clamp(1.00rem,0.95rem+0.25vw,1.13rem)] text-(--color-ink) font-medium',
            'bg-white rounded-md shadow-xs',
            'border border-(--color-border)',
            'transition-colors duration-150',
            'placeholder:text-(--color-muted) placeholder:font-normal',
            'hover:border-(--color-ink)',
            'focus:outline-none focus:border-(--color-rust) focus:ring-2 focus:ring-(--color-rust)/30',
            'disabled:bg-(--color-sand) disabled:text-(--color-muted) disabled:cursor-not-allowed',
            hasError ? 'border-(--color-kumkum) ring-2 ring-(--color-kumkum)/30' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />

        {/* Loading/search indicator */}
        <span
          className="absolute inset-y-0 right-3.5 flex items-center text-(--color-muted) pointer-events-none"
          aria-hidden="true"
        >
          {loading ? (
            <svg className="animate-spin w-4 h-4 text-(--color-rust)" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity=".25" />
              <path fill="currentColor" fillOpacity=".75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </span>
      </div>

      {/* Listbox Dropdown */}
      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Suggestions"
          className={[
            'absolute z-50 w-full mt-1.5',
            'max-h-60 overflow-y-auto',
            'bg-white rounded-md',
            'border border-(--color-hairline)',
            'shadow-xl shadow-slate-900/10',
            'py-1.5',
          ].join(' ')}
        >
          {options.map((option, i) => (
            <li
              key={option.value}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(option)
              }}
              className={[
                'flex flex-col px-3.5 py-2.5 cursor-pointer',
                'transition-colors duration-150',
                i === activeIndex
                  ? 'bg-(--color-sand) text-(--color-ink) font-semibold'
                  : 'text-(--color-ink) hover:bg-(--color-paper)',
              ].join(' ')}
            >
              <span className="text-[clamp(1.00rem,0.95rem+0.25vw,1.13rem)] font-medium leading-tight">
                {option.label}
              </span>
              {option.meta && (
                <span className="text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)] text-(--color-muted) mt-0.5">
                  {option.meta}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
