'use server'

import {
  docGet,
  docSet,
  getAppointmentsEnRango,
  getClientByPhone,
  getProfessionals,
  getServices,
  aplicarCambioDeCita,
} from '@/lib/db'
import { planificarSlots } from '@/lib/ocupacion'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import { withAuth } from '@/lib/withAuth'
import { puedeTocarCita } from '@/lib/permisos'
import {
  claveDia,
  franjasDisponibles,
  profesionalesPara,
  proximasFranjas,
  startOfDay,
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

/**
 * Creación de cita con Anti-Doble-Reserva atómica en Cloud Firestore (Técnica de Slots)
 */
export async function crearCitaAction(input: CrearCitaInput): Promise<ActionResult<Appointment>> {
  try {
    const services = await getServices()
    const professionals = await getProfessionals()
    const inicioDateRango = startOfDay(input.inicioUtc)
    const finDateRango = new Date(inicioDateRango.getTime() + 14 * 24 * 3600 * 1000)
    const allAppointments = await getAppointmentsEnRango(
      inicioDateRango.toISOString(),
      finDateRango.toISOString(),
      input.professionalId
    )

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
      const existingClient = await getClientByPhone(phoneE164)
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
        await docSet('clients', resolvedClientId, newClient as unknown as Record<string, unknown>)
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
      duracionTotalMin: durTotalMin,
      estado: estadoInicial,
      origen: input.origen,
      precioCentavos,
      creadaPor: input.creadaPor,
      googleEventId: null,
      historial: [
        {
          estado: estadoInicial,
          fechaUtc: new Date().toISOString(),
          nota: requiereConfirmacion ? 'Agendada (pendiente de confirmación por valor > $200k)' : 'Agendada en el sistema',
          cambiadoPor: input.creadaPor,
        },
      ],
    }

    // Reserva atómica de slots en Firestore
    const plan = planificarSlots(null, nuevaCita, nuevaCita.duracionTotalMin)
    const resReserva = await aplicarCambioDeCita(nuevaCita, plan)
    if (!resReserva.ok) {
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

    return { ok: true, data: resReserva.data }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al procesar la cita'
    return { ok: false, error: errorMsg }
  }
}

/**
 * Confirmación de cita (Protegida: Admin y Recepción)
 */
export const confirmarCitaAction = withAuth<Appointment, [citaId: string, cambiadoPor?: string]>(
  'cita:cambiar_estado',
  async (ctx, citaId, cambiadoPor = 'admin') => {
    const cita = await docGet<Appointment>('appointments', citaId)
    if (!cita || !puedeTocarCita(ctx, cita)) return { ok: false, error: 'Cita no encontrada' }

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
          cambiadoPor: ctx.nombre || cambiadoPor,
        },
      ],
    }

    const plan = planificarSlots(cita, updated, updated.duracionTotalMin)
    const res = await aplicarCambioDeCita(updated, plan)
    if (!res.ok) return { ok: false, error: res.error }
    return updated
  }
)

/**
 * Cancelación de cita administrativa y liberación de slots (Protegida: Admin y Recepción)
 */
export const cancelarCitaAction = withAuth<Appointment, [citaId: string, motivo?: string, cambiadoPor?: string]>(
  'cita:reagendar',
  async (ctx, citaId, motivo = 'Cancelada por el administrador', cambiadoPor = 'admin') => {
    const cita = await docGet<Appointment>('appointments', citaId)
    if (!cita || !puedeTocarCita(ctx, cita)) return { ok: false, error: 'Cita no encontrada' }

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
          cambiadoPor: ctx.nombre || cambiadoPor,
        },
      ],
    }

    const plan = planificarSlots(cita, updated, updated.duracionTotalMin)
    const res = await aplicarCambioDeCita(updated, plan)
    if (!res.ok) return { ok: false, error: res.error }
    return updated
  }
)

/**
 * Marca cita como completada (Protegida: Admin y Recepción)
 */
