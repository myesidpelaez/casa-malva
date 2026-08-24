/**
 * Gate de la Spec 30 contra Cloud Firestore: **fusionar no pierde historial.**
 *
 * `prueba-personas.ts` cubre en puro los nombres y la detección de duplicadas. Lo que no
 * puede cubrir ningún test puro es lo único irreversible de esta spec: que al unir dos
 * fichas, **todas** las citas y cobros de la absorbida acaben en la superviviente, que la
 * absorbida quede marcada y no borrada, y que el teléfono viejo siga encontrándola.
 *
 * Aquí se mueven datos de personas reales entre documentos: es lo último que puede quedarse
 * sin gate. Es el que el plano reservó al arquitecto.
 *
 * Ejecutar:  npm run prueba:fusion-nube   (necesita credenciales de Firestore)
 */
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { docSet, docDelete, docGet } from '../src/lib/db'
import { fusionarClientas } from '../src/lib/fusion'
import type { Client } from '../src/types'

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
  console.log('\n👥 Fusionar dos fichas no pierde historial — contra Cloud Firestore\n')


  const s = Date.now()
  const idViva = `cli_prueba_viva_${s}`
  const idMuere = `cli_prueba_muere_${s}`
  const idCita = `apt_prueba_fusion_${s}`
  const idCobro = `chg_prueba_fusion_${s}`

  // Dos fichas de la MISMA persona, con teléfonos distintos: el caso real que parte el
  // historial en dos sin que nadie lo note.
  await docSet('clients', idViva, {
    id: idViva, nombre: 'Camila Restrepo', telefonoE164: '+573001110001',
    creadaEn: new Date().toISOString(),
  } as unknown as Record<string, unknown>)
  await docSet('clients', idMuere, {
    id: idMuere, nombre: 'Camila Restrepo', telefonoE164: '+573002220002',
    creadaEn: new Date().toISOString(),
  } as unknown as Record<string, unknown>)

  // Historial colgando de la que va a morir.
  await docSet('appointments', idCita, {
    id: idCita, clientId: idMuere, professionalId: 'pro_x', serviceId: 'srv_x',
    inicioUtc: new Date().toISOString(), finUtc: new Date().toISOString(),
    duracionTotalMin: 50, estado: 'completada', origen: 'admin',
    precioCentavos: 5500000, creadaPor: 'prueba', historial: [],
  } as unknown as Record<string, unknown>)
  await docSet('charges', idCobro, {
    id: idCobro, appointmentId: idCita, clientId: idMuere, professionalId: 'pro_x',
    serviceId: 'srv_x', fechaUtc: new Date().toISOString(),
    precioListaCentavos: 5500000, descuentoCentavos: 0, cobradoCentavos: 5500000,
    propinaCentavos: 0, metodoPago: 'nequi', cobradoPor: 'prueba',
  } as unknown as Record<string, unknown>)

  const res = await fusionarClientas(idViva, idMuere)
  comprobar(res.ok, 'la fusión se completa', JSON.stringify(res))

  const cita = await docGet<{ clientId: string }>('appointments', idCita)
  comprobar(cita?.clientId === idViva, 'la cita quedó apuntando a la ficha que sobrevive', `clientId: ${cita?.clientId}`)

  const cobro = await docGet<{ clientId: string }>('charges', idCobro)
  comprobar(cobro?.clientId === idViva, 'el cobro también se movió — el dinero no se queda huérfano', `clientId: ${cobro?.clientId}`)

  const muerta = await docGet<Client>('clients', idMuere)
  comprobar(!!muerta, 'la ficha absorbida NO se borró: hay marcha atrás')
  comprobar(muerta?.fusionadaEn === idViva, 'la absorbida quedó marcada con `fusionadaEn`')

  const viva = await docGet<Client>('clients', idViva)
  comprobar(
    (viva?.telefonosAlternativos || []).includes('+573002220002'),
    'el teléfono viejo sigue encontrándola',
    `alternativos: ${JSON.stringify(viva?.telefonosAlternativos)}`
  )

  // Repetir la fusión no puede volver a moverlo todo.
  const otraVez = await fusionarClientas(idViva, idMuere)
  comprobar(!otraVez.ok && otraVez.error === 'ya_fusionada', 'fusionar dos veces se rechaza', JSON.stringify(otraVez))

  // Limpieza: esto corre contra la base del demo, no puede dejar rastro.
  console.log(`${GRIS}\n  Limpieza…${FIN}`)
  await docDelete('charges', idCobro)
  await docDelete('appointments', idCita)
  await docDelete('clients', idViva)
  await docDelete('clients', idMuere)
  // Por id, no por consulta: una búsqueda por nombre + fecha exigiría un índice compuesto
  // en `clients` que solo existiría para esta comprobación.
  const restos = await Promise.all([
    docGet('clients', idViva),
    docGet('clients', idMuere),
    docGet('appointments', idCita),
    docGet('charges', idCobro),
  ])
  comprobar(restos.every((d) => d === null), 'la base queda como estaba')

  if (fallos > 0) {
    console.log(`\n${ROJO}✗ ${fallos} comprobación(es) fallaron${FIN}\n`)
    process.exit(1)
  }
  console.log(`\n${VERDE}✓ Fusionar no pierde historial${FIN}\n`)
}

main().catch((err) => {
  console.error(`${ROJO}Error en la prueba de fusión:${FIN}`, err)
  process.exit(1)
})
