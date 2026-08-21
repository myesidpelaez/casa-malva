/**
 * El turno completo de la recepcionista (Spec 28 · D6).
 *
 * Entra un mensaje de texto y sale una respuesta. **Este archivo no sabe qué es WhatsApp**:
 * el día que exista el chat web, entra por aquí sin tocar nada. El adaptador de Meta vive
 * en `src/app/api/whatsapp/webhook/route.ts`.
 */

import { armarPrompt, TURNOS_DE_MEMORIA } from './prompt'
import { ejecutarPlan } from './ejecutar'
import { modeloDeepSeek, type ModeloLLM } from './llm'
import { parsearPlan } from './validar'
import { getServices, getProfessionals } from '@/lib/db'
import type { Professional, Service } from '@/types'
import type { ContextoAgente, ResultadoAgente, TurnoConversacion } from './tipos'

/**
 * Cuántas veces se le puede volver a preguntar al modelo dentro de un mismo turno.
 * Con 3 le alcanza para "catálogo → franjas del día → agendar → responde".
 * Sin tope, un modelo terco encadena consultas hasta agotar el presupuesto.
 */
const MAX_CONSULTAS = 3

const NO_ENTIENDO_ARCHIVO =
  'Por aquí solo puedo leer texto. ¿Me cuentas por escrito qué necesitas y te ayudo?'

const ME_PERDI =
  'Perdón, me perdí con eso. Le digo a una compañera que te escriba y te resuelve enseguida.'

export type EntradaAtencion = {
  ctx: ContextoAgente
  conocida: boolean
  historial: TurnoConversacion[]
  mensaje: string
  /** Tipo original del mensaje de WhatsApp. Solo se atiende 'text'. */
  tipo: string
}

/**
 * Lo que `atender` necesita del mundo exterior, inyectable.
 *
 * No es ceremonia: sin esto, probar que el agente **falla cerrado** ante un modelo roto exigiría
 * credenciales de Firestore, y un gate que solo corre con credenciales acaba ignorándose
 * (regla 2). El arquitecto comprueba que la prueba se puede escribir **antes** de exigirla
 * (regla 8).
 */
export type DependenciasAgente = {
  modelo?: ModeloLLM
  cargarCatalogo?: () => Promise<{ services: Service[]; professionals: Professional[] }>
}

async function catalogoDeFirestore() {
  const [services, professionals] = await Promise.all([getServices(), getProfessionals()])
  return { services, professionals }
}

export async function atender(
  entrada: EntradaAtencion,
  deps: DependenciasAgente = {}
): Promise<ResultadoAgente> {
  const modelo = deps.modelo ?? modeloDeepSeek()
  const cargarCatalogo = deps.cargarCatalogo ?? catalogoDeFirestore

  // Audio, imagen, ubicación, sticker: fuera del alcance de la v1 (Spec 28 · §4).
  // Se responde con honestidad en vez de fingir que se entendió.
  if (entrada.tipo !== 'text' || entrada.mensaje.trim().length === 0) {
    return { texto: NO_ENTIENDO_ARCHIVO, escalado: true }
  }

  const { services, professionals } = await cargarCatalogo()

  // Se ACUMULAN, no se pisan: si el modelo consulta el catálogo y luego las franjas, en el
  // último paso necesita las dos cosas. Quedándose solo con la última, olvidaba el servicio
  // del que estaba hablando.
  const datosRecogidos: string[] = []
  let herramientaUsada: ResultadoAgente['herramientaUsada']

  for (let intento = 0; intento <= MAX_CONSULTAS; intento++) {
    const mensajes = armarPrompt({
      nombreClienta: entrada.ctx.nombre,
      esClientaConocida: entrada.conocida,
      services,
      professionals,
      historial: entrada.historial.slice(-TURNOS_DE_MEMORIA),
      mensaje: entrada.mensaje,
      datosDeHerramienta: datosRecogidos.length > 0 ? datosRecogidos.join('\n\n') : undefined,
      ahora: new Date(),
    })

    const respuesta = await modelo.completar(mensajes)
    if (!respuesta.ok) {
      console.error('[AGENTE] el modelo falló:', respuesta.error)
      return { texto: ME_PERDI, escalado: true }
    }

    const parseado = parsearPlan(respuesta.texto)
    if (!parseado.valido) {
      // Falla cerrado (regla 3): un plan ininteligible NO se interpreta a la buena de Dios.
      console.error('[AGENTE] plan inválido:', parseado.motivo, '·', parseado.detalle)
      return { texto: ME_PERDI, escalado: true }
    }

    const ejecucion = await ejecutarPlan(parseado.plan, entrada.ctx)

    if (ejecucion.tipo === 'respuesta') {
      return { ...ejecucion.resultado, herramientaUsada }
    }

    // Pidió datos: se los damos y se le vuelve a preguntar.
    datosRecogidos.push(`[${ejecucion.herramienta}]\n${ejecucion.datos}`)
    if (ejecucion.herramienta !== 'agendar') {
      herramientaUsada = ejecucion.herramienta as ResultadoAgente['herramientaUsada']
    }
  }

  // Agotó los intentos sin decidir nada. No se le da otra vuelta: se pasa a un humano.
  console.warn('[AGENTE] agotó las consultas sin producir respuesta')
  return { texto: ME_PERDI, escalado: true }
}
