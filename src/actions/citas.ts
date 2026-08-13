'use server'

import { docGet, docSet, getAppointments, getClients, getProfessionals, getServices, transaccion } from '@/lib/db'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import {
  claveDia,
  franjasDisponibles,
  profesionalesPara,
  proximasFranjas,
  validarReserva,
  type SlotInfo,
} from '@/lib/disponibilidad'
import { normalizePhoneE164 } from '@/lib/utils'
import type { Appointment, AppointmentState, Client } from '@/types'
import type { ActionResult } from './catalogo'

export type CrearCitaInput = {
  clientId?: string
  clienteNombre?: string
  clienteTelefono?: string
  clienteEmail?: string
  professionalId: string
  serviceId: string
  inicioUtc: string
  origen: 'web' | 'admin' | 'whatsapp'
  creadaPor: string
}

export async function crearCitaAction(input: CrearCitaInput): Promise<ActionResult<Appointment>> {
  try {
    return transaccion(() => {
      const services = getServices()
      const professionals = getProfessionals()
      const allAppointments = getAppointments()
      const clients = getClients()

      const svc = services.find((s) => s.id === input.serviceId)
      const prof = professionals.find((p) => p.id === input.professionalId)

      if (!svc || !prof) {
        return { ok: false, error: 'Servicio o profesional no encontrado en el sistema' }
      }

      const val = validarReserva(
        {
          serviceId: input.serviceId,
          professionalId: input.professionalId,
          inicioUtc: input.inicioUtc,
        },
        allAppointments,
        services,
        professionals
      )

      if (!val.ok) {
        if (val.error === 'cupo_ocupado') {
          const alternativas = proximasFranjas(
            input.serviceId,
            input.professionalId,
            new Date(input.inicioUtc),
            14,
            4,
            allAppointments,
            services,
            professionals
          )
          return { ok: false, error: 'cupo_ocupado', alternativas }
        }
        return { ok: false, error: val.error || 'No fue posible agendar la cita' }
      }

      let resolvedClientId = input.clientId
      if (!resolvedClientId && input.clienteTelefono) {
        const phoneE164 = normalizePhoneE164(input.clienteTelefono)
        const existingClient = clients.find((c) => c.telefonoE164 === phoneE164)
        if (existingClient) {
          resolvedClientId = existingClient.id
        } else {
          resolvedClientId = `cli_${Date.now()}`
          const newClient: Client = {
            id: resolvedClientId,
            nombre: input.clienteNombre || 'Clienta',
            telefonoE164: phoneE164,
            email: input.clienteEmail || '',
            creadaEn: new Date().toISOString(),
          }
          docSet('clients', resolvedClientId, newClient as unknown as Record<string, unknown>)
        }
      }

      if (!resolvedClientId) {
        return { ok: false, error: 'Información de la clienta requerida (teléfono o ID)' }
      }

      const precioCentavos = svc.precioCentavos
      const durTotalMin = svc.duracionMin + svc.bufferMin
      const inicioDate = new Date(input.inicioUtc)
      const finDate = new Date(inicioDate.getTime() + durTotalMin * 60 * 1000)

      const requiereConfirmacion = svc.requiereConfirmacion || precioCentavos > REGLAS_NEGOCIO.umbralConfirmacionCentavos
      const estadoInicial: AppointmentState = requiereConfirmacion ? 'pendiente' : 'agendada'

      const citaId = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      const nuevaCita: Appointment = {
        id: citaId,
        clientId: resolvedClientId,
        professionalId: input.professionalId,
        serviceId: input.serviceId,
        inicioUtc: inicioDate.toISOString(),
        finUtc: finDate.toISOString(),
        estado: estadoInicial,
        origen: input.origen,
        precioCentavos,
        creadaPor: input.creadaPor,
        historial: [
          {
            estado: estadoInicial,
            fechaUtc: new Date().toISOString(),
            nota: requiereConfirmacion ? 'Agendada (pendiente de confirmación por valor > $200k)' : 'Agendada en el sistema',
            cambiadoPor: input.creadaPor,
          },
        ],
      }

      docSet('appointments', citaId, nuevaCita as unknown as Record<string, unknown>)
      return { ok: true, data: nuevaCita }
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al procesar la cita'
    return { ok: false, error: errorMsg }
  }
}

export async function confirmarCitaAction(citaId: string, cambiadoPor = 'admin'): Promise<ActionResult<Appointment>> {
  try {
    const cita = docGet<Appointment>('appointments', citaId)
    if (!cita) return { ok: false, error: 'Cita no encontrada' }

    if (cita.estado === 'cancelada' || cita.estado === 'completada') {
      return { ok: false, error: `No se puede confirmar una cita en estado '${cita.estado}'` }
    }

    const updated: Appointment = {
      ...cita,
      estado: 'confirmada',
      historial: [
        ...(cita.historial || []),
        {
          estado: 'confirmada',
          fechaUtc: new Date().toISOString(),
          nota: 'Cita confirmada',
          cambiadoPor,
        },
      ],
    }

    docSet('appointments', citaId, updated as unknown as Record<string, unknown>)
    return { ok: true, data: updated }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al confirmar la cita'
    return { ok: false, error: errorMsg }
  }
}

export async function cancelarCitaAction(
  citaId: string,
  motivo = 'Cancelada por el usuario',
  cambiadoPor = 'usuario'
): Promise<ActionResult<Appointment>> {
  try {
    const cita = docGet<Appointment>('appointments', citaId)
    if (!cita) return { ok: false, error: 'Cita no encontrada' }

    if (cita.estado === 'completada' || cita.estado === 'cancelada') {
      return { ok: false, error: `La cita ya está ${cita.estado}` }
    }

    const inicioTime = new Date(cita.inicioUtc).getTime()
    const horasParaInicio = (inicioTime - Date.now()) / (3600 * 1000)
    const esNoShowAnticipado = horasParaInicio < REGLAS_NEGOCIO.cancelacionNoShowHoras

    const notaHistorial = esNoShowAnticipado
      ? `Cancelada con <${REGLAS_NEGOCIO.cancelacionNoShowHoras}h de anticipación (${motivo}) — registrada para no-show`
      : `Cancelada (${motivo})`

    const updated: Appointment = {
      ...cita,
      estado: 'cancelada',
      historial: [
        ...(cita.historial || []),
        {
          estado: 'cancelada',
          fechaUtc: new Date().toISOString(),
          nota: notaHistorial,
          cambiadoPor,
        },
      ],
    }

    docSet('appointments', citaId, updated as unknown as Record<string, unknown>)
    return { ok: true, data: updated }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al cancelar la cita'
    return { ok: false, error: errorMsg }
  }
}

export async function marcarCompletadaAction(citaId: string, cambiadoPor = 'admin'): Promise<ActionResult<Appointment>> {
  try {
    const cita = docGet<Appointment>('appointments', citaId)
    if (!cita) return { ok: false, error: 'Cita no encontrada' }

    const updated: Appointment = {
      ...cita,
      estado: 'completada',
      historial: [
        ...(cita.historial || []),
        {
          estado: 'completada',
          fechaUtc: new Date().toISOString(),
          nota: 'Servicio realizado exitosamente',
          cambiadoPor,
        },
      ],
    }

    docSet('appointments', citaId, updated as unknown as Record<string, unknown>)
    return { ok: true, data: updated }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al marcar completada'
    return { ok: false, error: errorMsg }
  }
}

export async function marcarNoAsistioAction(citaId: string, cambiadoPor = 'admin'): Promise<ActionResult<Appointment>> {
  try {
    const cita = docGet<Appointment>('appointments', citaId)
    if (!cita) return { ok: false, error: 'Cita no encontrada' }

    const updated: Appointment = {
      ...cita,
      estado: 'no_asistio',
      historial: [
        ...(cita.historial || []),
        {
          estado: 'no_asistio',
          fechaUtc: new Date().toISOString(),
          nota: 'Clienta no se presentó a la cita',
          cambiadoPor,
        },
      ],
    }

    docSet('appointments', citaId, updated as unknown as Record<string, unknown>)
    return { ok: true, data: updated }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al marcar no asistió'
    return { ok: false, error: errorMsg }
  }
}

export async function reagendarCitaAction(
  citaId: string,
  nuevaInicioUtc: string,
  cambiadoPor = 'admin'
): Promise<ActionResult<Appointment>> {
  try {
    return transaccion(() => {
      const cita = docGet<Appointment>('appointments', citaId)
      if (!cita) return { ok: false, error: 'Cita no encontrada' }

      if (cita.estado === 'cancelada' || cita.estado === 'completada') {
        return { ok: false, error: `No se puede reagendar una cita ${cita.estado}` }
      }

      const services = getServices()
      const professionals = getProfessionals()
      const allAppointments = getAppointments()

      const svc = services.find((s) => s.id === cita.serviceId)
      if (!svc) return { ok: false, error: 'Servicio de la cita no encontrado' }

      const val = validarReserva(
        {
          serviceId: cita.serviceId,
          professionalId: cita.professionalId,
          inicioUtc: nuevaInicioUtc,
        },
        allAppointments,
        services,
        professionals,
        citaId
      )

      if (!val.ok) {
        if (val.error === 'cupo_ocupado') {
          const alternativas = proximasFranjas(
            cita.serviceId,
            cita.professionalId,
            new Date(nuevaInicioUtc),
            14,
            4,
            allAppointments,
            services,
            professionals
          )
          return { ok: false, error: 'cupo_ocupado', alternativas }
        }
        return { ok: false, error: val.error || 'No es posible reagendar en esta fecha/hora' }
      }

      const durTotalMin = svc.duracionMin + svc.bufferMin
      const inicioDate = new Date(nuevaInicioUtc)
      const finDate = new Date(inicioDate.getTime() + durTotalMin * 60 * 1000)

      const updated: Appointment = {
        ...cita,
        inicioUtc: inicioDate.toISOString(),
        finUtc: finDate.toISOString(),
        historial: [
          ...(cita.historial || []),
          {
            estado: cita.estado,
            fechaUtc: new Date().toISOString(),
            nota: `Reagendada para ${inicioDate.toISOString()}`,
            cambiadoPor,
          },
        ],
      }

      docSet('appointments', citaId, updated as unknown as Record<string, unknown>)
      return { ok: true, data: updated }
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al reagendar cita'
    return { ok: false, error: errorMsg }
  }
}

export async function getCitasAction(fechaIso?: string): Promise<ActionResult<Appointment[]>> {
  try {
    const appointments = getAppointments()

    if (!fechaIso) {
      return { ok: true, data: appointments }
    }

    const dayStart = new Date(fechaIso)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const filtered = appointments.filter((a) => {
      const d = new Date(a.inicioUtc)
      return d >= dayStart && d < dayEnd
    })

    return { ok: true, data: filtered }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al obtener citas'
    return { ok: false, error: errorMsg }
  }
}

export async function getCitasPorTelefonoAction(telefonoRaw: string): Promise<ActionResult<Appointment[]>> {
  try {
    const phoneE164 = normalizePhoneE164(telefonoRaw)
    const clients = getClients()
    const client = clients.find((c) => c.telefonoE164 === phoneE164)
    if (!client) {
      return { ok: true, data: [] }
    }

    const appointments = getAppointments()
    const clientAppts = appointments
      .filter((a) => a.clientId === client.id)
      .sort((a, b) => new Date(a.inicioUtc).getTime() - new Date(b.inicioUtc).getTime())

    return { ok: true, data: clientAppts }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al buscar citas por teléfono'
    return { ok: false, error: errorMsg }
  }
}

/**
 * Franjas libres de un servicio en un día concreto.
 *
 * Existe para que la página pública NO tenga que descargarse la tabla de
 * citas. Antes se enviaba `getCitasAction()` entera al navegador para calcular
 * la disponibilidad allí: eso exponía `clientId`, teléfono y precio de todas
 * las clientas a cualquiera que abriera la pestaña de red. El cálculo vive en
 * el servidor y solo viajan las horas libres.
 *
 * Spec: docs/specs/04-disponibilidad.md
 */
export async function franjasDelDiaAction(
  serviceId: string,
  fechaIso: string,
  professionalId?: string
): Promise<ActionResult<Array<{ inicioUtc: string; professionalId: string; professionalNombre: string }>>> {
  try {
    const services = getServices()
    const professionals = getProfessionals()
    const appointments = getAppointments()

    const svc = services.find((s) => s.id === serviceId)
    if (!svc) return { ok: false, error: 'Servicio no encontrado' }

    const fecha = new Date(fechaIso)
    const candidatos = professionalId
      ? professionals.filter((p) => p.id === professionalId && p.activo)
      : profesionalesPara(serviceId, professionals)

    // Un mismo minuto puede estar libre en dos profesionales. Se muestra una
    // sola vez y se recuerda quién lo cubre, para no elegir al azar al agendar.
    const porMinuto = new Map<
      number,
      { inicioUtc: string; professionalId: string; professionalNombre: string }
    >()

    for (const prof of candidatos) {
      for (const inicio of franjasDisponibles(
        serviceId,
        prof.id,
        fecha,
        appointments,
        services,
        professionals
      )) {
        const key = inicio.getTime()
        if (!porMinuto.has(key)) {
          porMinuto.set(key, {
            inicioUtc: inicio.toISOString(),
            professionalId: prof.id,
            professionalNombre: prof.nombre,
          })
        }
      }
    }

    const franjas = [...porMinuto.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v)

    return { ok: true, data: franjas }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al consultar franjas'
    return { ok: false, error: errorMsg }
  }
}

/**
 * Qué días de un rango tienen al menos un cupo. Alimenta la tira de fechas:
 * un día sin cupos se muestra apagado ANTES de que la clienta lo pulse.
 */
export async function diasConCuposAction(
  serviceId: string,
  desdeIso: string,
  dias = 14,
  professionalId?: string
): Promise<ActionResult<Record<string, number>>> {
  try {
    const services = getServices()
    const professionals = getProfessionals()
    const appointments = getAppointments()

    const candidatos = professionalId
      ? professionals.filter((p) => p.id === professionalId && p.activo)
      : profesionalesPara(serviceId, professionals)

    const conteo: Record<string, number> = {}
    const desde = new Date(desdeIso)

    for (let i = 0; i < dias; i++) {
      const dia = new Date(desde)
      dia.setDate(dia.getDate() + i)
      dia.setHours(0, 0, 0, 0)

      const minutos = new Set<number>()
      for (const prof of candidatos) {
        for (const inicio of franjasDisponibles(
          serviceId,
          prof.id,
          dia,
          appointments,
          services,
          professionals
        )) {
          minutos.add(inicio.getTime())
        }
      }
      conteo[claveDia(dia)] = minutos.size
    }

    return { ok: true, data: conteo }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al consultar días con cupos'
    return { ok: false, error: errorMsg }
  }
}

export async function consultarDisponibilidadAction(
  serviceId: string,
  desdeIso?: string,
  professionalId?: string
): Promise<ActionResult<SlotInfo[]>> {
  try {
    const services = getServices()
    const professionals = getProfessionals()
    const appointments = getAppointments()

    const alternativas = proximasFranjas(
      serviceId,
      professionalId,
      desdeIso ? new Date(desdeIso) : new Date(),
      14,
      12,
      appointments,
      services,
      professionals
    )

    return { ok: true, data: alternativas }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al consultar disponibilidad'
    return { ok: false, error: errorMsg }
  }
}
