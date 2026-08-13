'use server'

import { docGet, docSet, getProfessionals } from '@/lib/db'
import { withAuth } from '@/lib/withAuth'
import type { Professional } from '@/types'
import type { ActionResult } from './catalogo'

/**
 * Consulta de equipo profesional (Pública para agenda / wizard de reservas)
 */
export async function getProfessionalsAction(): Promise<ActionResult<Professional[]>> {
  try {
    const profs = await getProfessionals()
    return { ok: true, data: profs }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al obtener profesionales'
    return { ok: false, error: errorMsg }
  }
}

/**
 * Actualización de datos, horarios y servicios de profesional (Protegida)
 */
export const updateProfessionalAction = withAuth<Professional, [profData: Partial<Professional> & { id: string }]>(
  ['admin'],
  async (ctx, profData) => {
    const existing = await docGet<Professional>('professionals', profData.id)
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

    await docSet('professionals', profData.id, updated as unknown as Record<string, unknown>)
    return updated
  }
)
