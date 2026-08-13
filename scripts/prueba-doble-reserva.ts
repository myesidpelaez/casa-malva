/**
 * Prueba del gate de DONE: **dos reservas sobre el mismo cupo, solo una vive.**
 *
 * Ejercita la Server Action real (`crearCitaAction`) contra Cloud Firestore
 * validando la técnica de slots atómica y transaccional (firestore-modelado §2).
 *
 * Ejecutar:  npm run verificar:nube   (necesita credenciales de Firestore)
 */
// Carga `.env.local` igual que lo hace Next. Sin esto el script no ve
// GOOGLE_APPLICATION_CREDENTIALS y falla con "Could not load the default credentials"
// aunque el `.env.local` esté bien puesto.
//
// En ESM los `import` de abajo se evalúan ANTES que esta llamada. Es correcto igualmente
// porque `getDb()` lee `process.env` dentro de la función, no al cargar `db.ts`.
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { crearCitaAction } from '../src/actions/citas'
import { getDb, getProfessionals, getServices, getAppointmentsEnRango } from '../src/lib/db'
import { planificarSlots } from '../src/lib/ocupacion'
import { franjasDisponibles } from '../src/lib/disponibilidad'

const VERDE = '\x1b[32m'
const ROJO = '\x1b[31m'
const GRIS = '\x1b[90m'
const FIN = '\x1b[0m'

const creadas: string[] = []
let fallos = 0

function comprobar(nombre: string, condicion: boolean, detalle = '') {
  if (condicion) {
    console.log(`  ${VERDE}✓${FIN} ${nombre}`)
  } else {
    fallos++
    console.log(`  ${ROJO}✗ ${nombre}${FIN}${detalle ? `\n    ${GRIS}${detalle}${FIN}` : ''}`)
  }
}

