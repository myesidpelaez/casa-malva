/**
 * Las herramientas de solo lectura del agente (Spec 28 · §2).
 *
 * **Aquí no se calcula nada de negocio.** Cada herramienta es una fachada sobre una server
 * action que ya existe y que ya tiene pruebas, y su único trabajo extra es redactar el
 * resultado en texto que un modelo pueda usar sin equivocarse.
 *
 * Si una herramienta necesitara lógica de disponibilidad propia, habría dos verdades sobre
 * qué horas están libres. Por eso no la tiene.
 */

import {
  consultarDisponibilidadAction,
  franjasDelDiaAction,
} from '@/actions/citas'
import { getServicesAction } from '@/actions/catalogo'
import { formatCurrencyFromCents } from '@/lib/currency'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import type { ArgsHerramienta, NombreHerramienta } from './tipos'

const FMT_HORA = new Intl.DateTimeFormat('es-CO', {
  timeZone: REGLAS_NEGOCIO.zonaHoraria,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

/** Una franja, escrita para el modelo: la hora legible **y** el `inicioUtc` que debe copiar. */
function lineaFranja(inicioUtc: string, profNombre: string, profId: string): string {
  return `- ${FMT_HORA.format(new Date(inicioUtc))} con ${profNombre} · professionalId=${profId} · inicioUtc=${inicioUtc}`
}

export async function ejecutarHerramienta(
  herramienta: NombreHerramienta,
  args: ArgsHerramienta
): Promise<string> {
  switch (herramienta) {
    case 'catalogo': {
      const res = await getServicesAction()
      if (!res.ok) return `No se pudo leer el catálogo: ${res.error}`
      const activos = res.data.filter((s) => s.activo)
      if (activos.length === 0) return 'No hay servicios activos en este momento.'
      return activos
        .map(
          (s) =>
            `- ${s.nombre} · ${s.duracionMin} min · ${formatCurrencyFromCents(s.precioCentavos)} · serviceId=${s.id}`
        )
        .join('\n')
    }

    case 'disponibilidad': {
      if (!args.serviceId) return 'Falta el serviceId para consultar disponibilidad.'
      const res = await consultarDisponibilidadAction(args.serviceId)
      if (!res.ok) return `No se pudo consultar disponibilidad: ${res.error}`
      if (res.data.length === 0) {
        return 'No hay ninguna franja libre para ese servicio en los próximos 14 días.'
      }
      return [
        'Próximas franjas libres (usa el inicioUtc exacto, no lo recalcules):',
        ...res.data.map((s) =>
          lineaFranja(s.start.toISOString(), s.professionalNombre, s.professionalId)
        ),
      ].join('\n')
    }

    case 'franjas_del_dia': {
      if (!args.serviceId) return 'Falta el serviceId.'
      if (!args.fecha) return 'Falta la fecha (YYYY-MM-DD).'

      // Mediodía del día pedido en hora de Colombia: cae siempre dentro del día correcto
      // sin importar dónde corra el proceso (regla 4 — nada de la hora del servidor).
      const fechaIso = `${args.fecha}T17:00:00.000Z`
      if (Number.isNaN(new Date(fechaIso).getTime())) {
        return `Fecha inválida: ${args.fecha}. Se espera YYYY-MM-DD.`
      }

      const res = await franjasDelDiaAction(args.serviceId, fechaIso)
      if (!res.ok) return `No se pudieron consultar las franjas: ${res.error}`
      if (res.data.length === 0) {
        return `No queda ninguna franja libre el ${args.fecha} para ese servicio.`
      }
      return [
        `Franjas libres el ${args.fecha} (usa el inicioUtc exacto, no lo recalcules):`,
        ...res.data.map((f) => lineaFranja(f.inicioUtc, f.professionalNombre, f.professionalId)),
      ].join('\n')
    }
  }
}
