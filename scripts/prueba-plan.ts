/**
 * Gate G3 de la Spec 28 — el guardián determinista del agente.
 *
 * Prueba el punto donde un LLM que alucina se estrella: `parsearPlan` y `validarPlanAgendar`.
 * Todo aquí es puro. **Ni una llamada al modelo, ni una credencial, ni un centavo gastado.**
 *
 * Importa los módulos reales (regla 7). Si alguna vez alguien reescribe la lógica dentro de
 * este archivo en vez de importarla, la prueba se estará probando a sí misma y no protegerá nada.
 */

import * as assert from 'node:assert'
import { parsearPlan, validarPlanAgendar } from '../src/lib/agente/validar'
import { instanteEnZona, startOfDay, diaSemanaEnZona } from '../src/lib/disponibilidad'
import type { Appointment, Professional, Service } from '../src/types'
import type { PlanDelAgente } from '../src/lib/agente/tipos'

console.log('🧪 Iniciando prueba-plan.ts...')

// ─────────────────────────────────────────────────────────────────────────────
// 1. parsearPlan — lo que el modelo devuelve
// ─────────────────────────────────────────────────────────────────────────────
console.log('1. Probando parsearPlan...')

{
  const r = parsearPlan('{"intencion":"responder","texto":"Claro que sí, ¿para cuándo?"}')
  assert.strictEqual(r.valido, true)
  assert.deepStrictEqual(r.valido && r.plan, {
    intencion: 'responder',
    texto: 'Claro que sí, ¿para cuándo?',
  })
}

// La manía universal de los modelos: envolver el JSON en una valla de código.
{
  const r = parsearPlan('```json\n{"intencion":"responder","texto":"Hola"}\n```')
  assert.strictEqual(r.valido, true, 'debe tolerar la valla ```json')
}

// Falla cerrado: NADA de inventar una intención por defecto (regla 3).
for (const basura of [
  'no soy json',
  '{"intencion":"borrar_todo"}',
  '{"texto":"sin intencion"}',
  '{"intencion":"responder"}', // sin texto
  '{"intencion":"responder","texto":"   "}', // texto en blanco
  '[]',
  '"solo un string"',
]) {
  const r = parsearPlan(basura)
  assert.strictEqual(r.valido, false, `debió rechazar: ${basura}`)
}

// Consultar: los argumentos obligatorios de verdad son obligatorios.
{
  assert.strictEqual(parsearPlan('{"intencion":"consultar","herramienta":"catalogo"}').valido, true)
  assert.strictEqual(
    parsearPlan('{"intencion":"consultar","herramienta":"disponibilidad","args":{}}').valido,
    false,
    'disponibilidad sin serviceId debe caer'
  )
  assert.strictEqual(
    parsearPlan(
      '{"intencion":"consultar","herramienta":"franjas_del_dia","args":{"serviceId":"svc_1"}}'
    ).valido,
    false,
    'franjas_del_dia sin fecha debe caer'
  )
  assert.strictEqual(
    parsearPlan('{"intencion":"consultar","herramienta":"borrar_agenda","args":{}}').valido,
    false,
    'una herramienta inventada debe caer'
  )
}

