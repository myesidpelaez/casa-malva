import { REGLAS_NEGOCIO } from './reglas'
import { ocupaFranja } from './ocupacion'
import type { Appointment, Professional, Service } from '@/types'

export type SlotInfo = {
  start: Date
  end: Date
  professionalId: string
  professionalNombre: string
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Reloj del estudio (hallazgo F2, corregido el 2026-08-14)
 *
 * Todas estas funciones usaban `getHours()`, `getDate()` y `setHours()`, que leen
 * y escriben en la hora local **del servidor**. En el portátil de Medellín daban
 * bien; en App Hosting, que corre en **UTC**, el estudio abría a las 09:00 UTC —
 * las 04:00 de Bogotá— y todo el horario, el almuerzo y el cierre de domingo se
 * corrían cinco horas. Un fallo que solo aparecía en producción.
 *
 * Ahora el día, la hora y el día de la semana se leen siempre en
 * `REGLAS_NEGOCIO.zonaHoraria`, sin importar dónde corra el proceso.
 *
 * Colombia no aplica horario de verano desde 1993, pero el desplazamiento se
 * calcula por instante en vez de fijarse en −5 para no heredar una constante que
 * el día que cambie nadie recordará.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ZONA = REGLAS_NEGOCIO.zonaHoraria

const FMT_ZONA = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

type PartesZona = { anio: number; mes: number; dia: number; hora: number; minuto: number }

/** Descompone un instante en las partes de calendario que marca el reloj de ZONA. */
function partesEnZona(d: Date): PartesZona {
  const partes = FMT_ZONA.formatToParts(d)
  const v = (tipo: string): number => Number(partes.find((p) => p.type === tipo)?.value)
  return { anio: v('year'), mes: v('month'), dia: v('day'), hora: v('hour'), minuto: v('minute') }
}

/** Minutos que hay que sumar a UTC para obtener la hora de ZONA en ese instante. Bogotá: −300. */
function desplazamientoMin(d: Date): number {
  const p = partesEnZona(d)
  const comoSiFueraUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto)
  const instanteAlMinuto = Math.floor(d.getTime() / 60000) * 60000
  return Math.round((comoSiFueraUtc - instanteAlMinuto) / 60000)
}

/**
 * Instante exacto en que ZONA marca `minutos` desde su medianoche, el día en que
 * cae `diaRef`. Sustituye a `setHours(h, m, 0, 0)`, que escribía en hora del servidor.
 */
export function instanteEnZona(diaRef: Date, minutos: number): Date {
  const p = partesEnZona(diaRef)
  const tentativo = Date.UTC(p.anio, p.mes - 1, p.dia, 0, 0) + minutos * 60000
  return new Date(tentativo - desplazamientoMin(new Date(tentativo)) * 60000)
}

/** Día de la semana **en ZONA**: 0=Domingo … 6=Sábado. */
export function diaSemanaEnZona(d: Date): number {
  const p = partesEnZona(d)
  return new Date(Date.UTC(p.anio, p.mes - 1, p.dia)).getUTCDay()
}

/** Medianoche de ZONA del día en que cae `d`. */
export function startOfDay(d: Date | string): Date {
  return instanteEnZona(new Date(d), 0)
}

export function isSunday(d: Date): boolean {
  return diaSemanaEnZona(d) === 0
}

/**
 * Clave `YYYY-MM-DD` del día **según el reloj del estudio**.
 *
 * No se usa `toISOString().split('T')[0]`: eso devuelve la fecha en UTC y, en
 * Colombia (UTC−5), un día local a las 00:00 cae en el día ANTERIOR en UTC —
 * un bloqueo puesto para el jueves se aplicaba al miércoles. Tampoco sirve
 * `getFullYear()/getMonth()/getDate()`, que dependen de la zona del servidor.
 */
export function claveDia(d: Date): string {
  const p = partesEnZona(d)
  return `${p.anio}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`
}

export function inLunch(minutes: number): boolean {
  return minutes >= REGLAS_NEGOCIO.almuerzo.desde && minutes < REGLAS_NEGOCIO.almuerzo.hasta
}

/** Minutos transcurridos desde la medianoche de ZONA. */
export function toMinutes(d: Date): number {
  const p = partesEnZona(d)
  return p.hora * 60 + p.minuto
}

/**
 * Retorna la ventana de trabajo [horaInicio, horaFin] en horas (ej: [9, 18])
 * para la fecha dada, o null si el profesional no trabaja ese día de la semana.
 */
export function getWorkWindow(prof: Professional, date: Date): [number, number] | null {
  // diaSemanaEnZona(): 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
  // En prof.horario: 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab, 7=Dom
  const diaZona = diaSemanaEnZona(date)
  const dayOfWeek = diaZona === 0 ? 7 : diaZona

  // Revisar excepciones para la fecha YYYY-MM-DD (en el reloj del estudio — ver claveDia)
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
  const dayNext = new Date(dayStart.getTime() + 24 * 3600 * 1000)

  const blocks: Array<{ startMin: number; endMin: number }> = []

  for (const a of allAppointments) {
    if (a.professionalId !== prof.id) continue
    if (excludeApptId && a.id === excludeApptId) continue
    if (!ocupaFranja(a.estado)) continue

    const start = new Date(a.inicioUtc)
    if (start < dayStart || start >= dayNext) continue

    const durMin = a.duracionTotalMin
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

    const slotDate = instanteEnZona(date, m)

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
  return minutes.map((m) => instanteEnZona(date, m))
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
    // Avanzar por días completos del reloj del estudio, no del servidor
    const currDate = new Date(startOfDay(startDate).getTime() + d * 24 * 3600 * 1000)
    if (isSunday(currDate)) continue

    for (const prof of targetProfs) {
      const minutes = getStartMinutes(prof, svc, currDate, allAppointments, services)
      for (const m of minutes) {
        const start = instanteEnZona(currDate, m)
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
  excludeApptId?: string,
  omitirAntelacionMinima: boolean = false
): { ok: boolean; error?: string } {
  const svc = services.find((s) => s.id === req.serviceId)
  const prof = professionals.find((p) => p.id === req.professionalId)

  if (!svc || !prof) return { ok: false, error: 'Servicio o profesional no encontrado.' }
  if (!svc.activo) return { ok: false, error: 'El servicio no se encuentra activo.' }
  if (!prof.activo) return { ok: false, error: 'La profesional no se encuentra activa.' }
  if (!prof.serviceIds.includes(svc.id)) return { ok: false, error: 'La profesional no realiza este servicio.' }

  const inicio = typeof req.inicioUtc === 'string' ? new Date(req.inicioUtc) : req.inicioUtc
  if (isSunday(inicio)) return { ok: false, error: 'Los domingos el estudio se encuentra cerrado.' }

  if (!omitirAntelacionMinima) {
    const minStartMs = Date.now() + REGLAS_NEGOCIO.minAntelacionMin * 60 * 1000
    if (inicio.getTime() < minStartMs) {
      return { ok: false, error: 'La reserva requiere mínimo 2 horas de antelación.' }
    }
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
