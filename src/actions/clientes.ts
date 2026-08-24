'use server'

import { docGet, getAppointmentsDeCliente, getClientsRecientes, getClientByPhone, docSet } from '@/lib/db'
import { withAuth } from '@/lib/withAuth'
import { fusionarClientas } from '@/lib/fusion'
import { normalizePhoneE164 } from '@/lib/utils'
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
    const clients = await getClientsRecientes(200)
    return clients.filter(c => !c.fusionadaEn)
  }
)

export const crearClientaAction = withAuth<
  { yaExistia?: boolean; clienta: Client },
  [{ nombre: string; telefono: string; email?: string; notas?: string }]
>(
  'clienta:crear',
  async (ctx, input) => {
    const telE164 = normalizePhoneE164(input.telefono)
    if (!telE164) {
      return { ok: false, error: 'Telefono invalido' }
    }

    const existe = await getClientByPhone(telE164)
    if (existe) {
      return { ok: true, data: { yaExistia: true, clienta: existe } }
    }

    const nuevaClienta: Client = {
      id: crypto.randomUUID(),
      nombre: input.nombre.trim(),
      telefonoE164: telE164,
      email: input.email?.trim() || undefined,
      notas: input.notas?.trim() || undefined,
      creadaEn: new Date().toISOString(),
    }
    
    await docSet('clients', nuevaClienta.id, nuevaClienta)
    return { ok: true, data: { clienta: nuevaClienta } }
  }
)

export const fusionarClientasAction = withAuth<
  { ok: true },
  [idSuperviviente: string, idAbsorbida: string]
>(
  'clienta:fusionar',
  async (ctx, idSuperviviente, idAbsorbida) => {
    // La fusión vive en `lib/fusion.ts` para que se pueda probar contra Firestore desde un
    // script: `withAuth` necesita `cookies()`, que solo existe dentro de una petición.
    // Aquí solo se traduce el resultado a un mensaje para la pantalla.
    const res = await fusionarClientas(idSuperviviente, idAbsorbida)
    if (res.ok) return { ok: true, data: { ok: true } }

    const mensajes = {
      misma_ficha: 'Es la misma ficha',
      ficha_no_encontrada: 'Ficha no encontrada',
      ya_fusionada: 'Una de las dos fichas ya se fusionó antes',
      demasiados_documentos: 'La ficha tiene demasiado historial para fusionarla de una vez',
    } as const
    return { ok: false, error: mensajes[res.error] }
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

    const clientAppts = await getAppointmentsDeCliente(clientId)
    clientAppts.sort((a, b) => new Date(b.inicioUtc).getTime() - new Date(a.inicioUtc).getTime())

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