// Agendar: sin los cuatro campos no se agenda nada.
{
  assert.strictEqual(
    parsearPlan(
      '{"intencion":"agendar","serviceId":"svc_1","professionalId":"prof_1","inicioUtc":"2026-08-21T15:00:00.000Z","nombre":"Ana"}'
    ).valido,
    true
  )
  assert.strictEqual(
    parsearPlan('{"intencion":"agendar","serviceId":"svc_1","inicioUtc":"2026-08-21T15:00:00.000Z"}')
      .valido,
    false,
    'agendar sin professionalId ni nombre debe caer'
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. validarPlanAgendar — contra el catálogo real
// ─────────────────────────────────────────────────────────────────────────────
console.log('2. Probando validarPlanAgendar...')

const servicio: Service = {
  id: 'svc_mani',
  categoryId: 'cat_1',
  nombre: 'Manicure',
  duracionMin: 45,
  bufferMin: 15,
  precioCentavos: 5000000,
  requiereConfirmacion: false,
  activo: true,
}

const servicioInactivo: Service = { ...servicio, id: 'svc_off', nombre: 'Retirado', activo: false }

const profesional: Professional = {
  id: 'prof_ana',
  nombre: 'Ana',
  cargo: 'Manicurista',
  serviceIds: ['svc_mani'],
  // 1=Lun … 6=Sáb, de 9 a 19
  horario: { 1: [9, 19], 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [9, 19] },
  excepciones: [],
  activo: true,
}

const otraProfesional: Professional = {
  ...profesional,
  id: 'prof_luz',
  nombre: 'Luz',
  serviceIds: ['svc_otro'], // NO presta manicure
}

const services = [servicio, servicioInactivo]
const professionals = [profesional, otraProfesional]

/** Un día laboral (lunes–sábado) a 5 días vista: pasa la antelación mínima con holgura. */
function proximoDiaLaboral(): Date {
  const d = new Date(Date.now() + 5 * 24 * 3600 * 1000)
  // diaSemanaEnZona: 0 = domingo
  return diaSemanaEnZona(d) === 0 ? new Date(d.getTime() + 24 * 3600 * 1000) : d
}

const diaRef = startOfDay(proximoDiaLaboral())
const DIEZ_DE_LA_MANANA = 10 * 60
const inicioValido = instanteEnZona(diaRef, DIEZ_DE_LA_MANANA).toISOString()

function planAgendar(over: Partial<Extract<PlanDelAgente, { intencion: 'agendar' }>> = {}) {
  return {
    intencion: 'agendar' as const,
    serviceId: 'svc_mani',
    professionalId: 'prof_ana',
    inicioUtc: inicioValido,
    nombre: 'Ana Clienta',
    ...over,
  }
}

// 2.1 · El caso bueno: agenda libre, franja ofrecida.
{
  const r = validarPlanAgendar(planAgendar(), services, professionals, [])
  assert.strictEqual(r.valido, true, `la franja válida debió pasar (${inicioValido})`)
}

// 2.2 · Servicio que no existe, e inactivo.
{
  assert.strictEqual(
    (validarPlanAgendar(planAgendar({ serviceId: 'svc_fantasma' }), services, professionals, []) as { motivo?: string }).motivo,
    'servicio_inexistente'
  )
  assert.strictEqual(
    (validarPlanAgendar(planAgendar({ serviceId: 'svc_off' }), services, professionals, []) as { motivo?: string }).motivo,
    'servicio_inexistente',
    'un servicio inactivo no se puede agendar'
  )
}

// 2.3 · Profesional que no existe, y profesional que no presta ese servicio.
{
  assert.strictEqual(
    (validarPlanAgendar(planAgendar({ professionalId: 'prof_x' }), services, professionals, []) as { motivo?: string }).motivo,
    'profesional_inexistente'
  )
  assert.strictEqual(
    (validarPlanAgendar(planAgendar({ professionalId: 'prof_luz' }), services, professionals, []) as { motivo?: string }).motivo,
    'profesional_no_presta_servicio'
  )
}

// 2.4 · Fecha que no es fecha.
{
  assert.strictEqual(
    (validarPlanAgendar(planAgendar({ inicioUtc: 'el jueves' }), services, professionals, []) as { motivo?: string }).motivo,
    'fecha_invalida'
  )
}

// 2.5 · Horas que el estudio NO ofrece. Es el corazón del gate: el modelo puede pedirlas,
//       pero no pueden pasar.
{
  const casos: Array<[string, number]> = [
    ['antes de abrir (07:00)', 7 * 60],
    ['en pleno almuerzo (13:15)', 13 * 60 + 15],
    ['después de cerrar (20:00)', 20 * 60],
    ['fuera del paso de 15 min (10:07)', 10 * 60 + 7],
    ['tan tarde que no cabe el servicio (18:30)', 18 * 60 + 30],
  ]
  for (const [nombre, minutos] of casos) {
    const inicio = instanteEnZona(diaRef, minutos).toISOString()
    const r = validarPlanAgendar(planAgendar({ inicioUtc: inicio }), services, professionals, [])
    assert.strictEqual(r.valido, false, `debió rechazar ${nombre}`)
    assert.strictEqual((r as { motivo?: string }).motivo, 'franja_no_ofrecida', `motivo para ${nombre}`)
  }
}

// 2.6 · Domingo: el estudio cierra.
{
  const domingo = (() => {
    const d = new Date(diaRef)
    while (diaSemanaEnZona(d) !== 0) d.setUTCDate(d.getUTCDate() + 1)
    return startOfDay(d)
  })()
  const inicio = instanteEnZona(domingo, DIEZ_DE_LA_MANANA).toISOString()
  const r = validarPlanAgendar(planAgendar({ inicioUtc: inicio }), services, professionals, [])
  assert.strictEqual(r.valido, false, 'el domingo no se agenda')
}

// 2.7 · Franja ya ocupada por otra cita.
{
  const citaExistente: Appointment = {
    id: 'apt_previa',
    clientId: 'cli_1',
    professionalId: 'prof_ana',
    serviceId: 'svc_mani',
    inicioUtc: inicioValido,
    finUtc: new Date(new Date(inicioValido).getTime() + 60 * 60 * 1000).toISOString(),
    duracionTotalMin: 60,
    estado: 'agendada',
    origen: 'web',
    precioCentavos: 5000000,
    creadaPor: 'test',
    historial: [],
  }
  const r = validarPlanAgendar(planAgendar(), services, professionals, [citaExistente])
  assert.strictEqual(r.valido, false, 'no se puede agendar sobre una cita existente')
  assert.strictEqual((r as { motivo?: string }).motivo, 'franja_no_ofrecida')
}

// 2.8 · Una cita CANCELADA no bloquea la franja (coherencia con `ocupaFranja`).
{
  const cancelada: Appointment = {
    id: 'apt_cancelada',
    clientId: 'cli_1',
    professionalId: 'prof_ana',
    serviceId: 'svc_mani',
    inicioUtc: inicioValido,
    finUtc: new Date(new Date(inicioValido).getTime() + 60 * 60 * 1000).toISOString(),
    duracionTotalMin: 60,
    estado: 'cancelada',
    origen: 'web',
    precioCentavos: 5000000,
    creadaPor: 'test',
    historial: [],
  }
  const r = validarPlanAgendar(planAgendar(), services, professionals, [cancelada])
  assert.strictEqual(r.valido, true, 'una cita cancelada libera su franja')
}

console.log('✅ Todas las pruebas de plan del agente pasaron exitosamente.')
