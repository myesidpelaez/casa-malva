'use server'

import { docGet, docSet, getCategories, getServices } from '@/lib/db'
import type { Category, Service } from '@/types'
import type { SlotInfo } from '@/lib/disponibilidad'

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; alternativas?: SlotInfo[] }

export async function getCategoriesAction(): Promise<ActionResult<Category[]>> {
  try {
    const cats = getCategories()
    return { ok: true, data: cats }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al obtener categorías'
    return { ok: false, error: errorMsg }
  }
}

export async function getServicesAction(): Promise<ActionResult<Service[]>> {
  try {
    const svcs = getServices()
    return { ok: true, data: svcs }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al obtener servicios'
    return { ok: false, error: errorMsg }
  }
}

export async function upsertCategoryAction(
  categoryData: Partial<Category> & { id?: string }
): Promise<ActionResult<Category>> {
  try {
    const id = categoryData.id || `cat_${Date.now()}`
    const existing = categoryData.id ? docGet<Category>('categories', categoryData.id) : null

    const category: Category = {
      id,
      nombre: categoryData.nombre || existing?.nombre || 'Nueva Categoría',
      orden: categoryData.orden ?? existing?.orden ?? 1,
      activa: categoryData.activa ?? existing?.activa ?? true,
    }

    docSet('categories', id, category as unknown as Record<string, unknown>)
    return { ok: true, data: category }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al guardar categoría'
    return { ok: false, error: errorMsg }
  }
}

export async function upsertServiceAction(
  serviceData: Partial<Service> & { id?: string }
): Promise<ActionResult<Service>> {
  try {
    const id = serviceData.id || `srv_${Date.now()}`
    const existing = serviceData.id ? docGet<Service>('services', serviceData.id) : null

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

    docSet('services', id, service as unknown as Record<string, unknown>)
    return { ok: true, data: service }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al guardar servicio'
    return { ok: false, error: errorMsg }
  }
}
