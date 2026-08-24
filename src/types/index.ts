export type BusinessSettings = {
  nombre: string
  horario: {
    dias: number[] // [1, 2, 3, 4, 5, 6] (1=Lunes, 7=Domingo)
    horaApertura: string // "09:00"
    horaCierre: string // "19:00"
  }
  almuerzo: {
    inicio: string // "13:00"
    fin: string // "14:00"
  }
  zonaHoraria: string // "America/Bogota"
  politicas: {
    minAntelacionMin: number
    maxAntelacionDias: number
    cancelacionNoShowHoras: number
    recordatorioHoras: number
    umbralConfirmacionCentavos: number
  }
}

export type Category = {
  id: string
  nombre: string
  orden: number
  activa: boolean
}

export type Service = {
  id: string
  categoryId: string
  nombre: string
  duracionMin: number
  bufferMin: number
  precioCentavos: number
  requiereConfirmacion: boolean
  activo: boolean
  imagenUrl?: string
}

export type ProfessionalSchedule = Record<number, [number, number]> // 1=Lunes, 7=Domingo -> [horaInicio, horaFin]

export type Exception = {
  fecha: string // YYYY-MM-DD
  tipo: 'libre' | 'bloqueo' | 'horario_especial'
  horario?: [number, number]
}

export type Professional = {
  id: string
  nombre: string
  cargo: string
  serviceIds: string[]
  horario: ProfessionalSchedule
  excepciones: Exception[]
  activo: boolean
}

export type Client = {
  id: string
  nombre: string
  telefonoE164: string
  email?: string
  notas?: string
  creadaEn: string // ISO UTC
  telefonosAlternativos?: string[]
  fusionadaEn?: string
  ultimaVisitaUtc?: string
  _seed?: boolean
}

export type AppointmentState = 'agendada' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio' | 'pendiente'

export type AppointmentHistoryItem = {
  estado: AppointmentState
  fechaUtc: string
  nota?: string
  cambiadoPor?: string
}

export type Appointment = {
  id: string
  clientId: string
  professionalId: string
  serviceId: string
  inicioUtc: string // UTC ISO string
  finUtc: string // UTC ISO string
  duracionTotalMin: number // Congelado al agendar
  estado: AppointmentState
  origen: 'web' | 'admin' | 'whatsapp'
  precioCentavos: number // Congelado al agendarse
  creadaPor: string
  googleEventId?: string | null
  historial: AppointmentHistoryItem[]
  _seed?: boolean
}

export type Slot = {
  id: string // `${professionalId}_${inicioUtcISO}`
  appointmentId: string
  professionalId: string
  inicioUtc: string
  creadoEn: string
}

export type ConversationState = 'abierta' | 'en_atencion' | 'resuelta' | 'escalada'

export type Conversation = {
  id: string
  canal: 'whatsapp' | 'web'
  clienteRef?: string
  estado: ConversationState
  escaladaA?: string
  actualizadaEn: string
}

export type MessageRole = 'cliente' | 'agente' | 'humano' | 'sistema'

export type Message = {
  id: string
  rol: MessageRole
  texto: string
  herramientaUsada?: string
  enviadoEn: string
}

export type MetodoPago = 'efectivo' | 'nequi' | 'daviplata' | 'tarjeta' | 'transferencia'

export type Charge = {
  id: string                    // `chg_${appointmentId}`
  appointmentId: string
  clientId: string
  professionalId: string
  serviceId: string
  fechaUtc: string              // cuándo se cobró (ISO UTC)
  precioListaCentavos: number   // el congelado en la cita
  descuentoCentavos: number     // 0 si no hubo
  cobradoCentavos: number       // lista − descuento. Esto es el ingreso
  propinaCentavos: number       // NO es ingreso del negocio (D4)
  metodoPago: MetodoPago
  cobradoPor: string            // uid de la sesión que cerró
  nota?: string
  _seed?: boolean
}
