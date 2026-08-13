import { cn } from '@/lib/utils'

/**
 * Esqueleto de carga.
 *
 * Se usa en lugar de un texto "Cargando…": el hueco tiene la forma de lo que
 * va a llegar, así que la página no salta cuando llegan los datos.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('skeleton rounded-[var(--radius-sm)]', className)}
    />
  )
}

/** Rejilla de tarjetas fantasma, del tamaño real de las tarjetas de servicio. */
export function SkeletonGrid({
  count = 6,
  className,
  itemClassName,
}: {
  count?: number
  className?: string
  itemClassName?: string
}) {
  return (
    <div
      className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}
      role="status"
      aria-label="Cargando contenido"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-32 rounded-[var(--radius-lg)]', itemClassName)}
        />
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