export const marcarCompletadaAction = withAuth<Appointment, [citaId: string, cambiadoPor?: string]>(
  'cita:cambiar_estado',
  async (ctx, citaId, cambiadoPor = 'admin') => {
    const cita = await docGet<Appointment>('appointments', citaId)
    if (!cita || !puedeTocarCita(ctx, cita)) return { ok: false, error: 'Cita no encontrada' }

    const updated: Appointment = {
      ...cita,
      estado: 'completada',
      historial: [
        ...(cita.historial || []),
        {
          estado: 'completada',
          fechaUtc: new Date().toISOString(),
          nota: 'Servicio realizado exitosamente',
          cambiadoPor: ctx.nombre || cambiadoPor,
        },
      ],
    }

    const plan = planificarSlots(cita, updated, updated.duracionTotalMin)
    const res = await aplicarCambioDeCita(updated, plan)
    if (!res.ok) return { ok: false, error: res.error }
    return updated
  }
)

/**
 * Marca no-asistencia (Protegida: Admin y Recepción)
 */
export const marcarNoAsistioAction = withAuth<Appointment, [citaId: string, cambiadoPor?: string]>(
  'cita:cambiar_estado',
  async (ctx, citaId, cambiadoPor = 'admin') => {
    const cita = await docGet<Appointment>('appointments', citaId)
    if (!cita || !puedeTocarCita(ctx, cita)) return { ok: false, error: 'Cita no encontrada' }

    const updated: Appointment = {
      ...cita,
      estado: 'no_asistio',
      historial: [
        ...(cita.historial || []),
        {
          estado: 'no_asistio',
          fechaUtc: new Date().toISOString(),
          nota: 'Clienta no se presentó a la cita',
          cambiadoPor: ctx.nombre || cambiadoPor,
        },
      ],
    }

    const plan = planificarSlots(cita, updated, updated.duracionTotalMin)
    const res = await aplicarCambioDeCita(updated, plan)
    if (!res.ok) return { ok: false, error: res.error }
    return updated
  }
)

/**
 * Reagendar cita en nueva fecha/hora liberando slots antiguos y reservando los nuevos (Protegida)
 */
export const reagendarCitaAction = withAuth<Appointment, [citaId: string, nuevaInicioUtc: string, cambiadoPor?: string]>(
  'cita:reagendar',
  async (ctx, citaId, nuevaInicioUtc, cambiadoPor = 'admin') => {
    const cita = await docGet<Appointment>('appointments', citaId)
    if (!cita || !puedeTocarCita(ctx, cita)) return { ok: false, error: 'Cita no encontrada' }

    if (cita.estado === 'cancelada' || cita.estado === 'completada') {
      return { ok: false, error: `No se puede reagendar una cita ${cita.estado}` }
    }

    const services = await getServices()
    const professionals = await getProfessionals()
    const inicioDateRango = startOfDay(nuevaInicioUtc)
    const finDateRango = new Date(inicioDateRango.getTime() + 14 * 24 * 3600 * 1000)
    const allAppointments = await getAppointmentsEnRango(
      inicioDateRango.toISOString(),
      finDateRango.toISOString(),
      cita.professionalId
    )

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

    const durTotalMin = cita.duracionTotalMin
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
          cambiadoPor: ctx.nombre || cambiadoPor,
        },
      ],
    }

    const plan = planificarSlots(cita, updated, updated.duracionTotalMin)
    const res = await aplicarCambioDeCita(updated, plan)
    if (!res.ok) return { ok: false, error: res.error }

    return updated
  }
)

/**
 * Consulta de citas del día o completas (Protegida: Admin y Recepción)
 */