async function main() {
  console.log('\n🔒 Prueba anti-doble-reserva (Firestore) — Casa Malva\n')

  const servicios = await getServices()
  const equipo = await getProfessionals()

  // Servicio y profesional que de verdad se puedan combinar.
  const prof = equipo.find((p) => p.activo && p.serviceIds.length > 0)
  if (!prof) throw new Error('No hay profesionales activas con servicios asignados')
  const svc = servicios.find((s) => s.activo && prof.serviceIds.includes(s.id))
  if (!svc) throw new Error('No hay servicio activo para esa profesional')

  const hoyStr = new Date().toISOString()
  const finStr = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString()
  const citasActuales = await getAppointmentsEnRango(hoyStr, finStr, prof.id)

  // Primer cupo libre a partir de mañana (evita el mínimo de antelación).
  let cupo: Date | null = null
  for (let i = 1; i <= 20 && !cupo; i++) {
    const dia = new Date()
    dia.setDate(dia.getDate() + i)
    dia.setHours(0, 0, 0, 0)
    const libres = franjasDisponibles(svc.id, prof.id, dia, citasActuales, servicios, equipo)
    if (libres.length > 0) cupo = libres[0]
  }
  if (!cupo) throw new Error('No se encontró ningún cupo libre en 20 días')

  console.log(
    `${GRIS}  Escenario: ${svc.nombre} con ${prof.nombre}\n` +
      `  Cupo en disputa: ${cupo.toISOString()}${FIN}\n`
  )

  const peticion = {
    serviceId: svc.id,
    professionalId: prof.id,
    inicioUtc: cupo.toISOString(),
    origen: 'web' as const,
    creadaPor: 'prueba_doble_reserva',
  }

  // --- Las dos clientas piden el mismo cupo simultáneamente -----------------
  const [primera, segunda] = await Promise.all([
    crearCitaAction({ ...peticion, clienteNombre: 'Prueba Uno', clienteTelefono: '3001110001' }),
    crearCitaAction({ ...peticion, clienteNombre: 'Prueba Dos', clienteTelefono: '3001110002' }),
  ])

  if (primera.ok) creadas.push(primera.data.id)
  if (segunda.ok) creadas.push(segunda.data.id)

  const ganadoras = [primera, segunda].filter((r) => r.ok)
  const perdedoras = [primera, segunda].filter((r) => !r.ok)

  comprobar(
    'exactamente una de las dos reservas sobrevive',
    ganadoras.length === 1,
    `sobrevivieron ${ganadoras.length}: ${JSON.stringify([primera, segunda])}`
  )

  comprobar(
    'la rechazada informa "cupo_ocupado"',
    perdedoras.length === 1 && !perdedoras[0].ok && perdedoras[0].error === 'cupo_ocupado',
    `error recibido: ${perdedoras.map((p) => (!p.ok ? p.error : '')).join(', ')}`
  )

  comprobar(
    'la rechazada ofrece horas alternativas',
    perdedoras.length === 1 && !perdedoras[0].ok && (perdedoras[0].alternativas?.length ?? 0) > 0,
    'no llegaron alternativas'
  )

  // --- En Firestore hay UNA sola cita en ese instante ----------------------
  const citasTrasReserva = await getAppointmentsEnRango(
    cupo!.toISOString(),
    new Date(cupo!.getTime() + 24 * 3600 * 1000).toISOString(),
    prof.id
  )
  const enEseCupo = citasTrasReserva.filter(
    (a) =>
      a.professionalId === prof.id &&
      a.inicioUtc === cupo!.toISOString() &&
      a.estado !== 'cancelada' &&
      a.estado !== 'no_asistio'
  )
  comprobar(
    'en Firestore queda una sola cita viva en ese cupo',
    enEseCupo.length === 1,
    `hay ${enEseCupo.length}`
  )

  // --- Un tercer intento sobre el mismo cupo también se rechaza ------------
  const tercera = await crearCitaAction({
    ...peticion,
    clienteNombre: 'Prueba Tres',
    clienteTelefono: '3001110003',
  })
  if (tercera.ok) creadas.push(tercera.data.id)
  comprobar(
    'un intento posterior sobre el mismo cupo se rechaza',
    !tercera.ok && tercera.error === 'cupo_ocupado'
  )

  // --- El cupo ya no se ofrece como libre ---------------------------------
  const libresAhora = franjasDisponibles(
    svc.id,
    prof.id,
    cupo,
    await getAppointmentsEnRango(
      cupo!.toISOString(),
      new Date(cupo!.getTime() + 24 * 3600 * 1000).toISOString(),
      prof.id
    ),
    servicios,
    equipo
  )
  comprobar(
    'el cupo desaparece de la lista de horas libres',
    !libresAhora.some((f) => f.getTime() === cupo!.getTime())
  )
}

async function limpiar() {
  if (creadas.length === 0) return
  const db = getDb()
  const batch = db.batch()

  for (const id of creadas) {
    const snap = await db.collection('appointments').doc(id).get()
    if (snap.exists) {
      const data = snap.data() as import('../src/types').Appointment
      if (data) {
        const plan = planificarSlots(data, { ...data, estado: 'cancelada' }, data.duracionTotalMin || 60)
        plan.borrar.forEach(id => batch.delete(db.collection('slots').doc(id)))
      }
      batch.delete(db.collection('appointments').doc(id))
    }
  }

  const clientsSnap = await db
    .collection('clients')
    .where('telefonoE164', 'in', ['+573001110001', '+573001110002', '+573001110003'])
    .get()

  for (const doc of clientsSnap.docs) {
    batch.delete(doc.ref)
  }

  await batch.commit()
  console.log(`\n${GRIS}  Limpieza: ${creadas.length} cita(s) de prueba eliminadas en Firestore${FIN}`)
}

main()
  .catch((err) => {
    fallos++
    console.error(`\n${ROJO}Error inesperado:${FIN}`, err)
  })
  .finally(async () => {
    await limpiar()
    if (fallos > 0) {
      console.log(`\n${ROJO}✗ ${fallos} comprobación(es) fallidas${FIN}\n`)
      process.exit(1)
    }
    console.log(`\n${VERDE}✓ Todas las comprobaciones pasaron en Cloud Firestore${FIN}\n`)
  })
