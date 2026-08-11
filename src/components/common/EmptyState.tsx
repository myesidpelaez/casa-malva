import * as React from 'react'
import { LucideIcon, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[#e2d5de] bg-[#FAF8F9]',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3EAF0] text-[#7B4B6E] mb-4">
        <Icon className="h-6 w-6 stroke-[1.5]" />
      </div>
      <h4 className="text-base font-semibold text-[#1A1618] mb-1">{title}</h4>
      {description && (
        <p className="text-sm text-[#6B6268] max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}