export const getCitasAction = withAuth<Appointment[], [fechaIso?: string, dias?: number]>(
  'agenda:leer',
  async (ctx, fechaIso, dias = 1) => {
    let startIso: string
    let endIso: string
    if (fechaIso) {
      // `startOfDay` da la medianoche del reloj del estudio (Bogotá), no la del servidor:
      // es lo que hace que la franja de las 19:00 no se cuente en el día siguiente (F2).
      const dayStart = startOfDay(new Date(fechaIso))
      const dayEnd = new Date(dayStart.getTime() + Math.max(1, dias) * 24 * 3600 * 1000)
      startIso = dayStart.toISOString()
      endIso = dayEnd.toISOString()
    } else {
      const dayStart = startOfDay(new Date())
      const dayEnd = new Date(dayStart.getTime() + 60 * 24 * 3600 * 1000)
      const pastStart = new Date(dayStart.getTime() - 7 * 24 * 3600 * 1000)
      startIso = pastStart.toISOString()
      endIso = dayEnd.toISOString()
    }
    const profId = ctx.rol === 'profesional' ? ctx.professionalId : undefined
    return await getAppointmentsEnRango(startIso, endIso, profId)
  }
)

/*
 * ELIMINADA — `getCitasPorTelefonoAction` (hallazgo F4, 2026-08-14).
 *
 * Era una Server Action pública, sin sesión y sin límite de intentos, que devolvía el
 * historial completo de una clienta a cambio de un teléfono. Los móviles colombianos
 * (`3XXXXXXXXX`) son enumerables: cualquiera podía barrer el rango y leer qué servicio se
 * hizo cada persona, cuánto pagó y con quién. Ley 1581 de 2012 (Habeas Data).
 *
 * No la consumía ninguna pantalla. Si se reimplanta la consulta de citas para la clienta,
 * NO basta con `withAuth` —la clienta legítima tampoco tiene sesión—: exige un segundo
 * factor (código por WhatsApp o enlace firmado con expiración).
 */

/**
 * Franjas libres de un servicio en un día concreto (Pública para wizard)
 */
export async function franjasDelDiaAction(
  serviceId: string,
  fechaIso: string,
  professionalId?: string
): Promise<ActionResult<Array<{ inicioUtc: string; professionalId: string; professionalNombre: string }>>> {
  try {
    const services = await getServices()
    const professionals = await getProfessionals()
    const dayStart = startOfDay(new Date(fechaIso))
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000)
    const appointments = await getAppointmentsEnRango(dayStart.toISOString(), dayEnd.toISOString(), professionalId)

    const svc = services.find((s) => s.id === serviceId)
    if (!svc) return { ok: false, error: 'Servicio no encontrado' }

    const fecha = new Date(fechaIso)
    const candidatos = professionalId
      ? professionals.filter((p) => p.id === professionalId && p.activo)
      : profesionalesPara(serviceId, professionals)

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
 * Qué días de un rango tienen al menos un cupo (Pública para wizard)
 */
export async function diasConCuposAction(
  serviceId: string,
  desdeIso: string,
  dias = 14,
  professionalId?: string
): Promise<ActionResult<Record<string, number>>> {
  try {
    const services = await getServices()
    const professionals = await getProfessionals()
    const desde = new Date(desdeIso)
    const dayStart = startOfDay(desde)
    const dayEnd = new Date(dayStart.getTime() + dias * 24 * 3600 * 1000)
    const appointments = await getAppointmentsEnRango(dayStart.toISOString(), dayEnd.toISOString(), professionalId)

    const candidatos = professionalId
      ? professionals.filter((p) => p.id === professionalId && p.activo)
      : profesionalesPara(serviceId, professionals)

    const conteo: Record<string, number> = {}

    for (let i = 0; i < dias; i++) {
      // Días completos del reloj del estudio (hallazgo F2)
      const dia = new Date(startOfDay(desde).getTime() + i * 24 * 3600 * 1000)

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

/**
 * Consulta de próximas alternativas disponibles (Pública)
 */
export async function consultarDisponibilidadAction(
  serviceId: string,
  desdeIso?: string,
  professionalId?: string
): Promise<ActionResult<SlotInfo[]>> {
  try {
    const services = await getServices()
    const professionals = await getProfessionals()
    const inicioDateRango = startOfDay(desdeIso ? new Date(desdeIso) : new Date())
    const finDateRango = new Date(inicioDateRango.getTime() + 14 * 24 * 3600 * 1000)
    const appointments = await getAppointmentsEnRango(inicioDateRango.toISOString(), finDateRango.toISOString(), professionalId)

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
