import { getServices, getProfessionals, docSet, getDb, lecturasRealizadas, reiniciarContadorLecturas } from '../src/lib/db'
import { crearCitaAction } from '../src/actions/citas'
import type { Appointment } from '../src/types'

async function run() {
  console.log('--- Iniciando prueba de lecturas ---')
  const db = getDb()
  const services = await getServices()
  const professionals = await getProfessionals()

  const prof = professionals.find(p => p.serviceIds && p.serviceIds.length > 0)
  if (!prof) {
    throw new Error('No hay profesionales con servicios')
  }
  const profId = prof.id
  const svcId = prof.serviceIds[0]

  // Limpiar posibles citas de la prueba anterior
  const snapToClean = await db.collection('appointments').where('_seed', '==', true).get()
  for (const d of snapToClean.docs) {
    await d.ref.delete()
  }

  // Cita 1
  reiniciarContadorLecturas()
  const res1 = await crearCitaAction({
    professionalId: profId,
    serviceId: svcId,
    inicioUtc: '2026-08-25T17:00:00Z',
    origen: 'web',
    creadaPor: 'pruebas',
    clienteNombre: 'Test Cliente',
    clienteTelefono: '3000000001'
  })
  
  if (!res1.ok) {
    throw new Error('Fallo al crear la cita 1: ' + res1.error)
  }
  const L1 = lecturasRealizadas()
  const cita1Id = res1.data.id

  console.log(`Paso 1: L1 = ${L1} lecturas.`)

  // Sembrar 200 citas
  console.log('Paso 2: Sembrando 200 citas de prueba...')
  const batchSize = 50
  for (let i = 0; i < 200; i += batchSize) {
    const batch = db.batch()
    for (let j = 0; j < batchSize; j++) {
      const idx = i + j
      const ref = db.collection('appointments').doc(`test_seed_${idx}`)
      batch.set(ref, {
        id: `test_seed_${idx}`,
        professionalId: profId,
        serviceId: svcId,
        inicioUtc: `2027-01-01T10:${String(idx%60).padStart(2, '0')}:00Z`,
        _seed: true,
        estado: 'programada'
      })
    }
    await batch.commit()
  }

  // Cita 2
  reiniciarContadorLecturas()
  const res2 = await crearCitaAction({
    professionalId: profId,
    serviceId: svcId,
    inicioUtc: '2026-08-25T19:00:00Z',
    origen: 'web',
    creadaPor: 'pruebas',
    clienteNombre: 'Test Cliente',
    clienteTelefono: '3000000002'
  })

  if (!res2.ok) {
    throw new Error('Fallo al crear la cita 2: ' + res2.error)
  }
  const L2 = lecturasRealizadas()
  const cita2Id = res2.data.id
  
  console.log(`Paso 3: L2 = ${L2} lecturas.`)
  console.log(`L1 = ${L1} lecturas · L2 = ${L2} lecturas · crecimiento ${(((L2 - L1) / L1) * 100).toFixed(1)}%`)

  // Limpiar
  console.log('Paso 5: Limpiando...')
  await db.collection('appointments').doc(cita1Id).delete()
  await db.collection('appointments').doc(cita2Id).delete()
  
  const snapClean = await db.collection('appointments').where('_seed', '==', true).get()
  const bClean = db.batch()
  for (const d of snapClean.docs) {
    bClean.delete(d.ref)
  }
  await bClean.commit()

  // Verify
  if (L2 >= L1 * 1.5) {
    console.error(`FALLO: El costo creció con la historia. L1=${L1}, L2=${L2}`)
    process.exit(1)
  }

  console.log('EXITO: El costo se mantuvo constante o creció marginalmente.')
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
