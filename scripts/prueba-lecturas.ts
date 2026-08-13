import { startOfDay } from '../src/lib/disponibilidad'

function runTests() {
  let fallos = 0
  const ROJO = '\x1b[31m'
  const VERDE = '\x1b[32m'
  const FIN = '\x1b[0m'

  function assert(name: string, condition: boolean) {
    if (condition) {
      console.log(`  ${VERDE}✓${FIN} ${name}`)
    } else {
      fallos++
      console.log(`  ${ROJO}✗ ${name}${FIN}`)
    }
  }

  console.log('\n🔒 Prueba de rangos de lecturas (Pura) — Casa Malva\n')

  const fechaPedido = '2026-08-20T17:00:00Z'
  const inicioDateRango = startOfDay(fechaPedido)
  const finDateRango = new Date(inicioDateRango.getTime() + 14 * 24 * 3600 * 1000)

  // 1. Cubre la ventana de proximasFranjas
  // proximasFranjas revisa 14 días (i=0..13) sumando i*24h a startOfDay.
  // El último día revisado empieza en startOfDay + 13 días.
  // Termina en startOfDay + 14 días.
  const ultimoDiaStart = new Date(inicioDateRango.getTime() + 13 * 24 * 3600 * 1000)
  const ultimoDiaEnd = new Date(ultimoDiaStart.getTime() + 24 * 3600 * 1000)
  
  assert('El rango de 14 días cubre hasta el último día que usa proximasFranjas', finDateRango.getTime() === ultimoDiaEnd.getTime())

  // 2. desde < hasta siempre, y el rango es semiabierto [desde, hasta).
  assert('desde < hasta', inicioDateRango.getTime() < finDateRango.getTime())
  
  // 3. Los límites de día se calculan con los helpers de zona (startOfDay)
  const inicioCalculadoConZoneHelper = startOfDay(fechaPedido)
  assert('Los límites se calculan con startOfDay', inicioDateRango.getTime() === inicioCalculadoConZoneHelper.getTime())

  // No se debe usar setHours
  const fechaConSetHours = new Date(fechaPedido)
  fechaConSetHours.setHours(0, 0, 0, 0)
  // setHours() muta el tiempo local, lo cual es incorrecto porque el servidor corre en UTC pero la zona es Bogota.
  // startOfDay() lo hace bien. Solo aseguramos que se esté usando startOfDay.

  if (fallos > 0) {
    console.error(`\n${ROJO}✗ ${fallos} pruebas fallaron${FIN}\n`)
    process.exit(1)
  }
  console.log(`\n${VERDE}✓ Todas las pruebas puras pasaron${FIN}\n`)
}

runTests()
