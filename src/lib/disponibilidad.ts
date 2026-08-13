import { REGLAS_NEGOCIO } from './reglas'
import type { Appointment, Professional, Service } from '@/types'

export type SlotInfo = {
  start: Date
  end: Date
  professionalId: string
  professionalNombre: string
}

export function startOfDay(d: Date | string): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function isSunday(d: Date): boolean {
  return d.getDay() === 0
}

/**
 * Clave `YYYY-MM-DD` de un día **en hora local**.
 *
 * No se usa `toISOString().split('T')[0]`: eso devuelve la fecha en UTC y, en
 * Colombia (UTC-5), un día local a las 00:00 cae en el día ANTERIOR en UTC.
 * Con la versión de UTC, un bloqueo puesto para el jueves se aplicaba al
 * miércoles.
 */
export function claveDia(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function inLunch(minutes: number): boolean {
  return minutes >= REGLAS_NEGOCIO.almuerzo.desde && minutes < REGLAS_NEGOCIO.almuerzo.hasta
}

export function toMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/**
 * Retorna la ventana de trabajo [horaInicio, horaFin] en horas (ej: [9, 18])
 * para la fecha dada, o null si el profesional no trabaja ese día de la semana.
 */
export function getWorkWindow(prof: Professional, date: Date): [number, number] | null {
  // getDay(): 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
  // En prof.horario: 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab, 7=Dom
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()

  // Revisar excepciones para la fecha YYYY-MM-DD (local, no UTC — ver claveDia)
  const dateStr = claveDia(date)
  const exc = prof.excepciones?.find((e) => e.fecha === dateStr)
  if (exc) {
    if (exc.tipo === 'bloqueo') return null
    if (exc.tipo === 'libre') return null
    if (exc.tipo === 'horario_especial' && exc.horario) return exc.horario
  }

  return prof.horario[dayOfWeek] || null
}

/**
 * Obtiene los bloques ocupados por citas activas de un profesional en una fecha determinada.
 */
export function getOccupiedBlocks(
  prof: Professional,
  date: Date,
  allAppointments: Appointment[],
  services: Service[],
  excludeApptId?: string
): Array<{ startMin: number; endMin: number }> {
  const dayStart = startOfDay(date)
  const dayNext = new Date(dayStart)
  dayNext.setDate(dayNext.getDate() + 1)

  const blocks: Array<{ startMin: number; endMin: number }> = []

  for (const a of allAppointments) {
    if (a.professionalId !== prof.id) continue
    if (excludeApptId && a.id === excludeApptId) continue
    if (a.estado === 'cancelada' || a.estado === 'no_asistio') continue

    const start = new Date(a.inicioUtc)
    if (start < dayStart || start >= dayNext) continue

    const svc = services.find((s) => s.id === a.serviceId)
    const durMin = (svc?.duracionMin ?? 40) + (svc?.bufferMin ?? 10)
    const startMin = toMinutes(start)

    blocks.push({
      startMin,
      endMin: startMin + durMin,
    })
  }

  return blocks
}

/**
 * Verifica si la franja propuesta [startMin, startMin + durMin] solapa con algún bloque ocupado.
 */
export function overlaps(startMin: number, durMin: number, blocks: Array<{ startMin: number; endMin: number }>): boolean {
  const endMin = startMin + durMin
  for (const b of blocks) {
    if (startMin < b.endMin && endMin > b.startMin) return true
  }
  return false
}

/**
 * Retorna los minutos de inicio de franja válidos (ej: [540, 555, 570...]) para una fecha.
 */
export function getStartMinutes(
  prof: Professional,
  svc: Service,
  date: Date,
  allAppointments: Appointment[],
  services: Service[],
  excludeApptId?: string
): number[] {
  if (!prof.activo || !svc.activo) return []
  if (!prof.serviceIds.includes(svc.id)) return []
  if (isSunday(date)) return []

  const window = getWorkWindow(prof, date)
  if (!window) return []

  const blocks = getOccupiedBlocks(prof, date, allAppointments, services, excludeApptId)
  const now = new Date()
  const minStartMs = now.getTime() + REGLAS_NEGOCIO.minAntelacionMin * 60 * 1000
  const maxStartMs = now.getTime() + REGLAS_NEGOCIO.maxAntelacionDias * 24 * 3600 * 1000

  const [startH, endH] = window
  const start0 = startH * 60
  const end0 = endH * 60
  const totalDur = svc.duracionMin + svc.bufferMin

  const validMinutes: number[] = []

  for (let m = start0; m + totalDur <= end0; m += REGLAS_NEGOCIO.pasoMin) {
    // Almuerzo: el servicio no puede comenzar durante el almuerzo
    if (inLunch(m)) continue
    // Tampoco puede terminar dentro de o cruzar el almuerzo
    if (m < REGLAS_NEGOCIO.almuerzo.hasta && m + totalDur > REGLAS_NEGOCIO.almuerzo.desde) continue

    const slotDate = new Date(date)
    slotDate.setHours(Math.floor(m / 60), m % 60, 0, 0)

    if (slotDate.getTime() < minStartMs) continue
    if (slotDate.getTime() > maxStartMs) continue

    if (overlaps(m, totalDur, blocks)) continue

    validMinutes.push(m)
  }

  return validMinutes
}

/**
 * Retorna las franjas disponibles como objetos Date.
 */
export function franjasDisponibles(
  serviceId: string,
  professionalId: string,
  fecha: Date | string,
  allAppointments: Appointment[],
  services: Service[],
  professionals: Professional[]
): Date[] {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha
  const svc = services.find((s) => s.id === serviceId)
  const prof = professionals.find((p) => p.id === professionalId)

  if (!svc || !prof) return []

  const minutes = getStartMinutes(prof, svc, date, allAppointments, services)
  return minutes.map((m) => {
    const d = new Date(date)
    d.setHours(Math.floor(m / 60), m % 60, 0, 0)
    return d
  })
}

/**
 * Indica si un día específico tiene cupos para ese servicio y profesional.
 */
export function diaTieneCupos(
  serviceId: string,
  professionalId: string,
  fecha: Date | string,
  allAppointments: Appointment[],
  services: Service[],
  professionals: Professional[]
): boolean {
  return franjasDisponibles(serviceId, professionalId, fecha, allAppointments, services, professionals).length > 0
}

/**
 * Retorna los profesionales activos que ofrecen el servicio.
 */
export function profesionalesPara(serviceId: string, allProfessionals: Professional[]): Professional[] {
  return allProfessionals.filter((p) => p.activo && p.serviceIds.includes(serviceId))
}

/**
 * Retorna las próximas franjas disponibles para un servicio (con profesional opcional).
 */
export function proximasFranjas(
  serviceId: string,
  professionalId?: string,
  desde?: Date | string,
  dias = 14,
  limite = 6,
  allAppointments: Appointment[] = [],
  services: Service[] = [],
  professionals: Professional[] = []
): SlotInfo[] {
  const startDate = desde ? (typeof desde === 'string' ? new Date(desde) : desde) : new Date()
  const svc = services.find((s) => s.id === serviceId)
  if (!svc || !svc.activo) return []

  const targetProfs = professionalId
    ? professionals.filter((p) => p.id === professionalId && p.activo)
    : profesionalesPara(serviceId, professionals)

  const slots: SlotInfo[] = []

  for (let d = 0; d < dias && slots.length < limite; d++) {
    const currDate = new Date(startDate)
    currDate.setDate(currDate.getDate() + d)
    if (isSunday(currDate)) continue

    for (const prof of targetProfs) {
      const minutes = getStartMinutes(prof, svc, currDate, allAppointments, services)
      for (const m of minutes) {
        const start = new Date(currDate)
        start.setHours(Math.floor(m / 60), m % 60, 0, 0)
        const end = new Date(start.getTime() + svc.duracionMin * 60 * 1000)

        slots.push({
          start,
          end,
          professionalId: prof.id,
          professionalNombre: prof.nombre,
        })

        if (slots.length >= limite) break
      }
      if (slots.length >= limite) break
    }
  }

  return slots
}

/**
 * Valida si una propuesta de reserva cumple todas las reglas de negocio.
 */
export function validarReserva(
  req: {
    serviceId: string
    professionalId: string
    inicioUtc: Date | string
  },
  allAppointments: Appointment[],
  services: Service[],
  professionals: Professional[],
  excludeApptId?: string
): { ok: boolean; error?: string } {
  const svc = services.find((s) => s.id === req.serviceId)
  const prof = professionals.find((p) => p.id === req.professionalId)

  if (!svc || !prof) return { ok: false, error: 'Servicio o profesional no encontrado.' }
  if (!svc.activo) return { ok: false, error: 'El servicio no se encuentra activo.' }
  if (!prof.activo) return { ok: false, error: 'La profesional no se encuentra activa.' }
  if (!prof.serviceIds.includes(svc.id)) return { ok: false, error: 'La profesional no realiza este servicio.' }

  const inicio = typeof req.inicioUtc === 'string' ? new Date(req.inicioUtc) : req.inicioUtc
  if (isSunday(inicio)) return { ok: false, error: 'Los domingos el estudio se encuentra cerrado.' }

  const minStartMs = Date.now() + REGLAS_NEGOCIO.minAntelacionMin * 60 * 1000
  if (inicio.getTime() < minStartMs) {
    return { ok: false, error: 'La reserva requiere mínimo 2 horas de antelación.' }
  }

  const maxStartMs = Date.now() + REGLAS_NEGOCIO.maxAntelacionDias * 24 * 3600 * 1000
  if (inicio.getTime() > maxStartMs) {
    return { ok: false, error: 'La reserva no puede superar los 60 días de antelación.' }
  }

  const startMin = toMinutes(inicio)
  if (inLunch(startMin)) {
    return { ok: false, error: 'No se permite agendar en horario de almuerzo (13:00–14:00).' }
  }

  const totalDur = svc.duracionMin + svc.bufferMin
  if (startMin < REGLAS_NEGOCIO.almuerzo.hasta && startMin + totalDur > REGLAS_NEGOCIO.almuerzo.desde) {
    return { ok: false, error: 'La cita solapa con el horario de almuerzo.' }
  }

  const window = getWorkWindow(prof, inicio)
  if (!window) return { ok: false, error: 'La profesional no atiende en esa fecha.' }

  const [startH, endH] = window
  if (startMin < startH * 60 || startMin + totalDur > endH * 60) {
    return { ok: false, error: 'La cita está fuera del horario laboral de la profesional.' }
  }

  const blocks = getOccupiedBlocks(prof, inicio, allAppointments, services, excludeApptId)
  if (overlaps(startMin, totalDur, blocks)) {
    return { ok: false, error: 'cupo_ocupado' }
  }

  return { ok: true }
}
