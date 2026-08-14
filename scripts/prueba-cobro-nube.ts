/**
 * Gate de la Spec 24 contra Cloud Firestore: **una cita se cobra una sola vez.**
 *
 * La aritmética del cobro ya la cubre `prueba-cobros.ts` en puro. Lo que no puede cubrir
 * ningún test puro es la garantía que de verdad protege la caja: que dos intentos de
 * cobrar la misma cita —doble clic, reintento de red, dos pestañas abiertas— produzcan
 * **un** documento en `charges` y no dos.
 *
 * Esa garantía vive en la transacción de `aplicarCambioDeCita`, así que se prueba contra
 * Firestore real. Es el gate que el plano reservó al arquitecto.
 *
 * Ejecutar:  npm run prueba:cobro-nube   (necesita credenciales de Firestore)
 */
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { getDb, aplicarCambioDeCita, docDelete } from '../src/lib/db'
import { planificarSlots } from '../src/lib/ocupacion'
import { calcularCobro, idCobro } from '../src/lib/cobros'
import type { Appointment, Charge } from '../src/types'

const VERDE = '\x1b[32m'
const ROJO = '\x1b[31m'
const GRIS = '\x1b[90m'
const FIN = '\x1b[0m'

let fallos = 0

function comprobar(condicion: boolean, descripcion: string, detalle?: string) {
  if (condicion) {
    console.log(`  ${VERDE}✓${FIN} ${descripcion}`)
  } else {
    console.log(`  ${ROJO}✗ ${descripcion}${FIN}`)
    if (detalle) console.log(`      ${detalle}`)
    fallos++
  }
}

async function main() {
  console.log('\n💰 Un cobro por cita — contra Cloud Firestore\n')

  const db = getDb()
  const sufijo = Date.now()
  const citaId = `apt_prueba_cobro_${sufijo}`
  const profId = `pro_prueba_${sufijo}`
  const chargeId = idCobro(citaId)

  // Una cita de laboratorio, con profesional propio para no chocar con la agenda real.
  const inicio = new Date(Date.now() + 48 * 3600 * 1000)
  const cita: Appointment = {
    id: citaId,
    clientId: 'cli_prueba',
    professionalId: profId,
    serviceId: 'srv_prueba',
    inicioUtc: inicio.toISOString(),
    finUtc: new Date(inicio.getTime() + 50 * 60 * 1000).toISOString(),
    duracionTotalMin: 50,
    estado: 'confirmada',
    origen: 'admin',
    precioCentavos: 5500000,
    creadaPor: 'prueba',
    googleEventId: null,
    historial: [],
  }

  const planReserva = planificarSlots(null, cita, cita.duracionTotalMin)
  const reserva = await aplicarCambioDeCita(cita, planReserva)
  comprobar(reserva.ok, 'la cita de laboratorio queda agendada')

  // El cobro, calculado con el módulo real: 55.000 con 5.000 de descuento y 10.000 de propina.
  const calculo = calcularCobro({
    precioListaCentavos: cita.precioCentavos,
    descuentoCentavos: 500000,
    propinaCentavos: 1000000,
  })
  if (!calculo.ok) throw new Error('el cálculo del cobro falló, revisa prueba-cobros')

  const cobro: Charge = {
    id: chargeId,
    appointmentId: citaId,
    clientId: cita.clientId,
    professionalId: cita.professionalId,
    serviceId: cita.serviceId,
    fechaUtc: new Date().toISOString(),
    precioListaCentavos: cita.precioCentavos,
    descuentoCentavos: 500000,
    cobradoCentavos: calculo.cobradoCentavos,
    propinaCentavos: 1000000,
    metodoPago: 'nequi',
    cobradoPor: 'prueba',
  }

  const completada: Appointment = { ...cita, estado: 'completada' }
  const plan = planificarSlots(cita, completada, completada.duracionTotalMin)

  // 1. Primer cobro: debe entrar.
  const primero = await aplicarCambioDeCita(completada, plan, cobro)
  comprobar(primero.ok, 'el primer cobro se registra')

  // 2. Segundo cobro de la MISMA cita: debe rebotar.
  const segundo = await aplicarCambioDeCita(completada, plan, cobro)
  comprobar(
    !segundo.ok && segundo.error === 'ya_cobrada',
    'el segundo cobro de la misma cita se rechaza con `ya_cobrada`',
    `recibido: ${JSON.stringify(segundo)}`
  )

  // 3. Y lo que de verdad importa: en la caja hay UN documento, no dos.
  const docs = await db.collection('charges').where('appointmentId', '==', citaId).get()
  comprobar(docs.size === 1, 'queda exactamente 1 cobro en la caja', `encontrados: ${docs.size}`)

  // 4. El dinero guardado es el correcto y la propina NO engordó el ingreso.
  const guardado = docs.docs[0]?.data() as Charge | undefined
  comprobar(
    guardado?.cobradoCentavos === 5000000,
    'el ingreso guardado son $50.000 (55.000 − 5.000 de descuento)',
    `recibido: ${guardado?.cobradoCentavos}`
  )
  comprobar(
    guardado?.propinaCentavos === 1000000,
    'la propina se guarda aparte, sin sumarse al ingreso'
  )

  // Limpieza: esto corre contra la base del demo, no puede dejar rastro.
  console.log(`${GRIS}\n  Limpieza…${FIN}`)
  await docDelete('charges', chargeId)
  await docDelete('appointments', citaId)
  for (const slotId of [...planReserva.crear, ...plan.crear]) {
    await docDelete('slots', slotId)
  }
  const quedan = await db.collection('charges').where('appointmentId', '==', citaId).get()
  comprobar(quedan.empty, 'la base queda como estaba')

  if (fallos > 0) {
    console.log(`\n${ROJO}✗ ${fallos} comprobación(es) fallaron${FIN}\n`)
    process.exit(1)
  }
  console.log(`\n${VERDE}✓ Una cita se cobra una sola vez${FIN}\n`)
}

main().catch((err) => {
  console.error(`${ROJO}Error en la prueba de cobro:${FIN}`, err)
  process.exit(1)
})
