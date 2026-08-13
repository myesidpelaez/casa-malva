'use client'

import * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'

/**
 * `Surface` es el contenedor de todo. Reemplaza a `Card`.
 *
 * Cuatro materiales, en orden de "peso" visual:
 *   - `glass`  — vidrio estándar. El caso por defecto.
 *   - `solid`  — blanco opaco. Para listas densas donde el vidrio cansa la vista.
 *   - `frost`  — vidrio muy tintado. Para paneles que deben destacar sobre otros.
 *   - `deep`   — vidrio oscuro. Para bloques de acento sobre fondo claro.
 *
 * Especificación: docs/specs/10-sistema-diseno.md §3
 */
const surfaceVariants = cva('relative', {
  variants: {
    material: {
      glass: 'glass glass-edge',
      frost: 'glass-strong glass-edge',
      solid: 'bg-white border border-ink-100 shadow-[var(--shadow-e1)]',
      deep: 'glass-deep glass-edge',
      plain: 'bg-transparent',
    },
    radius: {
      sm: 'rounded-[var(--radius-sm)]',
      md: 'rounded-[var(--radius-md)]',
      lg: 'rounded-[var(--radius-lg)]',
      xl: 'rounded-[var(--radius-xl)]',
    },
    pad: {
      none: '',
      sm: 'p-[var(--spacing-fib-2)]',
      md: 'p-[var(--spacing-fib-3)]',
      lg: 'p-[var(--spacing-fib-4)]',
    },
    interactive: {
      true: 'cursor-pointer transition-shadow hover:shadow-[var(--shadow-e3)]',
      false: '',
    },
  },
  defaultVariants: {
    material: 'glass',
    radius: 'lg',
    pad: 'md',
    interactive: false,
  },
})

export interface SurfaceProps
  extends Omit<HTMLMotionProps<'div'>, 'children'>,
    VariantProps<typeof surfaceVariants> {
  as?: 'div' | 'section' | 'article' | 'aside' | 'li'
  children?: React.ReactNode
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, material, radius, pad, interactive, as = 'div', ...props }, ref) => {
    const Comp = motion[as] as typeof motion.div
    return (
      <Comp
        ref={ref}
        className={cn(
          surfaceVariants({ material, radius, pad, interactive }),
          className
        )}
        whileHover={interactive ? { y: -2, scale: 1.008 } : undefined}
        whileTap={interactive ? { scale: 0.996 } : undefined}
        transition={spring.snappy}
        {...props}
      />
    )
  }
)
Surface.displayName = 'Surface'

/** Cabecera de sección: eyebrow + título display + bajada. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div
      className={cn(
        'space-y-2',
        align === 'center' && 'text-center flex flex-col items-center',
        className
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-malva-100/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-malva-700 backdrop-blur-sm">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-[26px] leading-[1.15] font-semibold text-ink-900 sm:text-[34px]">
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-xl text-sm leading-relaxed text-ink-500">{subtitle}</p>
      )}
    </div>
  )
}

export { surfaceVariants }
