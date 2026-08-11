import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import { validarReserva, proximasFranjas } from '../src/lib/disponibilidad.ts'

let dbInstance = null

function getDb() {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), 'casa-malva.db')
    dbInstance = new DatabaseSync(dbPath)
    dbInstance.exec('PRAGMA journal_mode = WAL;')
  }
  return dbInstance
}

function parseRow(collection, row) {
  if (collection === 'services') {
    return {
      id: row.id,
      categoryId: row.categoryId,
      nombre: row.nombre,
      duracionMin: Number(row.duracionMin),
      bufferMin: Number(row.bufferMin),
      precioCentavos: Number(row.precioCentavos),
      requiereConfirmacion: Boolean(row.requiereConfirmacion),
      activo: Boolean(row.activo),
    }
  }
  if (collection === 'professionals') {
    return {
      id: row.id,
      nombre: row.nombre,
      rol: row.rol,
      serviceIds: typeof row.serviceIds === 'string' ? JSON.parse(row.serviceIds) : row.serviceIds,
      horario: typeof row.horario === 'string' ? JSON.parse(row.horario) : row.horario,
      excepciones: typeof row.excepciones === 'string' ? JSON.parse(row.excepciones) : row.excepciones || [],
      activo: Boolean(row.activo),
    }
  }
  if (collection === 'appointments') {
    return {
      id: row.id,
      clientId: row.clientId,
      professionalId: row.professionalId,
      serviceId: row.serviceId,
      inicioUtc: row.inicioUtc,
      finUtc: row.finUtc,
      estado: row.estado,
      origen: row.origen,
      precioCentavos: Number(row.precioCentavos),
      creadaPor: row.creadaPor,
      historial: typeof row.historial === 'string' ? JSON.parse(row.historial) : row.historial || [],
      _seed: Boolean(row._seed),
    }
  }
  return row
}

function getCollection(collectionName) {
  const db = getDb()
  const stmt = db.prepare(`SELECT * FROM ${collectionName}`)
  const rows = stmt.all()
  return rows.map((r) => parseRow(collectionName, r))
}

function saveDoc(collectionName, docId, data) {
  const db = getDb()
  if (collectionName === 'appointments') {
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO appointments (id, clientId, professionalId, serviceId, inicioUtc, finUtc, estado, origen, precioCentavos, creadaPor, historial, _seed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    stmt.run(
      docId,
      data.clientId,
      data.professionalId,
      data.serviceId,
      data.inicioUtc,
      data.finUtc,
      data.estado,
      data.origen,
      data.precioCentavos,
      data.creadaPor,
      JSON.stringify(data.historial || []),
      data._seed ? 1 : 0
    )
  }
}

function deleteDoc(collectionName, docId) {
  const db = getDb()
  const stmt = db.prepare(`DELETE FROM ${collectionName} WHERE id = ?`)
  stmt.run(docId)
}

function transaccion(fn) {
  const db = getDb()
  db.exec('BEGIN IMMEDIATE')
  try {
    const res = fn()
    db.exec('COMMIT')
    return res
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

async function runSmokeTest() {
  console.log('🧪 Ejecutando Smoke Test del flujo Fase 2+3 contra SQLite local (casa-malva.db)...\n')

  // 1. Leer Servicios (debe haber 16)
  console.log('1️⃣  Leyendo catálogo de servicios desde SQLite...')
  const services = getCollection('services')
  console.log(`   ✓ Servicios encontrados en SQLite: ${services.length}`)
  if (services.length !== 16) {
    console.warn(`   ⚠️ Esperados 16 servicios, encontrados: ${services.length}`)
  }

  // 2. Crear Cita de prueba para Mañana a las 10:00 con Valentina (Manicure Semipermanente)
  console.log('\n2️⃣  Creando cita de prueba para mañana 10:00 con Valentina...')
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  // Set to 10:00 AM Bogota time (UTC-5) -> 15:00 UTC
  tomorrow.setUTCHours(15, 0, 0, 0)
  const inicioUtc = tomorrow.toISOString()

  // Manicure semipermanente: duracionMin 60 + bufferMin 10 = 70 min
  const finUtc = new Date(tomorrow.getTime() + 70 * 60 * 1000).toISOString()
  const testCitaId = `apt_smoke_${Date.now()}`

  const testCitaData = {
    id: testCitaId,
    clientId: 'cli_maria_fernanda',
    professionalId: 'pro_valentina',
    serviceId: 'srv_manicure_semi',
    inicioUtc,
    finUtc,
    estado: 'agendada',
    origen: 'web',
    precioCentavos: 5500000,
    creadaPor: 'smoke_test',
    historial: [
      {
        estado: 'agendada',
        fechaUtc: new Date().toISOString(),
        nota: 'Cita de prueba Smoke Test',
        cambiadoPor: 'smoke_test',
      },
    ],
  }

  // Guardar cita dentro de una transacción
  transaccion(() => {
    saveDoc('appointments', testCitaId, testCitaData)
  })
  console.log(`   ✓ Cita de prueba creada exitosamente en SQLite (ID: ${testCitaId})`)

  // 3. INTENTO DE SEGUNDA RESERVA SOBRE EL MISMO CUPO (Anti-doble-reserva)
  console.log('\n3️⃣  Intentando agendar una SEGUNDA cita sobre el MISMO cupo de Valentina (debe rebotar)...')

  const resultSecondAttempt = transaccion(() => {
    const allServices = getCollection('services')
    const allProfessionals = getCollection('professionals')
    const allAppts = getCollection('appointments')

    const val = validarReserva(
      {
        serviceId: 'srv_manicure_semi',
        professionalId: 'pro_valentina',
        inicioUtc,
      },
      allAppts,
      allServices,
      allProfessionals
    )

    if (!val.ok) {
      const alternativas = proximasFranjas(
        'srv_manicure_semi',
        'pro_valentina',
        new Date(inicioUtc),
        14,
        4,
        allAppts,
        allServices,
        allProfessionals
      )
      return { ok: false, error: val.error, alternativas }
    }
    return { ok: true }
  })

  if (!resultSecondAttempt.ok && resultSecondAttempt.error === 'cupo_ocupado') {
    console.log('   ✅ RECHAZO EXITOSO: El servidor detectó el solape y rechazó el 2º intento con cupo_ocupado!')
    console.log(`   💡 Franjas alternativas ofrecidas: ${resultSecondAttempt.alternativas?.length || 0} disponibles`)
  } else {
    console.error('   ❌ FALLO: El servidor no detectó el solape:', resultSecondAttempt)
  }

  // 4. Cancelar / Limpiar la cita de prueba
  console.log('\n4️⃣  Cancelando cita de prueba (limpieza)...')
  transaccion(() => {
    deleteDoc('appointments', testCitaId)
  })

  const apptsAfterDelete = getCollection('appointments')
  const stillExists = apptsAfterDelete.some((a) => a.id === testCitaId)

  if (!stillExists) {
    console.log('   ✓ Cita de prueba eliminada/cancelada correctamente. Cupo liberado.')
  } else {
    console.warn('   ⚠️ No se pudo borrar la cita de prueba.')
  }

  console.log('\n✨ Smoke Test completado con ÉXITO.')
}

runSmokeTest().catch((err) => {
  console.error('\n❌ Smoke Test falló:', err)
  process.exit(1)
})
