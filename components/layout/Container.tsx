import React from 'react'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: 'content' | 'wide' | 'prose' | 'full'
  children: React.ReactNode
  className?: string
  as?: React.ElementType
}

const WIDTH_MAP = {
  content: 'max-w-[1280px]',
  wide: 'max-w-[1440px]',
  prose: 'max-w-[68ch]',
  full: 'max-w-none',
}

export function Container({
  width = 'content',
  children,
  className = '',
  as: Component = 'div',
  ...props
}: ContainerProps) {
  return (
    <Component
      data-container
      // Gutter rail: 20/32/48px at mobile/md/lg (Document 4 §15.8.2). Uses the
      // arbitrary-value token pattern established elsewhere in this codebase
      // (Button.tsx, Card.tsx, JobApplyForm.tsx) — NOT bare numbered utilities
      // like `px-8`. This project's @theme redefines --spacing-N non-linearly
      // (--spacing-8: 64px, --spacing-12: 192px), so `px-8`/`px-12` silently
      // resolved to the wrong pixel values instead of the intended rail.
      className={`mx-auto w-full px-[20px] md:px-[32px] lg:px-[48px] ${WIDTH_MAP[width]} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  )
}
