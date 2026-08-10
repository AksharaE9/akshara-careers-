/**
 * components/ui/Card.tsx
 *
 * §2.6 — Card primitive for displaying jobs, drives, application info etc.
 * Supports padding, light paper / dark grounds, interactive states.
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
            ? 'bg-(--color-chalk) border border-(--color-ink-900)/10 text-(--color-graphite) shadow-sm'
            : variant === 'dark'
              ? 'bg-(--color-ink-800) border border-(--color-ink-600)/30 text-white shadow-md shadow-(--color-ink-900)/20'
              : 'bg-transparent border border-(--color-ink-900)/15 text-(--color-graphite)',
          // Interactive
          interactive
            ? 'cursor-pointer hover:border-(--color-marigold)/50 hover:shadow-md hover:scale-[1.01] focus-within:ring-2 focus-within:ring-(--color-marigold) focus-within:ring-offset-1'
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
