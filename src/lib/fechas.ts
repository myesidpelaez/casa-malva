/**
 * Formato de fechas y horas de Casa Malva.
 *
 * Una sola fuente. Antes cada pantalla llamaba a `toLocaleTimeString` con sus
 * propias opciones y el mismo instante se veía de tres maneras distintas.
 *
 * **Reloj de 24 horas.** `es-CO` por defecto devuelve `"09:00 a. m."`, que en
 * una rejilla de cupos ocupa el doble y obliga a partir el texto en dos líneas.
 * El estudio abre de 9:00 a 19:00, así que en 24 h no hay ambigüedad posible.
 *
 * Todo se guarda en UTC y se muestra en `America/Bogota` (DISENO.md §7).
 */
import { REGLAS_NEGOCIO } from './reglas'

const ZONA = REGLAS_NEGOCIO.zonaHoraria
const LOCAL = 'es-CO'

const aFecha = (v: string | Date): Date => (typeof v === 'string' ? new Date(v) : v)

/** `09:00` · `14:30` */
export function hora(v: string | Date): string {
  return aFecha(v).toLocaleTimeString(LOCAL, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: ZONA,
  })
}

/** `miércoles, 12 de agosto` */
export function fechaLarga(v: string | Date): string {
  return aFecha(v).toLocaleDateString(LOCAL, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: ZONA,
  })
}

/** `mié, 12 ago` */
export function fechaCorta(v: string | Date): string {
  return aFecha(v)
    .toLocaleDateString(LOCAL, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: ZONA,
    })
    .replace(/\./g, '')
}

/** `miércoles, 12 de agosto · 14:30` */
export function fechaHoraLarga(v: string | Date): string {
  return `${fechaLarga(v)} · ${hora(v)}`
}

/** `mié, 12 ago · 14:30` */
export function fechaHoraCorta(v: string | Date): string {
  return `${fechaCorta(v)} · ${hora(v)}`
}

/** `mié 12 ago 2026, 14:30` — para historiales, donde el año importa. */
export function fechaHoraConAnio(v: string | Date): string {
  return aFecha(v)
    .toLocaleString(LOCAL, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: ZONA,
    })
    .replace(/\./g, '')
}

/** `12/08 14:30` — compacto, para trazas de auditoría. */
export function selloCorto(v: string | Date): string {
  return aFecha(v).toLocaleString(LOCAL, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: ZONA,
  })
}
