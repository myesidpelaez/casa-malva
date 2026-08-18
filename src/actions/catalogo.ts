'use server'

import { docGet, docSet, getCategories, getServices, getProfessionals } from '@/lib/db'
import { withAuth } from '@/lib/withAuth'
import type { Category, Service } from '@/types'
import type { SlotInfo } from '@/lib/disponibilidad'

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; alternativas?: SlotInfo[] }

/**
 * Consulta pública de categorías activas
 */
export async function getCategoriesAction(): Promise<ActionResult<Category[]>> {
  try {
    const cats = await getCategories()
    return { ok: true, data: cats }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al obtener categorías'
    return { ok: false, error: errorMsg }
  }
}

/**
 * Consulta pública del catálogo de servicios
 */
export async function getServicesAction(): Promise<ActionResult<Service[]>> {
  try {
    const svcs = await getServices()
    return { ok: true, data: svcs }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al obtener servicios'
    return { ok: false, error: errorMsg }
  }
}

/**
 * Mutación administrativa de categorías (Protegida)
 */
export const upsertCategoryAction = withAuth<Category, [categoryData: Partial<Category> & { id?: string }]>(
  'catalogo:editar',
  async (ctx, categoryData) => {
    const id = categoryData.id || `cat_${Date.now()}`
    const existing = categoryData.id ? await docGet<Category>('categories', categoryData.id) : null

    const category: Category = {
      id,
      nombre: categoryData.nombre || existing?.nombre || 'Nueva Categoría',
      orden: categoryData.orden ?? existing?.orden ?? 1,
      activa: categoryData.activa ?? existing?.activa ?? true,
    }

    await docSet('categories', id, category as unknown as Record<string, unknown>)
    return category
  }
)

/**
 * Mutación administrativa de servicios, precios y asignación de equipo (Protegida)
 */
export const upsertServiceAction = withAuth<
  Service,
  [
    serviceData: Partial<Service> & {
      id?: string
      assignedProfessionalIds?: string[]
    }
  ]
>('catalogo:editar', async (ctx, serviceData) => {
  const id = serviceData.id || `srv_${Date.now()}`
  const existing = serviceData.id ? await docGet<Service>('services', serviceData.id) : null

  const service: Service = {
    id,
    categoryId: serviceData.categoryId || existing?.categoryId || 'cat_unas',
    nombre: serviceData.nombre || existing?.nombre || 'Nuevo Servicio',
    duracionMin: serviceData.duracionMin ?? existing?.duracionMin ?? 40,
    bufferMin: serviceData.bufferMin ?? existing?.bufferMin ?? 10,
    precioCentavos: serviceData.precioCentavos ?? existing?.precioCentavos ?? 3000000,
    requiereConfirmacion:
      serviceData.requiereConfirmacion ??
      existing?.requiereConfirmacion ??
      (serviceData.precioCentavos ?? 0) > 20000000,
    activo: serviceData.activo ?? existing?.activo ?? true,
  }

  await docSet('services', id, service as unknown as Record<string, unknown>)

  // Si se envió lista de profesionales asignados, sincronizar bidireccionalmente
  if (Array.isArray(serviceData.assignedProfessionalIds)) {
    const allProfs = await getProfessionals()
    const targetSet = new Set(serviceData.assignedProfessionalIds)

    for (const prof of allProfs) {
      const currentServiceIds = prof.serviceIds ?? []
      const shouldHave = targetSet.has(prof.id)
      const has = currentServiceIds.includes(id)

      if (shouldHave && !has) {
        // Agregar servicio al array de la profesional
        const updatedIds = [...currentServiceIds, id]
        await docSet('professionals', prof.id, {
          ...prof,
          serviceIds: updatedIds,
        } as unknown as Record<string, unknown>)
      } else if (!shouldHave && has) {
        // Quitar servicio de la profesional
        const updatedIds = currentServiceIds.filter((sId) => sId !== id)
        await docSet('professionals', prof.id, {
          ...prof,
          serviceIds: updatedIds,
        } as unknown as Record<string, unknown>)
      }
    }
  }

  return service
})
