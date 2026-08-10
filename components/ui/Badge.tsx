/**
 * components/ui/Badge.tsx
 *
 * §2.6 — Badge component for metadata chips, job families, drive status etc.
 * Variants: default | success | warning | info
 */

import type { ReactNode } from 'react'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'info' | 'accent'

export interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-(--color-ink-900)/6 text-(--color-graphite) border-(--color-ink-900)/10',
  success: 'bg-(--color-leaf)/8 text-(--color-leaf) border-(--color-leaf)/15',
  warning: 'bg-(--color-kumkum)/8 text-(--color-kumkum) border-(--color-kumkum)/15',
  info: 'bg-(--color-ink-600)/8 text-(--color-ink-600) border-(--color-ink-600)/15',
  accent: 'bg-(--color-marigold)/10 text-(--color-marigold-press) border-(--color-marigold)/15',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-(--spacing-s2) py-[2px] rounded-(--radius-sm)',
        'text-(--font-size-step--1) font-mono font-medium border uppercase tracking-wider',
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
