'use server'

import { docGet, docSet, getProfessionals } from '@/lib/db'
import type { Professional } from '@/types'
import type { ActionResult } from './catalogo'

export async function getProfessionalsAction(): Promise<ActionResult<Professional[]>> {
  try {
    const profs = getProfessionals()
    return { ok: true, data: profs }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al obtener profesionales'
    return { ok: false, error: errorMsg }
  }
}

export async function updateProfessionalAction(
  profData: Partial<Professional> & { id: string }
): Promise<ActionResult<Professional>> {
  try {
    const existing = docGet<Professional>('professionals', profData.id)
    if (!existing) {
      return { ok: false, error: 'Profesional no encontrada' }
    }

    const updated: Professional = {
      ...existing,
      ...profData,
      id: profData.id,
      nombre: profData.nombre ?? existing.nombre,
      rol: profData.rol ?? existing.rol,
      serviceIds: profData.serviceIds ?? existing.serviceIds,
      horario: profData.horario ?? existing.horario,
      excepciones: profData.excepciones ?? existing.excepciones ?? [],
      activo: profData.activo ?? existing.activo,
    }

    docSet('professionals', profData.id, updated as unknown as Record<string, unknown>)
    return { ok: true, data: updated }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al actualizar profesional'
    return { ok: false, error: errorMsg }
  }
}
