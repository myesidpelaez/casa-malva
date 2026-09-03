import * as React from 'react'
import { Marca } from './Marca'
import { cn } from '@/lib/utils'

export interface EsperaMarcaProps {
  /**
   * Tamaño del símbolo en píxeles.
   * @default 48
   */
  size?: number
  /**
   * Texto explicativo opcional bajo la marca.
   */
  label?: string
  /**
   * Si es true, ocupa el alto completo centrado (h-full / min-h-72).
   * @default false
   */
  fullPage?: boolean
  className?: string
}

/**
 * Estado de espera de marca con animación botánica en secuencia (D5).
 *
 * Se utiliza en cargas de página o de sección completa donde hoy no hay nada
 * que mostrar. NO sustituye a los esqueletos de rejilla (<SkeletonGrid />).
 */
export function EsperaMarca({
  size = 48,
  label,
  fullPage = false,
  className,
}: EsperaMarcaProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Cargando...'}
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-6 text-center',
        fullPage && 'min-h-[60vh] w-full',
        className
      )}
    >
      <Marca size={size} animate="espera" className="text-malva-600" />
      {label && (
        <p className="font-display text-sm font-medium tracking-tight text-ink-500 animate-pulse">
          {label}
        </p>
      )}
    </div>
  )
}
