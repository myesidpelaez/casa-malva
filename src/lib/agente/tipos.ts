/**
 * Tipos del agente recepcionista (Spec 28).
 *
 * Regla de oro de esta carpeta (Spec 28 · D1): **el LLM nunca escribe en Firestore.**
 * Lo único que produce es un `PlanDelAgente`, que un ejecutor determinista valida
 * antes de tocar nada. Si el modelo alucina, se cae aquí y no en la agenda.
 */

/** Las herramientas de solo lectura que el agente puede pedir. */
export type NombreHerramienta = 'catalogo' | 'disponibilidad' | 'franjas_del_dia'

export type ArgsHerramienta = {
  /** Requerido por `disponibilidad` y `franjas_del_dia`. */
  serviceId?: string
  /** Día concreto en formato YYYY-MM-DD (reloj del estudio). Requerido por `franjas_del_dia`. */
  fecha?: string
}

/**
 * La única salida válida del LLM. Cualquier otra cosa se descarta y se escala.
 */
export type PlanDelAgente =
  | { intencion: 'responder'; texto: string }
  | { intencion: 'consultar'; herramienta: NombreHerramienta; args: ArgsHerramienta }
  | {
      intencion: 'agendar'
      serviceId: string
      professionalId: string
      /** Instante exacto en UTC ISO. Tiene que ser una franja que el sistema ofrezca de verdad. */
      inicioUtc: string
      nombre: string
    }
  | { intencion: 'escalar'; motivo: string }

/** Por qué se rechazó un plan. Se registra: es el diagnóstico de un agente que se porta mal. */
export type MotivoRechazo =
  | 'json_invalido'
  | 'intencion_desconocida'
  | 'campos_faltantes'
  | 'servicio_inexistente'
  | 'profesional_inexistente'
  | 'profesional_no_presta_servicio'
  | 'fecha_invalida'
  | 'franja_no_ofrecida'

export type ResultadoValidacion =
  | { valido: true; plan: PlanDelAgente }
  | { valido: false; motivo: MotivoRechazo; detalle: string }

/**
 * Lo que el ejecutor sabe de quien escribe.
 *
 * ⚠️ El `telefonoE164` **no viaja al LLM** (Spec 28 · D7): se resuelve aquí, fuera del prompt.
 */
export type ContextoAgente = {
  telefonoE164: string
  /** Nombre de pila. Es el único dato personal que sí entra al prompt. */
  nombre: string
  clientId?: string
}

export type ResultadoAgente = {
  /** Lo que se le responde a la clienta. Nunca vacío. */
  texto: string
  /** true si hay que avisar a un humano. */
  escalado: boolean
  herramientaUsada?: NombreHerramienta
  /** Id de la cita, si el turno terminó agendando. */
  citaCreadaId?: string
}

/** Un turno de la conversación, tal como se le pasa al modelo. */
export type TurnoConversacion = {
  rol: 'cliente' | 'agente'
  texto: string
}
