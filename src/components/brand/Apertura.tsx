import * as React from 'react'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import { diaSemanaEnZona, toMinutes } from '@/lib/disponibilidad'
import { cn } from '@/lib/utils'

/**
 * Estado de apertura del estudio, resuelto **en el servidor**.
 *
 * 🔴 No lo exporta `@/components/brand`, y es a propósito: `estadoApertura()`
 * lee la hora en cada render, así que un componente cliente que lo importara
 * pintaría en el navegador una hora distinta de la del HTML del servidor y
 * React rompería la hidratación. Se importa por ruta explícita desde los
 * `page.tsx` —que son componentes de servidor— y el resultado se le pasa a los
 * componentes cliente ya renderizado.
 */

/* ────────────────────────── Estado de apertura ─────────────────────────── */

/** `'09:00'` → 540. */
function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** 540 → `'9:00 AM'`. */
function aReloj(minutos: number): string {
  const h24 = Math.floor(minutos / 60)
  const m = minutos % 60
  const sufijo = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`
}

export type EstadoApertura = { abierto: boolean; texto: string }

/**
 * Si el estudio está atendiendo **en este instante**, según el reloj de Bogotá.
 *
 * Se calcula en el servidor: las tres rutas públicas son `revalidate = 0`, así
 * que llega recién resuelto en cada visita. Calcularlo en el navegador daría un
 * HTML distinto al del servidor y React se quejaría de la hidratación.
 */
export function estadoApertura(ahora: Date = new Date()): EstadoApertura {
  const { diasApertura, horaApertura, horaCierre } = REGLAS_NEGOCIO.horarioEstudio
  const abre = aMinutos(horaApertura)
  const cierra = aMinutos(horaCierre)

  const diaHoy = diaSemanaEnZona(ahora)
  const minutosAhora = toMinutes(ahora)
  const hoyAbre = (diasApertura as readonly number[]).includes(diaHoy)

  if (hoyAbre && minutosAhora >= abre && minutosAhora < cierra) {
    return { abierto: true, texto: `Abierto ahora · Hasta las ${aReloj(cierra)}` }
  }
  if (hoyAbre && minutosAhora < abre) {
    return { abierto: false, texto: `Abrimos hoy a las ${aReloj(abre)}` }
  }

  // Cerrado: el próximo día de apertura, mirando como mucho una semana adelante.
  for (let salto = 1; salto <= 7; salto++) {
    const dia = (diaHoy + salto) % 7
    if (!(diasApertura as readonly number[]).includes(dia)) continue
    const cuando = salto === 1 ? 'mañana' : 'el lunes'
    return { abierto: false, texto: `Cerrado ahora · Abrimos ${cuando} a las ${aReloj(abre)}` }
  }
  return { abierto: false, texto: 'Cerrado ahora' }
}

/**
 * Píldora de estado en vivo. El punto late solo cuando el estudio está abierto:
 * un punto verde parpadeando sobre «Cerrado» es justo la clase de detalle que
 * hace desconfiar de lo que dice el resto de la página.
 */
export function BadgeApertura({ className }: { className?: string }) {
  const { abierto, texto } = estadoApertura()

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-malva-200/80 bg-[var(--card)]/90 px-3.5 py-1.5 shadow-sm backdrop-blur-md',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {abierto && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            abierto ? 'bg-emerald-500' : 'bg-ink-300'
          )}
        />
      </span>
      <span className="text-xs font-semibold tracking-wide text-ink-700">
        {texto} · {REGLAS_NEGOCIO.sede.ciudad.split(',')[0]}
      </span>
    </div>
  )
}
