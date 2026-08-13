'use server'

import { docGet, getAppointments, getClients } from '@/lib/db'
import { withAuth } from '@/lib/withAuth'
import type { Appointment, Client } from '@/types'

/*
 * ELIMINADA — `upsertClientePorTelefonoAction` (hallazgo F5, 2026-08-14).
 *
 * Era una Server Action pública que permitía sobrescribir el nombre y el email de la ficha
 * de cualquier clienta conociendo solo su teléfono.
 *
 * No la consumía ninguna pantalla y era redundante: `crearCitaAction` ya resuelve o crea la
 * ficha de la clienta dentro del flujo de reserva, que es el único momento legítimo en que
 * una persona sin sesión debe poder escribir en `clients`.
 */

/**
 * Listado completo de clientas del CRM (Protegida: Admin y Recepción)
 */
export const getClientsAction = withAuth<Client[], []>(
  'clienta:leer',
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
> (
  'clienta:leer',
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
