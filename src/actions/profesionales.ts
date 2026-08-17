'use server'

import { docGet, docSet, getProfessionals } from '@/lib/db'
import { withAuth } from '@/lib/withAuth'
import type { Professional, ProfessionalSchedule } from '@/types'
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
 * Creación de nueva profesional (Protegida)
 */
export const createProfessionalAction = withAuth<
  Professional,
  [
    data: {
      nombre: string
      cargo: string
      serviceIds: string[]
      horario?: ProfessionalSchedule
      activo?: boolean
    }
  ]
>('equipo:editar', async (ctx, data) => {
  if (!data.nombre || data.nombre.trim().length < 2) {
    return { ok: false, error: 'El nombre es obligatorio y debe tener al menos 2 letras' }
  }

  const slug = data.nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 20)
  const id = `pro_${slug || Date.now()}_${Math.floor(Math.random() * 1000)}`

  const horario: ProfessionalSchedule =
    data.horario && Object.keys(data.horario).length > 0
      ? data.horario
      : { 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [9, 18] }

  const nueva: Professional = {
    id,
    nombre: data.nombre.trim(),
    cargo: (data.cargo || 'Especialista de belleza').trim(),
    serviceIds: data.serviceIds ?? [],
    horario,
    excepciones: [],
    activo: data.activo ?? true,
  }

  await docSet('professionals', id, nueva as unknown as Record<string, unknown>)
  return nueva
})

/**
 * Actualización de datos, horarios y servicios de profesional (Protegida)
 */
export const updateProfessionalAction = withAuth<
  Professional,
  [profData: Partial<Professional> & { id: string }]
>('equipo:editar', async (ctx, profData) => {
  const existing = await docGet<Professional>('professionals', profData.id)
  if (!existing) {
    return { ok: false, error: 'Profesional no encontrada' }
  }

  const updated: Professional = {
    ...existing,
    ...profData,
    id: profData.id,
    nombre: profData.nombre ?? existing.nombre,
    cargo: profData.cargo ?? existing.cargo,
    serviceIds: profData.serviceIds ?? existing.serviceIds,
    horario: profData.horario ?? existing.horario,
    excepciones: profData.excepciones ?? existing.excepciones ?? [],
    activo: profData.activo ?? existing.activo,
  }

  await docSet('professionals', profData.id, updated as unknown as Record<string, unknown>)
  return updated
})
