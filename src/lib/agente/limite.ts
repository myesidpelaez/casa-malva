/**
 * Límites de tasa del agente web (Spec 29 · D4).
 *
 * Función pura: sin red ni Firestore.
 * Esto permite probar los topes gratis y sin credenciales (Spec 29 · G2).
 *
 * Topes:
 *   - 20 mensajes por hora y por conversación.
 *   - 60 mensajes en total por conversación (al superarse se corta en seco y se escala).
 */

export type EstadoLimite = {
  mensajesEnVentana: number
  ventanaAbiertaEn: string | null
  mensajesTotales?: number
}

export type ResultadoLimite =
  | {
      permitir: true
      nuevoEstado: {
        mensajesEnVentana: number
        ventanaAbiertaEn: string
        mensajesTotales: number
      }
    }
  | {
      permitir: false
      motivo: 'demasiados_mensajes'
    }

export const TOPE_MENSAJES_HORA = 20
export const TOPE_MENSAJES_TOTAL = 60
const VENTANA_MS = 60 * 60 * 1000 // 1 hora en ms

export function decidirLimite(
  estado: EstadoLimite,
  ahora: Date
): ResultadoLimite {
  const totalesPrevios = estado.mensajesTotales ?? 0
  if (totalesPrevios >= TOPE_MENSAJES_TOTAL) {
    return { permitir: false, motivo: 'demasiados_mensajes' }
  }

  const ahoraMs = ahora.getTime()
  const ventanaInicioMs = estado.ventanaAbiertaEn
    ? new Date(estado.ventanaAbiertaEn).getTime()
    : 0

  let enVentana = estado.mensajesEnVentana
  let ventanaIso = estado.ventanaAbiertaEn

  // Si la ventana no está abierta o ya pasaron más de 60 minutos, reiniciamos la ventana
  if (!estado.ventanaAbiertaEn || Number.isNaN(ventanaInicioMs) || ahoraMs - ventanaInicioMs >= VENTANA_MS) {
    enVentana = 0
    ventanaIso = ahora.toISOString()
  }

  if (enVentana >= TOPE_MENSAJES_HORA) {
    return { permitir: false, motivo: 'demasiados_mensajes' }
  }

  return {
    permitir: true,
    nuevoEstado: {
      mensajesEnVentana: enVentana + 1,
      ventanaAbiertaEn: ventanaIso!,
      mensajesTotales: totalesPrevios + 1,
    },
  }
}
