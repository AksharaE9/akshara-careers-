/**
 * components/ui/Card.tsx
 *
 * §2.6 & §21.2 — Card primitive for displaying jobs, drives, application info etc.
 * Supports padding, warm white/paper grounds, drawn hairlines, and warm shadows.
 */

import { forwardRef, type HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  variant?: 'light' | 'dark' | 'outline'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card({ children, interactive = false, variant = 'light', className = '', ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={[
          'rounded-(--radius-lg) p-(--spacing-s5)',
          'transition-all duration-(--duration-base)',
          // Variants
          variant === 'light'
            ? 'bg-white border border-(--color-hairline) text-(--color-ink) shadow-xs'
            : variant === 'dark'
              ? 'ink-band bg-(--color-ink) border border-(--color-hairline) text-(--color-paper) shadow-md'
              : 'bg-transparent border border-(--color-hairline) text-(--color-ink)',
          // Interactive
          interactive
            ? 'cursor-pointer hover:border-(--color-border) hover:shadow-md hover:scale-[1.01] focus-within:ring-2 focus-within:ring-(--color-rust) focus-within:ring-offset-1'
            : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {children}
      </div>
    )
  },
)
