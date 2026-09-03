import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * El titular de alta costura que estrenó la portada el 2026-08-23, extraído
 * para que las tres rutas públicas hablen el mismo idioma.
 *
 * Estaba escrito a mano dentro de `inicio/page.tsx`; al llevarlo a `/servicios`
 * y `/reservar` habría quedado copiado tres veces, con tres degradados
 * parecidos pero distintos. El oro del cierre vive en `--color-oro-editorial`.
 *
 * No lee la hora ni el estado del negocio: es puro, y sirve igual en un
 * componente de servidor que en uno de cliente. La píldora de «Abierto ahora»
 * vive aparte, en `./Apertura`, por ese mismo motivo.
 */

/* ─────────────────────────── Titular editorial ─────────────────────────── */

/**
 * Titular de portada: la primera parte en tinta y `resalte` cerrando en
 * degradado malva → oro. El degradado va sobre un `<span>` propio porque
 * `bg-clip-text` recorta toda la caja, y aplicado al título entero se comería
 * también la línea en tinta.
 */
export function TituloEditorial({
  children,
  resalte,
  as: Etiqueta = 'h1',
  size = 'hero',
  className,
}: {
  children: React.ReactNode
  resalte: React.ReactNode
  as?: 'h1' | 'h2'
  /** `hero` para la portada; `seccion` para cabeceras de ruta interior. */
  size?: 'hero' | 'seccion'
  className?: string
}) {
  return (
    <Etiqueta
      className={cn(
        'font-display font-semibold text-ink-900',
        size === 'hero'
          ? 'text-5xl leading-[1.03] tracking-[-0.03em] sm:text-6xl'
          : 'text-4xl leading-[1.06] tracking-[-0.02em] sm:text-5xl',
        className
      )}
    >
      {children}
      <br />
      <span className="bg-gradient-to-r from-malva-700 via-malva-600 to-[var(--color-oro-editorial)] dark:from-malva-300 dark:via-malva-200 dark:to-[#E5C158] bg-clip-text text-transparent">
        {resalte}
      </span>
    </Etiqueta>
  )
}
