'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'

/**
 * Estado vacío.
 *
 * Un vacío bien resuelto es lo que separa una demo de un producto: nunca se
 * deja una zona en blanco sin explicar por qué está vacía y qué hacer ahora.
 */
export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring.gentle}
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-lg)]',
        'border border-dashed border-malva-200 bg-[var(--glass-tint)] text-center backdrop-blur-sm',
        compact ? 'gap-2 p-[var(--spacing-fib-3)]' : 'gap-3 p-[var(--spacing-fib-4)]',
        className
      )}
    >
      <div
        className={cn(
          'grid place-items-center rounded-full bg-malva-100 text-malva-600',
          compact ? 'h-10 w-10' : 'h-14 w-14'
        )}
      >
        <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} strokeWidth={1.5} />
      </div>

      <div className="space-y-1">
        <h4
          className={cn(
            'font-display font-semibold text-ink-900',
            compact ? 'text-[15px]' : 'text-lg'
          )}
        >
          {title}
        </h4>
        {description && (
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-ink-500">
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-1">{action}</div>}
    </motion.div>
  )
}
