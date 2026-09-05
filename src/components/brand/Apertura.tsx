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

  // Formato editorial que comunica apertura física sin dar sensación de servicio cerrado
  const textoEstudio = abierto
    ? texto.replace('Abierto ahora · ', 'Estudio abierto · ')
    : texto
        .replace('Cerrado ahora · Abrimos ', 'Atención presencial ')
        .replace('Abrimos hoy ', 'Atención presencial hoy ')

  return (
    <div
      className={cn(
        'group inline-flex flex-wrap items-center gap-2.5 rounded-full border border-malva-200/90 dark:border-[#c5a059]/35 bg-white/95 dark:bg-[#1c151b]/95 px-4 py-2 shadow-[0_4px_20px_rgba(61,37,55,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:border-[#c5a059]/60 hover:shadow-[0_6px_24px_rgba(197,160,89,0.18)]',
        className
      )}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {abierto ? (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          </>
        ) : (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c5a059] opacity-40 duration-1000" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#c5a059] shadow-[0_0_6px_rgba(197,160,89,0.6)]" />
          </>
        )}
      </span>

      <span className="text-xs font-medium tracking-tight text-ink-900 dark:text-[#f5edf2]">
        {textoEstudio}
      </span>

      <span className="text-[#c5a059]/80 dark:text-[#c5a059] text-xs" aria-hidden>
        ·
      </span>

      <span className="text-xs font-semibold text-malva-700 dark:text-[#f3d99e]">
        Agenda online 24/7
      </span>

      <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-ink-500 dark:text-ink-400 border-l border-malva-200/80 dark:border-ink-800 pl-2">
        <span>El Poblado</span>
      </span>
    </div>
  )
}
