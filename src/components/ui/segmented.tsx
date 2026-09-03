'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { spring, tween } from '@/lib/motion'

/**
 * Control segmentado, como el de iOS: la pastilla activa se DESLIZA entre
 * opciones en vez de aparecer y desaparecer. Es `layoutId` de framer-motion,
 * y es la diferencia entre "se ve bien" y "se siente bien".
 *
 * Especificación: docs/specs/10-sistema-diseno.md §8
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  ariaLabel,
  fullWidth = false,
}: {
  options: Array<{ value: T; label: React.ReactNode; count?: number }>
  value: T
  onChange: (next: T) => void
  size?: 'sm' | 'md'
  className?: string
  ariaLabel: string
  fullWidth?: boolean
}) {
  const layoutId = React.useId()
  const h = size === 'sm' ? 'h-8 sm:h-9' : 'h-10 sm:h-11'

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'glass glass-edge inline-flex max-w-full items-center gap-1 rounded-full p-1 overflow-x-auto scrollbar-none',
        fullWidth && 'w-full flex',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative shrink-0 rounded-full px-2.5 sm:px-4 font-semibold transition-colors duration-200',
              fullWidth && 'flex-1 justify-center',
              h,
              size === 'sm' ? 'text-xs sm:text-xs' : 'text-xs sm:text-sm',
              active ? 'text-white' : 'text-ink-500 hover:text-ink-900'
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={spring.glide}
                className="absolute inset-0 rounded-full bg-malva-600 shadow-[var(--shadow-malva)]"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
              {opt.label}
              {typeof opt.count === 'number' && (
                <span
                  className={cn(
                    'tnum rounded-full px-1.5 py-px text-2xs sm:text-2xs',
                    active ? 'bg-white/22 text-white' : 'bg-ink-100 text-ink-500'
                  )}
                >
                  {opt.count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Barra de progreso por pasos del asistente de reserva.
 * Los puntos ya recorridos se pueden pulsar para volver atrás.
 */
export function Stepper({
  steps,
  current,
  onStepClick,
}: {
  steps: string[]
  current: number
  onStepClick?: (index: number) => void
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-malva-600">
          Paso {current + 1} de {steps.length}
        </p>
        <p className="text-sm font-semibold text-ink-700">{steps[current]}</p>
      </div>

      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-label={`Paso ${current + 1} de ${steps.length}: ${steps[current]}`}
      >
        {steps.map((label, i) => {
          const done = i < current
          const isCurrent = i === current
          const clickable = done && onStepClick

          return (
            <button
              key={label}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(i)}
              aria-label={`${label}${done ? ' (completado)' : ''}`}
              className={cn(
                'h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100',
                clickable ? 'cursor-pointer' : 'cursor-default'
              )}
            >
              <motion.span
                className="block h-full rounded-full bg-malva-600 origin-left"
                initial={false}
                animate={{ scaleX: done || isCurrent ? 1 : 0 }}
                transition={tween.base}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
