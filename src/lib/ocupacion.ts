import type { AppointmentState } from '@/types'

/** Estados en los que la cita RETIENE su franja. Los demás la liberan. */
export const ESTADOS_QUE_OCUPAN = ['pendiente', 'agendada', 'confirmada', 'completada'] as const

export function ocupaFranja(estado: AppointmentState): boolean {
  return (ESTADOS_QUE_OCUPAN as readonly string[]).includes(estado)
}

export type PlanDeSlots = {
  crear: string[]    // ids de slot a crear   (`${professionalId}_${inicioUtcISO}`)
  borrar: string[]   // ids de slot a borrar
}

/**
 * Calcula todas las franjas de 15 minutos que abarca un servicio (duración + buffer)
 */
export function calcularFranjasSlot(inicioUtcISO: string, duracionTotalMin: number, pasoMin = 15): string[] {
  const franjas: string[] = []
  const inicio = new Date(inicioUtcISO)
  for (let m = 0; m < duracionTotalMin; m += pasoMin) {
    const slotDate = new Date(inicio.getTime() + m * 60 * 1000)
    franjas.push(slotDate.toISOString())
  }
  return franjas
}

/**
 * Qué slots hay que crear y cuáles borrar para pasar de `antes` a `despues`.
 * `antes` es null cuando la cita se está creando.
 * Función PURA: sin Firestore, sin red, sin reloj. Por eso se puede probar de verdad.
 */
export function planificarSlots(
  antes: { professionalId: string; inicioUtc: string; estado: AppointmentState } | null,
  despues: { professionalId: string; inicioUtc: string; estado: AppointmentState },
  duracionTotalMin: number
): PlanDeSlots {
  let slotsViejos: string[] = []
  if (antes && ocupaFranja(antes.estado)) {
    slotsViejos = calcularFranjasSlot(antes.inicioUtc, duracionTotalMin)
      .map(f => `${antes.professionalId}_${f}`)
  }

  let slotsNuevos: string[] = []
  if (ocupaFranja(despues.estado)) {
    slotsNuevos = calcularFranjasSlot(despues.inicioUtc, duracionTotalMin)
      .map(f => `${despues.professionalId}_${f}`)
  }

  // Solapamiento: las franjas compartidas NO se borran ni se recrean.
  const crear = slotsNuevos.filter(s => !slotsViejos.includes(s))
  const borrar = slotsViejos.filter(s => !slotsNuevos.includes(s))

  return { crear, borrar }
}
