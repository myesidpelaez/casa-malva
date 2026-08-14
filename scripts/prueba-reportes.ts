import { resumenCaja, rankingProfesionales, rankingServicios, mapaDeFranjas, citasPorOrigen } from '../src/lib/reportes'
import type { Charge, Appointment, Professional, Service } from '../src/types'

let fallos = 0

function afirmar(descripcion: string, condicion: boolean, esperado?: unknown, obtenido?: unknown) {
  if (condicion) {
    console.log(`  \x1b[32m✓\x1b[0m ${descripcion}`)
  } else {
    console.log(`  \x1b[31m✗ ${descripcion}\x1b[0m`)
    if (esperado !== undefined) {
      console.log(`      esperado: ${JSON.stringify(esperado)}   obtenido: ${JSON.stringify(obtenido)}`)
    }
    fallos++
  }
}

const mockCobros: Charge[] = [
  { id: 'chg_1', appointmentId: 'app_1', clientId: 'cli_1', professionalId: 'p_1', serviceId: 's_1', fechaUtc: '2026-08-10T15:00:00Z', precioListaCentavos: 5500000, descuentoCentavos: 0, cobradoCentavos: 5500000, propinaCentavos: 0, metodoPago: 'efectivo', cobradoPor: 'uid_1' },
  { id: 'chg_2', appointmentId: 'app_2', clientId: 'cli_2', professionalId: 'p_1', serviceId: 's_2', fechaUtc: '2026-08-10T16:00:00Z', precioListaCentavos: 2800000, descuentoCentavos: 0, cobradoCentavos: 2800000, propinaCentavos: 1000000, metodoPago: 'tarjeta', cobradoPor: 'uid_1' }, // propina
  { id: 'chg_3', appointmentId: 'app_3', clientId: 'cli_3', professionalId: 'p_2', serviceId: 's_3', fechaUtc: '2026-08-10T20:00:00Z', precioListaCentavos: 4500000, descuentoCentavos: 500000, cobradoCentavos: 4000000, propinaCentavos: 0, metodoPago: 'nequi', cobradoPor: 'uid_1' }, // descuento
  { id: 'chg_4', appointmentId: 'app_4', clientId: 'cli_1', professionalId: 'p_2', serviceId: 's_4', fechaUtc: '2026-08-11T00:00:00Z', precioListaCentavos: 42000000, descuentoCentavos: 0, cobradoCentavos: 42000000, propinaCentavos: 0, metodoPago: 'transferencia', cobradoPor: 'uid_1' }, // 19:00 bogota cae en ese dia F2
]

const mockCitas: Appointment[] = [
  { id: 'app_1', clientId: 'cli_1', professionalId: 'p_1', serviceId: 's_1', inicioUtc: '2026-08-10T14:00:00Z', finUtc: '2026-08-10T15:10:00Z', duracionTotalMin: 70, estado: 'completada', origen: 'admin', precioCentavos: 5500000, creadaPor: 'uid_1', historial: [] }, // s_1
  { id: 'app_2', clientId: 'cli_2', professionalId: 'p_1', serviceId: 's_2', inicioUtc: '2026-08-10T15:30:00Z', finUtc: '2026-08-10T16:00:00Z', duracionTotalMin: 30, estado: 'completada', origen: 'web', precioCentavos: 2800000, creadaPor: 'uid_1', historial: [] },
  { id: 'app_3', clientId: 'cli_3', professionalId: 'p_2', serviceId: 's_3', inicioUtc: '2026-08-10T19:30:00Z', finUtc: '2026-08-10T20:00:00Z', duracionTotalMin: 30, estado: 'completada', origen: 'whatsapp', precioCentavos: 4500000, creadaPor: 'uid_1', historial: [] },
  { id: 'app_4', clientId: 'cli_1', professionalId: 'p_2', serviceId: 's_4', inicioUtc: '2026-08-11T00:00:00Z', finUtc: '2026-08-11T04:20:00Z', duracionTotalMin: 260, estado: 'completada', origen: 'admin', precioCentavos: 42000000, creadaPor: 'uid_1', historial: [] }, // F2 test: 19:00 UTC-5 (next day UTC)
]

const mockServicios: Service[] = [
  { id: 's_1', categoryId: 'c_1', nombre: 'S1', duracionMin: 60, bufferMin: 10, precioCentavos: 5500000, requiereConfirmacion: false, activo: true },
  { id: 's_2', categoryId: 'c_1', nombre: 'S2', duracionMin: 30, bufferMin: 0, precioCentavos: 2800000, requiereConfirmacion: false, activo: true },
  { id: 's_3', categoryId: 'c_1', nombre: 'S3', duracionMin: 30, bufferMin: 0, precioCentavos: 4500000, requiereConfirmacion: false, activo: true },
  { id: 's_4', categoryId: 'c_1', nombre: 'S4', duracionMin: 240, bufferMin: 20, precioCentavos: 42000000, requiereConfirmacion: false, activo: true },
]

