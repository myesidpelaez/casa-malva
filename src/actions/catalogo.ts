'use server'

import { docGet, docSet, getCategories, getServices } from '@/lib/db'
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
  ['admin'],
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
 * Mutación administrativa de servicios y precios (Protegida)
 */
export const upsertServiceAction = withAuth<Service, [serviceData: Partial<Service> & { id?: string }]>(
  ['admin'],
  async (ctx, serviceData) => {
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
    return service
  }
)
