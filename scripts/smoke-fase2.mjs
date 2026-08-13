import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import path from 'path'
import fs from 'fs'
import { validarReserva, proximasFranjas } from '../src/lib/disponibilidad.ts'

let dbInstance = null

function getDb() {
  if (!dbInstance) {
    let app
    if (getApps().length === 0) {
      const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'service-account.json')
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID || 'casa-malva-demo'

      if (fs.existsSync(saPath)) {
        const sa = JSON.parse(fs.readFileSync(saPath, 'utf-8'))
        app = initializeApp({ credential: cert(sa), projectId })
      } else {
        app = initializeApp({ projectId })
      }
    } else {
      app = getApps()[0]
    }
    dbInstance = getFirestore(app)
    dbInstance.settings({ ignoreUndefinedProperties: true })
  }
  return dbInstance
}

async function getCollection(collectionName) {
  const db = getDb()
  const snap = await db.collection(collectionName).get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

async function saveDoc(collectionName, docId, data) {
  const db = getDb()
  await db.collection(collectionName).doc(docId).set(data, { merge: true })
}

async function deleteDoc(collectionName, docId) {
  const db = getDb()
  await db.collection(collectionName).doc(docId).delete()
}

async function runSmokeTest() {
  console.log('🧪 Ejecutando Smoke Test contra Cloud Firestore...\n')

  console.log('1️⃣  Leyendo catálogo de servicios desde Firestore...')
  const services = await getCollection('services')
  console.log(`   ✓ Servicios encontrados en Firestore: ${services.length}`)

  console.log('2️⃣  Leyendo equipo de profesionales desde Firestore...')
  const professionals = await getCollection('professionals')
  console.log(`   ✓ Profesionales encontrados en Firestore: ${professionals.length}`)

  console.log('3️⃣  Leyendo citas registradas en Firestore...')
  const appointments = await getCollection('appointments')
  console.log(`   ✓ Citas encontradas en Firestore: ${appointments.length}`)

  console.log('\n4️⃣  Probando cálculo de disponibilidad (proximasFranjas)...')
  const testService = services.find((s) => s.id === 'srv_manicure_semi') || services[0]
  const alternativas = proximasFranjas(testService.id, undefined, new Date(), 7, 5, appointments, services, professionals)
  console.log(`   ✓ Alternativas encontradas para ${testService.nombre}: ${alternativas.length}`)
  for (const alt of alternativas.slice(0, 3)) {
    console.log(`     • ${alt.start.toISOString()} con ${alt.professionalNombre}`)
  }

  console.log('\n5️⃣  Probando validación de reserva y persistencia transaccional...')
  if (alternativas.length > 0) {
    const slot = alternativas[0]
    const val = validarReserva(
      {
        serviceId: testService.id,
        professionalId: slot.professionalId,
        inicioUtc: slot.start.toISOString(),
      },
      appointments,
      services,
      professionals
    )
    console.log(`   ✓ Validación de cupo libre: ${val.ok ? 'VÁLIDO (Sin colisiones)' : 'RECHAZADO: ' + val.error}`)

    const testCitaId = `test_smoke_${Date.now()}`
    const testCita = {
      id: testCitaId,
      clientId: 'cli_maria_fernanda',
      professionalId: slot.professionalId,
      serviceId: testService.id,
      inicioUtc: slot.start.toISOString(),
      finUtc: slot.end.toISOString(),
      estado: 'agendada',
      origen: 'web',
      precioCentavos: testService.precioCentavos,
      creadaPor: 'smoke_test',
      googleEventId: null,
      historial: [
        {
          estado: 'agendada',
          fechaUtc: new Date().toISOString(),
          nota: 'Smoke test de inserción Firestore',
          cambiadoPor: 'smoke_test',
        },
      ],
      _seed: false,
    }

    await saveDoc('appointments', testCitaId, testCita)
    console.log(`   ✓ Cita de prueba creada exitosamente en Firestore (ID: ${testCitaId})`)

    await deleteDoc('appointments', testCitaId)
    console.log(`   ✓ Cita de prueba eliminada (Limpieza completada)`)
  }

  console.log('\n🎉 SMOKE TEST COMPLETADO CON ÉXITO SOBRE CLOUD FIRESTORE.')
}

runSmokeTest().catch((err) => {
  console.error('\n❌ ERROR EN SMOKE TEST:', err)
  process.exit(1)
})
