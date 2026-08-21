/**
 * El ejecutor: la única puerta entre lo que el modelo quiere y lo que el sistema hace
 * (Spec 28 · D1).
 *
 * Determinista. Recibe un plan ya parseado y decide qué pasa. El LLM no toca Firestore
 * jamás: llega hasta aquí y aquí se le dice que sí o que no.
 *
 * Hay **dos** barreras para agendar, y es a propósito:
 *   1. `validarPlanAgendar` — barata, en memoria, y da un motivo legible para el registro.
 *   2. `crearCitaAction` — la autoridad final, con su transacción atómica de slots.
 * La primera no sustituye a la segunda: entre validar y escribir puede entrar otra clienta
 * por la web. La segunda es la que decide de verdad.
 */

import { crearCitaAction } from '@/actions/citas'
import { getServices, getProfessionals, getAppointmentsEnRango } from '@/lib/db'
import { startOfDay } from '@/lib/disponibilidad'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import { ejecutarHerramienta } from './herramientas'
import { validarPlanAgendar } from './validar'
import type { ContextoAgente, PlanDelAgente, ResultadoAgente } from './tipos'

const FMT_HORA = new Intl.DateTimeFormat('es-CO', {
  timeZone: REGLAS_NEGOCIO.zonaHoraria,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

/** Lo que se le dice a la clienta cuando algo se rompe. Nunca se le muestra un error técnico. */
const DISCULPA =
  'Uy, se me enredó el sistema con eso. Ya le aviso a una compañera para que te escriba, ¿va?'

export type ResultadoEjecucion =
  | { tipo: 'respuesta'; resultado: ResultadoAgente }
  /** El plan pedía datos: se devuelven para volver a preguntarle al modelo con ellos. */
  | { tipo: 'datos'; herramienta: string; datos: string }

export async function ejecutarPlan(
  plan: PlanDelAgente,
  ctx: ContextoAgente
): Promise<ResultadoEjecucion> {
  switch (plan.intencion) {
    case 'responder':
      return { tipo: 'respuesta', resultado: { texto: plan.texto, escalado: false } }

    case 'escalar':
      return {
        tipo: 'respuesta',
        resultado: {
          texto:
            'Déjame pasarte con una compañera del estudio para que te ayude bien con eso. Te escribe en un momentico.',
          escalado: true,
        },
      }

    case 'consultar': {
      const datos = await ejecutarHerramienta(plan.herramienta, plan.args)
      return { tipo: 'datos', herramienta: plan.herramienta, datos }
    }

    case 'agendar': {
      const [services, professionals] = await Promise.all([getServices(), getProfessionals()])

      const inicio = new Date(plan.inicioUtc)
      if (Number.isNaN(inicio.getTime())) {
        return {
          tipo: 'datos',
          herramienta: 'agendar',
          datos: `No agendé: "${plan.inicioUtc}" no es una fecha válida. Vuelve a consultar las franjas y copia el inicioUtc exacto.`,
        }
      }

      const diaInicio = startOfDay(inicio)
      const diaFin = new Date(diaInicio.getTime() + 24 * 3600 * 1000)
      const citasDelDia = await getAppointmentsEnRango(
        diaInicio.toISOString(),
        diaFin.toISOString(),
        plan.professionalId
      )

      // Barrera 1: barata y con motivo legible.
      const val = validarPlanAgendar(plan, services, professionals, citasDelDia)
      if (!val.valido) {
        console.warn('[AGENTE] plan de agendar rechazado:', val.motivo, '·', val.detalle)
        return {
          tipo: 'datos',
          herramienta: 'agendar',
          datos: `No agendé (${val.motivo}: ${val.detalle}). Consulta las franjas otra vez y ofrécele a la clienta una que sí exista.`,
        }
      }

      // Barrera 2: la que manda.
      const res = await crearCitaAction({
        clientId: ctx.clientId,
        clienteNombre: plan.nombre || ctx.nombre,
        clienteTelefono: ctx.telefonoE164,
        professionalId: plan.professionalId,
        serviceId: plan.serviceId,
        inicioUtc: plan.inicioUtc,
        origen: 'whatsapp',
        creadaPor: 'agente-whatsapp',
      })

      if (!res.ok) {
        if (res.error === 'cupo_ocupado') {
          return {
            tipo: 'datos',
            herramienta: 'agendar',
            datos:
              'No agendé: alguien tomó esa hora justo antes. Discúlpate con la clienta y ofrécele otra de las franjas libres.',
          }
        }
        console.error('[AGENTE] crearCitaAction falló:', res.error)
        return {
          tipo: 'respuesta',
          resultado: { texto: DISCULPA, escalado: true },
        }
      }

      const cita = res.data
      const svc = services.find((s) => s.id === cita.serviceId)
      const prof = professionals.find((p) => p.id === cita.professionalId)
      const cuandoTexto = FMT_HORA.format(new Date(cita.inicioUtc))

      // `crearCitaAction` ya dispara la plantilla de confirmación por su cuenta, así que aquí
      // solo se cierra la conversación. Si se repitiera el detalle, la clienta recibiría dos
      // mensajes casi iguales.
      const aviso =
        cita.estado === 'pendiente'
          ? ' Queda pendiente de confirmación por el valor; una compañera te escribe para cerrarla.'
          : ''

      return {
        tipo: 'respuesta',
        resultado: {
          texto: `¡Listo, ${plan.nombre || ctx.nombre}! Te agendé ${svc?.nombre ?? 'tu cita'} con ${prof?.nombre ?? 'nosotras'} el ${cuandoTexto}.${aviso} Te llega la confirmación por aquí mismo.`,
          escalado: cita.estado === 'pendiente',
          citaCreadaId: cita.id,
        },
      }
    }
  }
}
