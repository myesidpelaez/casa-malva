/**
 * Prueba del hallazgo F2 — el reloj del estudio no puede depender de la zona del servidor.
 *
 * Casa Malva corre en el portátil (America/Bogota) y en App Hosting (UTC). El motor de
 * disponibilidad debe dar EXACTAMENTE el mismo resultado en ambos. Antes no lo hacía:
 * `getHours()`, `getDate()` y `setHours()` leían la hora del proceso, así que en UTC el
 * estudio "abría" a las 04:00 de Bogotá y el almuerzo caía a las 08:00.
 *
 * Esta prueba importa el módulo REAL (`src/lib/disponibilidad`), no una copia. Se ejecuta
 * dos veces, con TZ=America/Bogota y con TZ=UTC, y ambas ejecuciones deben pasar:
 *
 *   npm run prueba:zona
 *
 * Anti-patrón que evita: 04-BIBLIOTECA/patrones/guardianes-que-no-guardan
 */
import {
  claveDia,
  diaSemanaEnZona,
  getStartMinutes,
  instanteEnZona,
  startOfDay,
  toMinutes,
} from '../src/lib/disponibilidad'
import type { Professional, Service } from '../src/types'

let fallos = 0

function comprobar(descripcion: string, obtenido: unknown, esperado: unknown): void {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado)
  if (ok) {
    console.log(`  ✓ ${descripcion}`)
  } else {
    console.log(`  ✗ ${descripcion}`)
    console.log(`      esperado: ${JSON.stringify(esperado)}`)
    console.log(`      obtenido: ${JSON.stringify(obtenido)}`)
    fallos++
  }
}

console.log(`\n🕐 Prueba de zona horaria — proceso corriendo en TZ=${process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone}\n`)

// ── 1. Un instante UTC se lee con el reloj de Bogotá (UTC−5) ─────────────────
// 14:00 UTC son las 09:00 en Bogotá: la hora de apertura del estudio.
console.log('1. Lectura de la hora del estudio')
comprobar('toMinutes(14:00 UTC) = 540 min (09:00 Bogotá)', toMinutes(new Date('2026-08-14T14:00:00Z')), 540)
comprobar('toMinutes(18:00 UTC) = 780 min (13:00, inicio del almuerzo)', toMinutes(new Date('2026-08-14T18:00:00Z')), 780)

// ── 2. El día de calendario cruza la medianoche por Bogotá, no por UTC ───────
// Las 02:00 UTC del sábado 15 son las 21:00 del viernes 14 en Medellín.
console.log('\n2. Frontera del día (la que rompía los bloqueos de agenda)')
comprobar('claveDia(15-ago 02:00 UTC) = "2026-08-14"', claveDia(new Date('2026-08-15T02:00:00Z')), '2026-08-14')
comprobar('claveDia(14-ago 14:00 UTC) = "2026-08-14"', claveDia(new Date('2026-08-14T14:00:00Z')), '2026-08-14')
comprobar('diaSemanaEnZona(15-ago 02:00 UTC) = 5 (viernes)', diaSemanaEnZona(new Date('2026-08-15T02:00:00Z')), 5)

// ── 3. Construir un instante desde minutos del día ───────────────────────────
console.log('\n3. Construcción de franjas')
comprobar(
  'instanteEnZona(14-ago, 540) = 14:00 UTC (09:00 Bogotá)',
  instanteEnZona(new Date('2026-08-14T12:00:00Z'), 540).toISOString(),
  '2026-08-14T14:00:00.000Z'
)
comprobar(
  'startOfDay(14-ago 12:00 UTC) = 05:00 UTC (medianoche de Bogotá)',
  startOfDay(new Date('2026-08-14T12:00:00Z')).toISOString(),
  '2026-08-14T05:00:00.000Z'
)

// ── 4. Ida y vuelta: lo que construyo es lo que leo ──────────────────────────
console.log('\n4. Ida y vuelta sobre todas las franjas de la jornada')
const diaRef = new Date('2026-08-14T12:00:00Z')
const desincronizadas: number[] = []
for (let m = 9 * 60; m <= 19 * 60; m += 15) {
  if (toMinutes(instanteEnZona(diaRef, m)) !== m) desincronizadas.push(m)
}
comprobar('las 41 franjas de 09:00 a 19:00 vuelven con el mismo minuto', desincronizadas, [])

// ── 5. Regla de negocio real: la jornada empieza a las 09:00 del estudio ─────
// Es el nivel en que el fallo se veía: la clienta abría el calendario y no había cupos,
// o los había a horas imposibles.
console.log('\n5. Motor de disponibilidad (regla de negocio)')

const servicio: Service = {
  id: 'svc_prueba',
  categoryId: 'cat_prueba',
  nombre: 'Servicio de prueba',
  duracionMin: 40,
  bufferMin: 10,
  precioCentavos: 5000000,
  requiereConfirmacion: false,
  activo: true,
}

const profesional: Professional = {
  id: 'prof_prueba',
  nombre: 'Profesional de prueba',
  rol: 'Estilista',
  serviceIds: ['svc_prueba'],
  horario: { 1: [9, 19], 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [9, 19] },
  excepciones: [],
  activo: true,
}

// Un día laborable dentro de la ventana de reserva (hoy + 10 días, saltando el domingo)
let diaPrueba = new Date(Date.now() + 10 * 24 * 3600 * 1000)
if (diaSemanaEnZona(diaPrueba) === 0) diaPrueba = new Date(diaPrueba.getTime() + 24 * 3600 * 1000)

const minutos = getStartMinutes(profesional, servicio, diaPrueba, [], [servicio])

comprobar('la primera franja del día es a las 09:00 (540 min)', minutos[0], 540)
comprobar('ninguna franja empieza antes de las 09:00', minutos.filter((m) => m < 540), [])
comprobar('ninguna franja termina después de las 19:00', minutos.filter((m) => m + 50 > 19 * 60), [])
comprobar('ninguna franja cae en el almuerzo (13:00–14:00)', minutos.filter((m) => m >= 780 && m < 840), [])

const primeraFranjaUtc = instanteEnZona(diaPrueba, minutos[0]).toISOString().slice(11, 16)
comprobar('las 09:00 del estudio son las 14:00 UTC', primeraFranjaUtc, '14:00')

// ── Veredicto ────────────────────────────────────────────────────────────────
if (fallos === 0) {
  console.log(`\n✅ SUPERADA — el reloj del estudio es independiente de la zona del servidor.\n`)
} else {
  console.log(`\n❌ FALLIDA — ${fallos} comprobación(es) dependen de la zona del proceso.\n`)
  process.exit(1)
}
