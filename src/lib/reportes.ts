import type { Charge, Appointment, Professional, Service, MetodoPago } from '@/types'
import { claveDia, diaSemanaEnZona, toMinutes } from './disponibilidad'
import { REGLAS_NEGOCIO } from './reglas'

export type Rango = { desdeUtc: string; hastaUtc: string }

export type ResumenCaja = {
  servicios: number
  ingresoCentavos: number
  descuentoCentavos: number
  propinaCentavos: number
  ticketPromedioCentavos: number
  porMetodo: Record<MetodoPago, { n: number; centavos: number }>
}

export type FilaProfesional = {
  professionalId: string
  servicios: number
  ingresoCentavos: number
  ticketPromedioCentavos: number
  porcentajeDelTotal: number
  minutosVendidos: number
  minutosDisponibles: number
  ocupacionPorcentaje: number
}

export type FilaServicio = {
  serviceId: string
  veces: number
  ingresoCentavos: number
  minutosOcupados: number
  ingresoPorHoraCentavos: number
}

export type CeldaFranja = { diaSemana: number; hora: number; servicios: number }

export type ResumenOrigen = Record<'web' | 'admin' | 'whatsapp', number>

export function resumenCaja(cobros: Charge[]): ResumenCaja {
  let servicios = 0
  let ingresoCentavos = 0
  let descuentoCentavos = 0
  let propinaCentavos = 0
  const porMetodo: Record<MetodoPago, { n: number; centavos: number }> = {
    efectivo: { n: 0, centavos: 0 },
    nequi: { n: 0, centavos: 0 },
    daviplata: { n: 0, centavos: 0 },
    tarjeta: { n: 0, centavos: 0 },
    transferencia: { n: 0, centavos: 0 },
  }

  for (const cobro of cobros) {
    servicios++
    ingresoCentavos += cobro.cobradoCentavos
    descuentoCentavos += cobro.descuentoCentavos
    propinaCentavos += cobro.propinaCentavos
    if (porMetodo[cobro.metodoPago]) {
      porMetodo[cobro.metodoPago].n++
      porMetodo[cobro.metodoPago].centavos += cobro.cobradoCentavos
    }
  }

  const ticketPromedioCentavos = servicios > 0 ? Math.round(ingresoCentavos / servicios) : 0

  return {
    servicios,
    ingresoCentavos,
    descuentoCentavos,
    propinaCentavos,
    ticketPromedioCentavos,
    porMetodo
  }
}

export function minutosDisponibles(prof: Professional, rango: Rango): number {
  const desde = new Date(rango.desdeUtc)
  const hasta = new Date(rango.hastaUtc)
  let disponibles = 0

  const msPorDia = 24 * 3600 * 1000
  let currentMs = desde.getTime()

  const almuerzoDesde = REGLAS_NEGOCIO.almuerzo.desde
  const almuerzoHasta = REGLAS_NEGOCIO.almuerzo.hasta
  const almuerzoDur = almuerzoHasta - almuerzoDesde

  while (currentMs < hasta.getTime()) {
    const d = new Date(currentMs)
    const currentClaveDia = claveDia(d)
    const diaZona = diaSemanaEnZona(d)
    const dayOfWeek = diaZona === 0 ? 7 : diaZona

    if (diaZona !== 0) { // No domingo
      const exc = prof.excepciones?.find(e => e.fecha === currentClaveDia)
      let sumDay = true
      let horario = prof.horario[dayOfWeek]

      if (exc) {
        if (exc.tipo === 'bloqueo' || exc.tipo === 'libre') {
          sumDay = false
        } else if (exc.tipo === 'horario_especial' && exc.horario) {
          horario = exc.horario
        }
      }

      if (sumDay && horario) {
        const [startH, endH] = horario
        const startMin = startH * 60
        const endMin = endH * 60
        let diaMin = endMin - startMin

        // Restar el almuerzo si cae dentro de la ventana de trabajo
        if (almuerzoDesde >= startMin && almuerzoHasta <= endMin) {
          diaMin -= almuerzoDur
        }

        disponibles += diaMin
      }
    }
    currentMs += msPorDia
  }
  return disponibles
}

