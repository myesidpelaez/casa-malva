'use server'

import { docGet, docSet, getAppointments, getClients } from '@/lib/db'
import { normalizePhoneE164 } from '@/lib/utils'
import { withAuth } from '@/lib/withAuth'
import type { Appointment, Client } from '@/types'
import type { ActionResult } from './catalogo'

/**
 * Registro / actualización de clienta por teléfono (Pública para flujo de reserva)
 */
export async function upsertClientePorTelefonoAction(
  nombre: string,
  telefonoRaw: string,
  email?: string
): Promise<ActionResult<Client>> {
  try {
    const telefonoE164 = normalizePhoneE164(telefonoRaw)
    const clients = await getClients()
    const existing = clients.find((c) => c.telefonoE164 === telefonoE164)

    if (existing) {
      const updated: Client = {
        ...existing,
        nombre: nombre || existing.nombre,
        email: email || existing.email,
      }
      await docSet('clients', existing.id, updated as unknown as Record<string, unknown>)
      return { ok: true, data: updated }
    }

    const id = `cli_${Date.now()}`
    const newClient: Client = {
      id,
      nombre: nombre || 'Clienta',
      telefonoE164,
      email: email || '',
      creadaEn: new Date().toISOString(),
    }

    await docSet('clients', id, newClient as unknown as Record<string, unknown>)
    return { ok: true, data: newClient }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al guardar información de la clienta'
    return { ok: false, error: errorMsg }
  }
}

/**
 * Listado completo de clientas del CRM (Protegida: Admin y Recepción)
 */
export const getClientsAction = withAuth<Client[], []>(
  ['admin', 'recepcion'],
  async () => {
    return await getClients()
  }
)

/**
 * Ficha detallada de clienta con historial y gasto total (Protegida: Admin y Recepción)
 */
export const getClientDetailAction = withAuth<
  {
    client: Client
    appointments: Appointment[]
    totalSpentCentavos: number
    totalAppointments: number
    noShowCount: number
  },
  [clientId: string]
>(
  ['admin', 'recepcion'],
  async (ctx, clientId) => {
    const client = await docGet<Client>('clients', clientId)
    if (!client) {
      return { ok: false, error: 'Clienta no encontrada' }
    }

    const allAppointments = await getAppointments()
    const clientAppts = allAppointments
      .filter((a) => a.clientId === clientId)
      .sort((a, b) => new Date(b.inicioUtc).getTime() - new Date(a.inicioUtc).getTime())

    const totalSpentCentavos = clientAppts
      .filter((a) => a.estado === 'completada')
      .reduce((sum, a) => sum + (a.precioCentavos || 0), 0)

    const noShowCount = clientAppts.filter((a) => a.estado === 'no_asistio').length

    return {
      client,
      appointments: clientAppts,
      totalSpentCentavos,
      totalAppointments: clientAppts.length,
      noShowCount,
    }
  }
)
