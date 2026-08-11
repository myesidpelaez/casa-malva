'use server'

import { docGet, docSet, getAppointments, getClients } from '@/lib/db'
import { normalizePhoneE164 } from '@/lib/utils'
import type { Appointment, Client } from '@/types'
import type { ActionResult } from './catalogo'

export async function upsertClientePorTelefonoAction(
  nombre: string,
  telefonoRaw: string,
  email?: string
): Promise<ActionResult<Client>> {
  try {
    const telefonoE164 = normalizePhoneE164(telefonoRaw)
    const clients = getClients()
    const existing = clients.find((c) => c.telefonoE164 === telefonoE164)

    if (existing) {
      const updated: Client = {
        ...existing,
        nombre: nombre || existing.nombre,
        email: email || existing.email,
      }
      docSet('clients', existing.id, updated as unknown as Record<string, unknown>)
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

    docSet('clients', id, newClient as unknown as Record<string, unknown>)
    return { ok: true, data: newClient }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al guardar información de la clienta'
    return { ok: false, error: errorMsg }
  }
}

export async function getClientsAction(): Promise<ActionResult<Client[]>> {
  try {
    const clients = getClients()
    return { ok: true, data: clients }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al obtener clientas'
    return { ok: false, error: errorMsg }
  }
}

export async function getClientDetailAction(clientId: string): Promise<
  ActionResult<{
    client: Client
    appointments: Appointment[]
    totalSpentCentavos: number
    totalAppointments: number
    noShowCount: number
  }>
> {
  try {
    const client = docGet<Client>('clients', clientId)
    if (!client) {
      return { ok: false, error: 'Clienta no encontrada' }
    }

    const allAppointments = getAppointments()
    const clientAppts = allAppointments
      .filter((a) => a.clientId === clientId)
      .sort((a, b) => new Date(b.inicioUtc).getTime() - new Date(a.inicioUtc).getTime())

    const totalSpentCentavos = clientAppts
      .filter((a) => a.estado === 'completada')
      .reduce((sum, a) => sum + (a.precioCentavos || 0), 0)

    const noShowCount = clientAppts.filter((a) => a.estado === 'no_asistio').length

    return {
      ok: true,
      data: {
        client,
        appointments: clientAppts,
        totalSpentCentavos,
        totalAppointments: clientAppts.length,
        noShowCount,
      },
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al obtener detalle de la clienta'
    return { ok: false, error: errorMsg }
  }
}
