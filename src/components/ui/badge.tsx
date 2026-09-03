'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { AppointmentState } from '@/types'

/**
 * Distintivos y píldoras de estado.
 *
 * Regla: el estado de una cita se ve SIEMPRE igual, en la agenda, en la ficha
 * de la clienta y en la confirmación pública. Un mismo hecho, un mismo color
 * ([[04-BIBLIOTECA/patrones/trazabilidad-mejoria]]).
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 font-semibold whitespace-nowrap transition-colors',
  {
    variants: {
      tone: {
        neutral: 'bg-ink-100 text-ink-700',
        malva: 'bg-malva-100 text-malva-700',
        success: 'bg-success-soft text-success border border-success/20',
        warning: 'bg-warning-soft text-warning border border-warning/20',
        danger: 'bg-danger-soft text-danger border border-danger/20',
        info: 'bg-info-soft text-info border border-info/20',
        glass: 'glass text-ink-700',
      },
      size: {
        sm: 'px-2 py-0.5 text-2xs rounded-md',
        md: 'px-2.5 py-1 text-xs rounded-lg',
        lg: 'px-3.5 py-1.5 text-sm rounded-full',
      },
      uppercase: { true: 'uppercase tracking-[0.08em]', false: '' },
    },
    defaultVariants: { tone: 'neutral', size: 'md', uppercase: false },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, uppercase, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size, uppercase }), className)} {...props} />
  )
}

/* -------------------------------------------------------------------------
   Mapa único estado de cita → color y etiqueta legible.
   ---------------------------------------------------------------------- */
type StateMeta = {
  label: string
  tone: NonNullable<VariantProps<typeof badgeVariants>['tone']>
  /** Color de la barra lateral de la tarjeta en la agenda. */
  accent: string
  /** Fondo de la tarjeta en la agenda. */
  surface: string
}

export const APPOINTMENT_STATE: Record<AppointmentState, StateMeta> = {
  pendiente: {
    label: 'Por confirmar',
    tone: 'warning',
    accent: 'bg-warning',
    surface: 'bg-warning-soft/30',
  },
  agendada: {
    label: 'Agendada',
    tone: 'info',
    accent: 'bg-info',
    surface: 'bg-info-soft/25',
  },
  confirmada: {
    label: 'Confirmada',
    tone: 'success',
    accent: 'bg-success',
    surface: 'bg-success-soft/30',
  },
  completada: {
    label: 'Completada',
    tone: 'neutral',
    accent: 'bg-ink-300',
    surface: 'bg-ink-100/30',
  },
  cancelada: {
    label: 'Cancelada',
    tone: 'danger',
    accent: 'bg-danger',
    surface: 'bg-danger-soft/25',
  },
  no_asistio: {
    label: 'No asistió',
    tone: 'danger',
    accent: 'bg-danger',
    surface: 'bg-danger-soft/20',
  },
}

export function StatusPill({
  estado,
  size = 'sm',
}: {
  estado: AppointmentState
  size?: 'sm' | 'md' | 'lg'
}) {
  const meta = APPOINTMENT_STATE[estado] ?? APPOINTMENT_STATE.agendada
  return (
    <Badge tone={meta.tone} size={size} uppercase>
      {meta.label}
    </Badge>
  )
}

/** Punto latiendo. Señal de "esto está vivo" en la cabecera del panel. */
export function LivePulse({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink-500">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      {label}
    </span>
  )
}

export { badgeVariants }
