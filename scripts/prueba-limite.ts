/**
 * Gate G2 de la Spec 29 — Función pura de límites de tasa del agente web.
 *
 * Prueba pura: sin red ni Firestore (Spec 29 · D4).
 * - Mensaje 20 de la hora pasa, el 21 no.
 * - Pasada la hora la ventana se reinicia.
 * - En el mensaje 60 se corta en seco.
 */

import * as assert from 'node:assert'
import { decidirLimite, TOPE_MENSAJES_HORA, TOPE_MENSAJES_TOTAL, type EstadoLimite } from '../src/lib/agente/limite'

console.log('🧪 Iniciando prueba-limite.ts (Spec 29 · G2)...')

const t0 = new Date('2026-08-21T10:00:00.000Z')

// ─────────────────────────────────────────────────────────────────────────────
// 1. Mensajes 1 al 20 dentro de la misma hora pasan; el 21 no
// ─────────────────────────────────────────────────────────────────────────────
console.log('1. Probando tope horario (20 mensajes/hora)...')

let estado: EstadoLimite = {
  mensajesEnVentana: 0,
  ventanaAbiertaEn: null,
  mensajesTotales: 0,
}

for (let i = 1; i <= TOPE_MENSAJES_HORA; i++) {
  const t = new Date(t0.getTime() + (i - 1) * 60 * 1000) // cada minuto
  const r = decidirLimite(estado, t)
  assert.strictEqual(r.permitir, true, `mensaje ${i} dentro de la hora debe ser permitido`)
  assert.strictEqual(r.permitir && r.nuevoEstado.mensajesEnVentana, i)
  assert.strictEqual(r.permitir && r.nuevoEstado.mensajesTotales, i)
  if (r.permitir) {
    estado = r.nuevoEstado
  }
}

// Mensaje 21 a los 25 minutos (misma ventana horaria)
{
  const t21 = new Date(t0.getTime() + 25 * 60 * 1000)
  const r = decidirLimite(estado, t21)
  assert.strictEqual(r.permitir, false, 'mensaje 21 dentro de la misma hora debe ser rechazado')
  assert.strictEqual((r as { motivo?: string }).motivo, 'demasiados_mensajes')
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Pasada la hora la ventana se reinicia
// ─────────────────────────────────────────────────────────────────────────────
console.log('2. Probando reinicio de ventana tras 1 hora...')

{
  const tNuevaHora = new Date(t0.getTime() + 61 * 60 * 1000) // 61 minutos después
  const r = decidirLimite(estado, tNuevaHora)
  assert.strictEqual(r.permitir, true, 'mensaje tras 1 hora debe reiniciar la ventana y ser permitido')
  assert.strictEqual(r.permitir && r.nuevoEstado.mensajesEnVentana, 1, 'mensajesEnVentana debe reiniciarse a 1')
  assert.strictEqual(r.permitir && r.nuevoEstado.mensajesTotales, 21, 'mensajesTotales debe acumularse a 21')
  if (r.permitir) {
    estado = r.nuevoEstado
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. En el mensaje 60 total se corta en seco
// ─────────────────────────────────────────────────────────────────────────────
console.log('3. Probando tope total acumulado (60 mensajes)...')

// Simulamos que pasaron varias horas y llegamos a 59 mensajes totales (TOPE_MENSAJES_TOTAL - 1)
const estado59: EstadoLimite = {
  mensajesEnVentana: 5,
  ventanaAbiertaEn: new Date(t0.getTime() + 5 * 3600 * 1000).toISOString(),
  mensajesTotales: TOPE_MENSAJES_TOTAL - 1,
}

const t5 = new Date(t0.getTime() + 5 * 3600 * 1000 + 10 * 60 * 1000)

// Mensaje 60
const r60 = decidirLimite(estado59, t5)
assert.strictEqual(r60.permitir, true, 'mensaje 60 debe ser permitido')
assert.strictEqual(r60.permitir && r60.nuevoEstado.mensajesTotales, 60)

// Mensaje 61 (cortado en seco)
const estado60 = r60.permitir ? r60.nuevoEstado : estado59
const r61 = decidirLimite(estado60, new Date(t5.getTime() + 60 * 1000))
assert.strictEqual(r61.permitir, false, 'mensaje 61 debe ser cortado en seco')
assert.strictEqual((r61 as { motivo?: string }).motivo, 'demasiados_mensajes')

// Incluso si pasa un día entero, 60 mensajes totales bloquea permanentemente la conversación
const rFuturo = decidirLimite(estado60, new Date(t5.getTime() + 24 * 3600 * 1000))
assert.strictEqual(rFuturo.permitir, false, 'superado el tope total no se puede reanudar')
assert.strictEqual((rFuturo as { motivo?: string }).motivo, 'demasiados_mensajes')

console.log('✅ Todas las pruebas de límites de tasa pasaron exitosamente.')
