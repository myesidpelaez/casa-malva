import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { getServices, getProfessionals, getDb, lecturasRealizadas, reiniciarContadorLecturas, getAppointmentsEnRango } from '../src/lib/db'
import { crearCitaAction } from '../src/actions/citas'
import { planificarSlots } from '../src/lib/ocupacion'
import { franjasDisponibles } from '../src/lib/disponibilidad'
import type { Appointment } from '../src/types'

const VERDE = '\x1b[32m'
const ROJO = '\x1b[31m'
const GRIS = '\x1b[90m'
const FIN = '\x1b[0m'

const creadas: string[] = []
let fallos = 0
const estadoInicial = { citas: 0, slots: 0 }

function comprobar(nombre: string, condicion: boolean, detalle = '') {
  if (condicion) {
    console.log(`  ${VERDE}✓${FIN} ${nombre}`)
  } else {
    fallos++
    console.log(`  ${ROJO}✗ ${nombre}${FIN}${detalle ? `\n    ${GRIS}${detalle}${FIN}` : ''}`)
  }
}

async function limpiar() {
  const db = getDb()
  const batch = db.batch()

  if (creadas.length > 0) {
    for (const id of creadas) {
      const snap = await db.collection('appointments').doc(id).get()
      if (snap.exists) {
        const data = snap.data() as Appointment
        if (data) {
          const plan = planificarSlots(data, { ...data, estado: 'cancelada' }, data.duracionTotalMin || 60)
          plan.borrar.forEach(slotId => batch.delete(db.collection('slots').doc(slotId)))
        }
        batch.delete(db.collection('appointments').doc(id))
      }
    }
  }

  const snapClean = await db.collection('appointments').where('_pruebaLecturas', '==', true).get()
  for (const d of snapClean.docs) {
    batch.delete(d.ref)
  }

  const clientsSnap = await db
    .collection('clients')
    .where('telefonoE164', 'in', ['+573000000001', '+573000000002'])
    .get()
  for (const doc of clientsSnap.docs) {
    batch.delete(doc.ref)
  }

  await batch.commit()
  console.log(`\n${GRIS}  Limpieza: documentos creados eliminados en Firestore${FIN}`)
}

async function main() {
  console.log('\n🔒 Prueba de costo de lecturas (Firestore) — Casa Malva\n')
  const db = getDb()

  estadoInicial.citas = (await db.collection('appointments').count().get()).data().count
  estadoInicial.slots = (await db.collection('slots').count().get()).data().count

  console.log(`${GRIS}  Estado inicial: ${estadoInicial.citas} citas, ${estadoInicial.slots} slots${FIN}\n`)

  const services = await getServices()
  const professionals = await getProfessionals()

  const prof = professionals.find(p => p.activo && p.serviceIds && p.serviceIds.length > 0)
  if (!prof) {
    throw new Error('No hay profesionales activas con servicios')
  }
  const profId = prof.id
  const svcId = prof.serviceIds[0]
  const svc = services.find(s => s.id === svcId)
  if (!svc) {
    throw new Error('Servicio no encontrado')
  }

  const hoyStr = new Date().toISOString()
  const finStr = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString()
  const citasActuales = await getAppointmentsEnRango(hoyStr, finStr, prof.id)

  const cuposValidos: Date[] = []
  for (let i = 1; i <= 20 && cuposValidos.length < 2; i++) {
    const dia = new Date()
    dia.setDate(dia.getDate() + i)
    dia.setHours(0, 0, 0, 0)
    const libres = franjasDisponibles(svc.id, prof.id, dia, citasActuales, services, professionals)
    if (libres.length > 0) {
      cuposValidos.push(libres[0])
    }
  }

  if (cuposValidos.length < 2) {
    throw new Error('No se encontraron suficientes cupos libres en días distintos')
  }

  const cupo1 = cuposValidos[0]
  const cupo2 = cuposValidos[1]

  // Cita 1
  reiniciarContadorLecturas()
  const res1 = await crearCitaAction({
    professionalId: profId,
    serviceId: svcId,
    inicioUtc: cupo1.toISOString(),
    origen: 'web',
    creadaPor: 'pruebas',
    clienteNombre: 'Test Cliente Uno',
    clienteTelefono: '3000000001'
  })
  
  if (!res1.ok) {
    throw new Error('Fallo al crear la cita 1: ' + res1.error)
  }
  creadas.push(res1.data.id)
  const L1 = lecturasRealizadas()
  console.log(`  Paso 1: L1 = ${L1} lecturas.`)

  // Sembrar 200 citas
  console.log(`  ${GRIS}Sembrando 200 citas de prueba...${FIN}`)
  const batchSize = 50
  for (let i = 0; i < 200; i += batchSize) {
    const batch = db.batch()
    for (let j = 0; j < batchSize; j++) {
      const idx = i + j
      const ref = db.collection('appointments').doc(`test_lecturas_${idx}`)
      batch.set(ref, {
        id: `test_lecturas_${idx}`,
        professionalId: profId,
        serviceId: svcId,
        inicioUtc: `2027-01-01T10:${String(idx%60).padStart(2, '0')}:00Z`,
        _pruebaLecturas: true,
        estado: 'agendada',
        duracionTotalMin: 50
      })
    }
    await batch.commit()
  }

  // Cita 2
  reiniciarContadorLecturas()
  const res2 = await crearCitaAction({
    professionalId: profId,
    serviceId: svcId,
    inicioUtc: cupo2.toISOString(),
    origen: 'web',
    creadaPor: 'pruebas',
    clienteNombre: 'Test Cliente Dos',
    clienteTelefono: '3000000002'
  })

  if (!res2.ok) {
    throw new Error('Fallo al crear la cita 2: ' + res2.error)
  }
  creadas.push(res2.data.id)
  const L2 = lecturasRealizadas()
  
  console.log(`  Paso 3: L2 = ${L2} lecturas.`)
  console.log(`  L1 = ${L1} lecturas · L2 = ${L2} lecturas · crecimiento ${(((L2 - L1) / L1) * 100).toFixed(1)}%\n`)

  comprobar('el costo se mantuvo constante o creció marginalmente', L2 < L1 * 1.5, `L1=${L1}, L2=${L2}`)
}

main()
  .catch((err) => {
    fallos++
    console.error(`\n${ROJO}Error inesperado:${FIN}`, err)
  })
  .finally(async () => {
    await limpiar()

    const db = getDb()
    const citasDespues = (await db.collection('appointments').count().get()).data().count
    const slotsDespues = (await db.collection('slots').count().get()).data().count

    console.log(`${GRIS}  Estado final: ${citasDespues} citas, ${slotsDespues} slots${FIN}\n`)

    comprobar(
      'los conteos de base de datos volvieron a su estado inicial',
      estadoInicial.citas === citasDespues && estadoInicial.slots === slotsDespues,
      `citas: ${estadoInicial.citas}/${citasDespues} | slots: ${estadoInicial.slots}/${slotsDespues}`
    )

    if (fallos > 0) {
      console.log(`\n${ROJO}✗ ${fallos} comprobación(es) fallidas${FIN}\n`)
      process.exit(1)
    }
    console.log(`\n${VERDE}✓ Todas las comprobaciones pasaron en Cloud Firestore${FIN}\n`)
  })
