import * as React from 'react'
import { Marca } from './Marca'
import { MarcaReveal } from './MarcaReveal'
import { cn } from '@/lib/utils'

export interface MarcaLockupProps {
  /**
   * Tamaño del símbolo en píxeles.
   * @default 36
   */
  size?: number
  /**
   * Subtítulo opcional (e.g. "Estudio de belleza" o "Panel del estudio").
   */
  subtitle?: React.ReactNode
  /**
   * Si es true, usa la revelación por sesión en el símbolo (D4).
   * @default false
   */
  reveal?: boolean
  className?: string
  symbolClassName?: string
  titleClassName?: string
  subtitleClassName?: string
}

/**
 * Lockup de la marca Casa Malva: Símbolo botánico + Tipografía Fraunces viva (D6).
 *
 * El texto se compone en React con la Fraunces del proyecto, garantizando que
 * sea seleccionable, accesible y nítido sin convertir tipografía a curvas en SVG.
 */
export function MarcaLockup({
  size = 36,
  subtitle = 'Estudio de belleza',
  reveal = false,
  className,
  symbolClassName,
  titleClassName,
  subtitleClassName,
}: MarcaLockupProps) {
  const CompMarca = reveal ? MarcaReveal : Marca

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <CompMarca
        size={size}
        className={cn('text-malva-600', symbolClassName)}
      />
      <span className="leading-tight">
        <span
          className={cn(
            'block font-display font-semibold tracking-tight text-ink-900',
            size >= 40 ? 'text-[19px]' : 'text-[16px]',
            titleClassName
          )}
        >
          Casa Malva
        </span>
        {subtitle && (
          <span
            className={cn(
              'block tracking-wide text-ink-400',
              size >= 40 ? 'text-[11.5px]' : 'text-[11px]',
              subtitleClassName
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </div>
  )
}
