/**
 * components/ui/Combobox.tsx
 *
 * §2.6 — Async combobox for college/course lookup (D3, D4).
 * ARIA combobox pattern: role="combobox", role="listbox", role="option".
 * Keyboard: Arrow↑↓ to navigate, Enter to select, Escape to close, Home/End.
 * 
 * Used for:
 * - College lookup (D4 — 47 strings → 28 canonical)
 * - Course lookup (D3 — 12 strings → 3 canonical)
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
      // F7: setOptions/setOpen deferred to a microtask rather than called
      // synchronously in the effect body — react-hooks/set-state-in-effect
      // flags exactly this (a setState reachable without an intervening
      // await/task boundary). queueMicrotask preserves the early-return
      // control flow below (still exits before the debounce/search setup)
      // while genuinely deferring the state update, not just syntactically
      // hiding it.
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
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inputValue, minChars])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && e.key !== 'Enter') return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && options[activeIndex]) {
          handleSelect(options[activeIndex])
        }
        break
      case 'Escape':
        setOpen(false)
        setActiveIndex(-1)
        inputRef.current?.focus()
        break
      default:
        break
    }
  }

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const li = listRef.current.children[activeIndex] as HTMLElement | undefined
      li?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const handleSelect = (option: ComboboxOption) => {
    isSelectingRef.current = true
    setInputValue(option.label)
    setOpen(false)
    setActiveIndex(-1)
    onSelect(option)
    inputRef.current?.focus()
  }

  return (
    <div className="relative" data-testid={testId}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          data-testid={`field-${id}`}
          autoComplete="off"
          type="text"
          value={inputValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            isSelectingRef.current = false
            setInputValue(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => {
              setOpen(false)
              // If no option was selected from dropdown (isSelectingRef not set),
              // call onFreeText with whatever the user typed
              if (!isSelectingRef.current && inputValue.trim().length >= (minChars ?? 1)) {
                onFreeText?.(inputValue.trim())
              }
            }, 300)
          }}
          className={[
            'w-full min-h-[44px] px-(--spacing-s4) py-(--spacing-s3) pr-10',
            'font-sans text-(--font-size-step-0) text-(--color-graphite)',
            'bg-(--color-chalk) rounded-(--radius-md)',
            'border border-(--color-ink-900)/20',
            'transition-colors duration-(--duration-fast)',
            'placeholder:text-(--color-ink-400)',
            'hover:border-(--color-ink-900)/40',
            'focus:outline-none focus:border-(--color-marigold) focus:ring-1 focus:ring-(--color-marigold)',
            'disabled:bg-(--color-ink-900)/4 disabled:text-(--color-ink-400) disabled:cursor-not-allowed',
            hasError ? 'border-(--color-kumkum) ring-1 ring-(--color-kumkum)/30' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />

        {/* Loading/search indicator */}
        <span
          className="absolute inset-y-0 right-(--spacing-s4) flex items-center text-(--color-ink-400)"
          aria-hidden="true"
        >
          {loading ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
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

      {/* Listbox */}
      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Suggestions"
          className={[
            'absolute z-50 w-full mt-(--spacing-s1)',
            'max-h-60 overflow-y-auto',
            'bg-(--color-chalk) rounded-(--radius-md)',
            'border border-(--color-ink-900)/15',
            'shadow-lg shadow-(--color-ink-900)/10',
            'py-(--spacing-s1)',
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
                'flex flex-col px-(--spacing-s4) py-(--spacing-s3) cursor-pointer',
                'transition-colors duration-(--duration-fast)',
                i === activeIndex
                  ? 'bg-(--color-marigold)/10 text-(--color-ink-900)'
                  : 'text-(--color-graphite) hover:bg-(--color-ink-900)/4',
              ].join(' ')}
            >
              <span className="text-(--font-size-step-0) font-medium leading-tight">
                {option.label}
              </span>
              {option.meta && (
                <span className="text-(--font-size-step--1) text-(--color-ink-400) mt-[2px]">
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
