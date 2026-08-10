import React from 'react'

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  as?: React.ElementType
}

export function Grid({
  children,
  className = '',
  as: Component = 'div',
  ...props
}: GridProps) {
  return (
    <Component
      className={`grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-6 ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  )
}
