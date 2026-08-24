'use server'

import { docGet, getAppointmentsDeCliente, getClientsRecientes, getClientByPhone, getDb, transaccion, docSet } from '@/lib/db'
import { withAuth } from '@/lib/withAuth'
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
    if (idSuperviviente === idAbsorbida) {
      return { ok: false, error: 'Misma ficha' }
    }

    const superviviente = await docGet<Client>('clients', idSuperviviente)
    const absorbida = await docGet<Client>('clients', idAbsorbida)

    if (!superviviente || !absorbida) {
      return { ok: false, error: 'Ficha no encontrada' }
    }

    if (superviviente.fusionadaEn || absorbida.fusionadaEn) {
      return { ok: false, error: 'Ficha ya fusionada' }
    }

    const db = getDb()
    
    const appointmentsSnap = await db.collection('appointments').where('clientId', '==', idAbsorbida).get()
    const chargesSnap = await db.collection('charges').where('clientId', '==', idAbsorbida).get()

    const totalDocs = appointmentsSnap.size + chargesSnap.size
    if (totalDocs > 200) {
      return { ok: false, error: 'demasiados_documentos' }
    }

    await transaccion(async (tx) => {
      // Reapuntar appointments
      for (const doc of appointmentsSnap.docs) {
        tx.update(doc.ref, { clientId: idSuperviviente })
      }
      
      // Reapuntar charges
      for (const doc of chargesSnap.docs) {
        tx.update(doc.ref, { clientId: idSuperviviente })
      }

      const telefonos = new Set(superviviente.telefonosAlternativos || [])
      if (absorbida.telefonoE164 !== superviviente.telefonoE164) {
        telefonos.add(absorbida.telefonoE164)
      }
      if (absorbida.telefonosAlternativos) {
        for (const t of absorbida.telefonosAlternativos) {
          if (t !== superviviente.telefonoE164) telefonos.add(t)
        }
      }

      tx.update(db.doc(`clients/${idSuperviviente}`), {
        telefonosAlternativos: Array.from(telefonos)
      })

      tx.update(db.doc(`clients/${idAbsorbida}`), {
        fusionadaEn: idSuperviviente
      })
    })

    return { ok: true, data: { ok: true } }
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
