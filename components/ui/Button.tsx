/**
 * components/ui/Button.tsx
 *
 * §2.6 — All four variants × every state
 * Variants: primary | secondary | ghost | destructive
 * States: default | hover (CSS) | active (CSS) | focus-visible (CSS) | disabled | loading
 *
 * Touch target: 44×44px minimum (§8.2).
 * No icon imports — icons passed as ReactNode children.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /** Leading icon — rendered before children */
  leftIcon?: ReactNode
  /** Trailing icon — rendered after children */
  rightIcon?: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-(--color-marigold) text-(--color-ink-900) font-semibold',
    'hover:bg-(--color-marigold-press)',
    'active:scale-[0.97]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
  ].join(' '),
  secondary: [
    'bg-transparent text-(--color-ink-900) font-medium',
    'border border-(--color-ink-900)/30',
    'hover:bg-(--color-ink-900)/6',
    'active:bg-(--color-ink-900)/10 active:scale-[0.97]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
  ].join(' '),
  ghost: [
    'bg-transparent text-(--color-ink-900) font-medium',
    'hover:bg-(--color-ink-900)/6',
    'active:bg-(--color-ink-900)/10 active:scale-[0.97]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
  ].join(' '),
  destructive: [
    'bg-transparent text-(--color-kumkum) font-medium',
    'border border-(--color-kumkum)/30',
    'hover:bg-(--color-kumkum)/6',
    'active:bg-(--color-kumkum)/10 active:scale-[0.97]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
  ].join(' '),
}

// Dark-ground variants (for use on --color-ink-900 / --color-ink-800 backgrounds)
export const variantStylesDark: Record<ButtonVariant, string> = {
  primary: variantStyles.primary, // marigold works on dark
  secondary: [
    'bg-transparent text-white font-medium',
    'border border-white/30',
    'hover:bg-white/10',
    'active:bg-white/15 active:scale-[0.97]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
  ].join(' '),
  ghost: [
    'bg-transparent text-white font-medium',
    'hover:bg-white/10',
    'active:bg-white/15 active:scale-[0.97]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
  ].join(' '),
  destructive: variantStyles.destructive,
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-(--spacing-s4) text-(--font-size-step--1) gap-(--spacing-s2)',
  md: 'min-h-[44px] px-(--spacing-s5) text-(--font-size-step-0) gap-(--spacing-s3)',
  lg: 'min-h-[52px] px-(--spacing-s6) text-(--font-size-step-1) gap-(--spacing-s3)',
}

const LoadingSpinner = () => (
  <svg
    className="animate-spin"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
)

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className = '',
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled ?? loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        className={[
          // Base
          'inline-flex items-center justify-center',
          'rounded-(--radius-md)',
          'font-sans',
          'transition-all duration-(--duration-fast)',
          'outline-offset-2',
          // Variant
          variantStyles[variant],
          // Size
          sizeStyles[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? (
          <>
            <LoadingSpinner />
            <span className="sr-only">Loading…</span>
            {/* Keep original content for layout stability */}
            <span aria-hidden="true" className="opacity-0 absolute">
              {children}
            </span>
          </>
        ) : (
          <>
            {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  },
)