export function rankingProfesionales(
  cobros: Charge[],
  citas: Appointment[],
  profesionales: Professional[],
  rango: Rango
): FilaProfesional[] {
  const map = new Map<string, FilaProfesional>()
  const { ingresoCentavos: ingresoTotal } = resumenCaja(cobros)

  for (const prof of profesionales) {
    map.set(prof.id, {
      professionalId: prof.id,
      servicios: 0,
      ingresoCentavos: 0,
      ticketPromedioCentavos: 0,
      porcentajeDelTotal: 0,
      minutosVendidos: 0,
      minutosDisponibles: minutosDisponibles(prof, rango),
      ocupacionPorcentaje: 0
    })
  }

  for (const cobro of cobros) {
    const p = map.get(cobro.professionalId)
    if (p) {
      p.servicios++
      p.ingresoCentavos += cobro.cobradoCentavos
    }
  }

  for (const cita of citas) {
    const p = map.get(cita.professionalId)
    if (p && cita.estado !== 'cancelada' && cita.estado !== 'no_asistio') {
      p.minutosVendidos += cita.duracionTotalMin
    }
  }

  const filas = Array.from(map.values())
  for (const f of filas) {
    if (f.servicios > 0) {
      f.ticketPromedioCentavos = Math.round(f.ingresoCentavos / f.servicios)
    }
    if (ingresoTotal > 0) {
      f.porcentajeDelTotal = Math.round((f.ingresoCentavos / ingresoTotal) * 1000) / 10
    }
    if (f.minutosDisponibles > 0) {
      f.ocupacionPorcentaje = (f.minutosVendidos / f.minutosDisponibles) * 100
    }
  }

  return filas.sort((a, b) => b.ingresoCentavos - a.ingresoCentavos)
}

export function rankingServicios(cobros: Charge[], citas: Appointment[], servicios: Service[]): FilaServicio[] {
  const map = new Map<string, FilaServicio>()

  for (const svc of servicios) {
    map.set(svc.id, {
      serviceId: svc.id,
      veces: 0,
      ingresoCentavos: 0,
      minutosOcupados: 0,
      ingresoPorHoraCentavos: 0
    })
  }

  // Acumular cobros
  for (const cobro of cobros) {
    const s = map.get(cobro.serviceId)
    if (s) {
      s.veces++
      s.ingresoCentavos += cobro.cobradoCentavos
    }
  }

  // Acumular minutos de la cita (sólo usamos citas que correspondan a cobros,
  // la forma correcta es cruzar por ID, ya que el servicio podría haber cambiado)
  const citaPorId = new Map(citas.map(c => [c.id, c]))
  for (const cobro of cobros) {
    const cita = citaPorId.get(cobro.appointmentId)
    if (cita) {
      const s = map.get(cobro.serviceId)
      if (s) {
        s.minutosOcupados += cita.duracionTotalMin
      }
    }
  }

  const filas = Array.from(map.values()).filter(f => f.veces > 0)
  for (const f of filas) {
    if (f.minutosOcupados > 0) {
      f.ingresoPorHoraCentavos = Math.round(f.ingresoCentavos / (f.minutosOcupados / 60))
    }
  }

  return filas.sort((a, b) => b.ingresoPorHoraCentavos - a.ingresoPorHoraCentavos)
}

export function mapaDeFranjas(cobros: Charge[], citas: Appointment[]): CeldaFranja[] {
  const map = new Map<string, number>()
  const citaPorId = new Map(citas.map(c => [c.id, c]))

  for (const cobro of cobros) {
    const cita = citaPorId.get(cobro.appointmentId)
    if (cita) {
      const d = new Date(cita.inicioUtc)
      const diaZona = diaSemanaEnZona(d)
      // We need hour in local timezone!
      const min = toMinutes(d)
      const hora = Math.floor(min / 60)
      
      const key = `${diaZona}-${hora}`
      map.set(key, (map.get(key) || 0) + 1)
    }
  }

  return Array.from(map.entries()).map(([key, count]) => {
    const [dia, hora] = key.split('-').map(Number)
    return { diaSemana: dia, hora, servicios: count }
  })
}

export function citasPorOrigen(citas: Appointment[]): ResumenOrigen {
  const r: ResumenOrigen = { web: 0, admin: 0, whatsapp: 0 }
  for (const cita of citas) {
    // Spec doesn't restrict to just completed appointments, but just counts origins.
    if (r[cita.origen] !== undefined) {
      r[cita.origen]++
    }
  }
  return r
}
