import * as assert from 'node:assert'
import {
  ocupaFranja,
  calcularFranjasSlot,
  planificarSlots,
} from '../src/lib/ocupacion'
import type { AppointmentState } from '../src/types'

console.log('🧪 Iniciando prueba-ocupacion.ts...')

const TODOS_LOS_ESTADOS: AppointmentState[] = [
  'pendiente', 'agendada', 'confirmada', 'completada', 'cancelada', 'no_asistio'
]

// 1. ocupaFranja para los seis estados
console.log('1. Probando ocupaFranja...')
for (const estado of TODOS_LOS_ESTADOS) {
  const debeOcupar = ['pendiente', 'agendada', 'confirmada', 'completada'].includes(estado)
  assert.strictEqual(ocupaFranja(estado), debeOcupar, `Estado ${estado} debería ocupar=${debeOcupar}`)
}

// 2. calcularFranjasSlot
console.log('2. Probando calcularFranjasSlot...')
const inicio = '2026-08-15T10:00:00.000Z'
const franjas45 = calcularFranjasSlot(inicio, 45) // duración exacta
assert.deepStrictEqual(franjas45, [
  '2026-08-15T10:00:00.000Z',
  '2026-08-15T10:15:00.000Z',
  '2026-08-15T10:30:00.000Z',
])

const franjas50 = calcularFranjasSlot(inicio, 50) // no múltiplo de 15
assert.deepStrictEqual(franjas50, [
  '2026-08-15T10:00:00.000Z',
  '2026-08-15T10:15:00.000Z',
  '2026-08-15T10:30:00.000Z',
  '2026-08-15T10:45:00.000Z',
])

const franjas10 = calcularFranjasSlot(inicio, 10) // menor que el paso
assert.deepStrictEqual(franjas10, [
  '2026-08-15T10:00:00.000Z',
])

// 3. planificarSlots
console.log('3. Probando planificarSlots...')
const prof1 = 'prof_1'
const prof2 = 'prof_2'
const t10_00 = '2026-08-15T10:00:00.000Z'
const t10_15 = '2026-08-15T10:15:00.000Z'
const t11_00 = '2026-08-15T11:00:00.000Z'
const t15_00 = '2026-08-15T15:00:00.000Z'
const idSlot = (h: string) => `${prof1}_${h}`
const idSlot2 = (h: string) => `${prof2}_${h}`

// Caso a: Cita nueva en estado que ocupa -> crear, borrar vacío
const p_nueva = planificarSlots(null, { professionalId: prof1, inicioUtc: t10_00, estado: 'agendada' }, 30)
assert.strictEqual(p_nueva.crear.length, 2)
assert.strictEqual(p_nueva.borrar.length, 0)

// Caso b: Cita nueva en estado que NO ocupa -> ambos vacíos
const p_nuevaNo = planificarSlots(null, { professionalId: prof1, inicioUtc: t10_00, estado: 'cancelada' }, 30)
assert.strictEqual(p_nuevaNo.crear.length, 0)
assert.strictEqual(p_nuevaNo.borrar.length, 0)

// Caso c: Cancelar o marcar no-asistió -> crear vacío, borrar todas las viejas
const p_cancel = planificarSlots(
  { professionalId: prof1, inicioUtc: t10_00, estado: 'agendada' },
  { professionalId: prof1, inicioUtc: t10_00, estado: 'cancelada' },
  30
)
assert.strictEqual(p_cancel.crear.length, 0)
assert.strictEqual(p_cancel.borrar.length, 2)

// Caso d: Reagendar sin solapamiento
const p_reagendar1 = planificarSlots(
  { professionalId: prof1, inicioUtc: t10_00, estado: 'agendada' },
  { professionalId: prof1, inicioUtc: t15_00, estado: 'agendada' },
  60
)
assert.strictEqual(p_reagendar1.borrar.length, 4)
assert.strictEqual(p_reagendar1.crear.length, 4)
assert.ok(p_reagendar1.borrar.includes(idSlot(t10_00)))
assert.ok(p_reagendar1.crear.includes(idSlot(t15_00)))

// Caso e: Reagendar CON solapamiento (10:00 -> 10:15, duración 50 min => slots a crear: 10:00, 10:15, 10:30, 10:45)
// Si 10:15, 50 min => slots: 10:15, 10:30, 10:45, 11:00
// Slots borrados: solo 10:00. Slots creados: solo 11:00. Compartidos no se borran.
const p_reagendar2 = planificarSlots(
  { professionalId: prof1, inicioUtc: t10_00, estado: 'agendada' },
  { professionalId: prof1, inicioUtc: t10_15, estado: 'agendada' },
  50
)
assert.strictEqual(p_reagendar2.borrar.length, 1, 'Solapamiento borrar incorrecto')
assert.strictEqual(p_reagendar2.borrar[0], idSlot(t10_00))
assert.strictEqual(p_reagendar2.crear.length, 1, 'Solapamiento crear incorrecto')
assert.strictEqual(p_reagendar2.crear[0], idSlot(t11_00))

// Caso f: Cambio de profesional a la misma hora
const p_cambioProf = planificarSlots(
  { professionalId: prof1, inicioUtc: t10_00, estado: 'agendada' },
  { professionalId: prof2, inicioUtc: t10_00, estado: 'agendada' },
  30
)
assert.strictEqual(p_cambioProf.borrar.length, 2)
assert.strictEqual(p_cambioProf.crear.length, 2)
assert.ok(p_cambioProf.borrar.includes(idSlot(t10_00)))
assert.ok(p_cambioProf.crear.includes(idSlot2(t10_00)))

// Caso g: Estado que ocupa -> otro estado que ocupa, misma hora
const p_mismo = planificarSlots(
  { professionalId: prof1, inicioUtc: t10_00, estado: 'agendada' },
  { professionalId: prof1, inicioUtc: t10_00, estado: 'confirmada' },
  30
)
assert.strictEqual(p_mismo.crear.length, 0)
assert.strictEqual(p_mismo.borrar.length, 0)

// 4. La prueba de coherencia que caza F3
console.log('4. Probando coherencia (caza F3)...')
for (const estado of TODOS_LOS_ESTADOS) {
  const plan = planificarSlots(null, { professionalId: prof1, inicioUtc: t10_00, estado }, 30)
  const slotsCreados = plan.crear.length > 0
  const ocupa = ocupaFranja(estado)
  
  assert.strictEqual(
    slotsCreados,
    ocupa,
    `F3 detectado: ocupaFranja=${ocupa} pero slotsCreados=${slotsCreados} para el estado ${estado}`
  )
}

console.log('✅ Todas las pruebas de ocupacion.ts pasaron exitosamente.')