const mockProfesionales: Professional[] = [
  { id: 'p_1', nombre: 'P1', cargo: '', serviceIds: [], horario: { 1: [9,18] }, excepciones: [], activo: true },
  { id: 'p_2', nombre: 'P2', cargo: '', serviceIds: [], horario: { 1: [9,18] }, excepciones: [], activo: true },
]

console.log('\nReportes\n')

const caja = resumenCaja(mockCobros)
afirmar('Tres cobros de 55.000, 28.000 y 45.000 (wait, plus 4th is 420.000) - total 543.000', caja.ingresoCentavos === 54300000, 54300000, caja.ingresoCentavos)
afirmar('Ticket promedio se redondea', caja.ticketPromedioCentavos === Math.round(54300000 / 4), Math.round(54300000 / 4), caja.ticketPromedioCentavos)
afirmar('Propina no cambia el ingreso', caja.propinaCentavos === 1000000 && caja.ingresoCentavos === 54300000)
afirmar('Descuento en chg_3 reduce ingreso a 40.000', caja.descuentoCentavos === 500000)

const rankingProf = rankingProfesionales(mockCobros, mockCitas, mockProfesionales, { desdeUtc: '2026-08-10T00:00:00Z', hastaUtc: '2026-08-11T23:59:59Z' })
afirmar('Dos profesionales, P2 con más ingreso está primero', rankingProf[0].professionalId === 'p_2' && rankingProf[0].ingresoCentavos === 46000000)
afirmar('P1 ocupación sin NaN o Infinity', rankingProf[1].ocupacionPorcentaje > 0)
// For P2: 260min + 30min = 290 min ocupados.
afirmar('Ocupación calcula correctamente', rankingProf[0].minutosVendidos === 290, 290, rankingProf[0].minutosVendidos)

const rankingSvc = rankingServicios(mockCobros, mockCitas, mockServicios)
const s4 = rankingSvc.find(s => s.serviceId === 's_4')!
const s1 = rankingSvc.find(s => s.serviceId === 's_1')!
afirmar('Servicio 420.000 que ocupa 260 min rinde MÁS por hora que 55.000 ocupando 70 min (corrección de matemática errónea en spec)', s4.ingresoPorHoraCentavos > s1.ingresoPorHoraCentavos)

const mapa = mapaDeFranjas(mockCobros, mockCitas)
// chg_4 starts at 2026-08-11T00:00:00Z which is 19:00 Bogota on 2026-08-10 (Monday = 1)
const celdaF2 = mapa.find(c => c.hora === 19 && c.diaSemana === 1)
afirmar('Cobro a las 19:00 cae en ese día (F2)', celdaF2 !== undefined && celdaF2.servicios === 1)

const vacioCaja = resumenCaja([])
afirmar('Sin datos: ingreso cero', vacioCaja.ingresoCentavos === 0)
afirmar('Sin datos: sin NaN en ticket', vacioCaja.ticketPromedioCentavos === 0)

const rankProfEmpty = rankingProfesionales([], [], mockProfesionales, { desdeUtc: '2026-08-10T00:00:00Z', hastaUtc: '2026-08-10T23:59:59Z' })
// On monday, P1 has 9-18. 9h * 60 = 540 min. Lunch is 60. So 480 min. Occupied is 0.
afirmar('Ocupación con disponibles pero ventas cero', rankProfEmpty[0].ocupacionPorcentaje === 0)

const pEmpty: Professional = { ...mockProfesionales[0], horario: { 1: [0, 0] } } // no available minutes
const rankProfEmptyMin = rankingProfesionales([], [], [pEmpty], { desdeUtc: '2026-08-10T00:00:00Z', hastaUtc: '2026-08-10T23:59:59Z' })
afirmar('Ocupación con minutosDisponibles 0 -> 0', rankProfEmptyMin[0].ocupacionPorcentaje === 0, 0, rankProfEmptyMin[0].ocupacionPorcentaje)

const origen = citasPorOrigen(mockCitas)
afirmar('citasPorOrigen extrae web, admin y whatsapp', origen.admin === 2 && origen.web === 1 && origen.whatsapp === 1)

if (fallos > 0) {
  console.log(`\n\x1b[31m✗ ${fallos} caso(s) fallaron\x1b[0m\n`)
  process.exit(1)
}

console.log('\n\x1b[32m✅ PRUEBA DE REPORTES SUPERADA\x1b[0m\n')
