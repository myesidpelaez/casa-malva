/**
 * El guardián determinista del agente (Spec 28 · D1).
 *
 * Todo lo de este archivo es **puro**: no toca red, ni Firestore, ni el LLM. Por eso se
 * prueba entero, gratis y sin credenciales (`npm run prueba:plan`), y por eso entra en la
 * cadena `verificar` local.
 *
 * Un plan que no pasa por aquí no llega nunca a `crearCitaAction`.
 */

import { getStartMinutes, toMinutes, startOfDay } from '@/lib/disponibilidad'
import type { Appointment, Professional, Service } from '@/types'
import type {
  ArgsHerramienta,
  NombreHerramienta,
  PlanDelAgente,
  ResultadoValidacion,
} from './tipos'

const HERRAMIENTAS: readonly NombreHerramienta[] = ['catalogo', 'disponibilidad', 'franjas_del_dia']

function esTextoNoVacio(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/**
 * Convierte la respuesta cruda del modelo en un `PlanDelAgente`, o explica por qué no se pudo.
 *
 * Falla cerrado (regla 3): ante cualquier duda **no** se inventa una intención por defecto.
 * Un JSON roto es `json_invalido`, no "responder algo genérico".
 */
export function parsearPlan(crudo: string): ResultadoValidacion {
  let obj: unknown
  try {
    obj = JSON.parse(extraerJson(crudo))
  } catch {
    return { valido: false, motivo: 'json_invalido', detalle: recortar(crudo) }
  }

  if (typeof obj !== 'object' || obj === null) {
    return { valido: false, motivo: 'json_invalido', detalle: 'la raíz no es un objeto' }
  }

  const o = obj as Record<string, unknown>

  switch (o.intencion) {
    case 'responder': {
      if (!esTextoNoVacio(o.texto)) {
        return { valido: false, motivo: 'campos_faltantes', detalle: 'responder sin texto' }
      }
      return { valido: true, plan: { intencion: 'responder', texto: o.texto.trim() } }
    }

    case 'consultar': {
      const herramienta = o.herramienta
      if (typeof herramienta !== 'string' || !HERRAMIENTAS.includes(herramienta as NombreHerramienta)) {
        return {
          valido: false,
          motivo: 'campos_faltantes',
          detalle: `herramienta desconocida: ${String(herramienta)}`,
        }
      }
      const argsCrudo = (o.args ?? {}) as Record<string, unknown>
      const args: ArgsHerramienta = {}
      if (esTextoNoVacio(argsCrudo.serviceId)) args.serviceId = argsCrudo.serviceId.trim()
      if (esTextoNoVacio(argsCrudo.fecha)) args.fecha = argsCrudo.fecha.trim()

      if (herramienta !== 'catalogo' && !args.serviceId) {
        return { valido: false, motivo: 'campos_faltantes', detalle: `${herramienta} sin serviceId` }
      }
      if (herramienta === 'franjas_del_dia' && !args.fecha) {
        return { valido: false, motivo: 'campos_faltantes', detalle: 'franjas_del_dia sin fecha' }
      }

      return {
        valido: true,
        plan: { intencion: 'consultar', herramienta: herramienta as NombreHerramienta, args },
      }
    }

    case 'agendar': {
      if (
        !esTextoNoVacio(o.serviceId) ||
        !esTextoNoVacio(o.professionalId) ||
        !esTextoNoVacio(o.inicioUtc) ||
        !esTextoNoVacio(o.nombre)
      ) {
        return {
          valido: false,
          motivo: 'campos_faltantes',
          detalle: 'agendar requiere serviceId, professionalId, inicioUtc y nombre',
        }
      }
      return {
        valido: true,
        plan: {
          intencion: 'agendar',
          serviceId: o.serviceId.trim(),
          professionalId: o.professionalId.trim(),
          inicioUtc: o.inicioUtc.trim(),
          nombre: o.nombre.trim(),
        },
      }
    }

    case 'escalar': {
      const motivo = esTextoNoVacio(o.motivo) ? o.motivo.trim() : 'sin motivo declarado'
      return { valido: true, plan: { intencion: 'escalar', motivo } }
    }

    default:
      return {
        valido: false,
        motivo: 'intencion_desconocida',
        detalle: String(o.intencion ?? '(ausente)'),
      }
  }
}

/**
 * Segunda barrera, solo para `agendar`: comprueba contra el catálogo real que la franja
 * que pide el modelo **es una franja que el sistema ofrece de verdad**.
 *
 * No reimplementa ninguna regla de negocio: delega en `getStartMinutes`, la misma función que
 * usa el wizard web. Si el agente pudiera agendar algo que el wizard rechaza, habría dos
 * verdades — y ese es exactamente el fallo que esta spec no puede permitirse.
 */
export function validarPlanAgendar(
  plan: Extract<PlanDelAgente, { intencion: 'agendar' }>,
  services: Service[],
  professionals: Professional[],
  citasDelDia: Appointment[]
): ResultadoValidacion {
  const svc = services.find((s) => s.id === plan.serviceId)
  if (!svc || !svc.activo) {
    return { valido: false, motivo: 'servicio_inexistente', detalle: plan.serviceId }
  }

  const prof = professionals.find((p) => p.id === plan.professionalId)
  if (!prof || !prof.activo) {
    return { valido: false, motivo: 'profesional_inexistente', detalle: plan.professionalId }
  }

  if (!prof.serviceIds.includes(svc.id)) {
    return {
      valido: false,
      motivo: 'profesional_no_presta_servicio',
      detalle: `${prof.nombre} no presta ${svc.nombre}`,
    }
  }

  const inicio = new Date(plan.inicioUtc)
  if (Number.isNaN(inicio.getTime())) {
    return { valido: false, motivo: 'fecha_invalida', detalle: plan.inicioUtc }
  }

  const minutosPedido = toMinutes(inicio)
  const minutosOfrecidos = getStartMinutes(prof, svc, startOfDay(inicio), citasDelDia, services)

  if (!minutosOfrecidos.includes(minutosPedido)) {
    return {
      valido: false,
      motivo: 'franja_no_ofrecida',
      detalle: `${plan.inicioUtc} no está entre las franjas libres de ${prof.nombre}`,
    }
  }

  return { valido: true, plan }
}

/**
 * Los modelos envuelven el JSON en ```json ... ``` con alarmante frecuencia, incluso pidiéndoles
 * que no lo hagan. Se les tolera esa manía; cualquier otra cosa se rechaza.
 */
function extraerJson(crudo: string): string {
  const t = crudo.trim()
  const valla = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (valla) return valla[1].trim()
  return t
}

function recortar(s: string, max = 180): string {
  const t = s.trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}
