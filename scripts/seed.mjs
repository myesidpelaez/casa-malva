import fs from 'fs'
import path from 'path'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// 1. Locate Service Account
const saPaths = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  'C:\\hermes-data\\secrets\\casa-malva-demo-sa.json',
  path.join(process.cwd(), 'service-account.json'),
].filter(Boolean)

let saFile = null
for (const p of saPaths) {
  if (p && fs.existsSync(p)) {
    saFile = p
    break
  }
}

if (!saFile) {
  console.log('\n⚠️  [Seed Casa Malva] No se encontró el archivo de Service Account.')
  console.log('Ruta esperada: C:\\hermes-data\\secrets\\casa-malva-demo-sa.json')
  console.log('Por favor descarga la service account de GCP / Firebase Console.')
  console.log('El script finaliza sin errores para permitir la ejecución posterior por VIRGILIO.\n')
  process.exit(0)
}

console.log(`[Seed] Usando credenciales de: ${saFile}`)
const sa = JSON.parse(fs.readFileSync(saFile, 'utf-8'))

if (getApps().length === 0) {
  initializeApp({ credential: cert(sa) })
}
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

async function runSeed() {
  console.log('🌱 Iniciando seed idempotente para Casa Malva...')

  // 1. Configuración de Negocio
  const businessRef = db.doc('settings/business')
  await businessRef.set({
    nombre: 'Casa Malva',
    bajada: 'Estudio de belleza',
    horario: {
      dias: [1, 2, 3, 4, 5, 6],
      horaApertura: '09:00',
      horaCierre: '19:00',
    },
    almuerzo: {
      inicio: '13:00',
      fin: '14:00',
    },
    zonaHoraria: 'America/Bogota',
    politicas: {
      minAntelacionMin: 120,
      maxAntelacionDias: 60,
      cancelacionNoShowHoras: 4,
      recordatorioHoras: 24,
      umbralConfirmacionCentavos: 20000000,
    },
  }, { merge: true })
  console.log('  ✓ settings/business actualizado')

  // 2. Categorías
  const categories = [
    { id: 'cat_unas', nombre: 'Uñas 💅', orden: 1, activa: true },
    { id: 'cat_cabello', nombre: 'Cabello ✂️', orden: 2, activa: true },
    { id: 'cat_maquillaje', nombre: 'Maquillaje 💄', orden: 3, activa: true },
    { id: 'cat_cejas', nombre: 'Cejas y pestañas 👁️', orden: 4, activa: true },
  ]

  for (const cat of categories) {
    const { id, ...data } = cat
    await db.doc(`categories/${id}`).set(data, { merge: true })
  }
  console.log(`  ✓ ${categories.length} categorías creadas/actualizadas`)

  // 3. Servicios
  const services = [
    // Uñas
    { id: 'srv_manicure_trad', categoryId: 'cat_unas', nombre: 'Manicure tradicional', duracionMin: 40, bufferMin: 10, precioCentavos: 2800000, requiereConfirmacion: false, activo: true },
    { id: 'srv_manicure_semi', categoryId: 'cat_unas', nombre: 'Manicure semipermanente', duracionMin: 60, bufferMin: 10, precioCentavos: 5500000, requiereConfirmacion: false, activo: true },
    { id: 'srv_pedicure_spa', categoryId: 'cat_unas', nombre: 'Pedicure spa', duracionMin: 60, bufferMin: 15, precioCentavos: 4500000, requiereConfirmacion: false, activo: true },
    { id: 'srv_unas_acrilicas', categoryId: 'cat_unas', nombre: 'Uñas acrílicas', duracionMin: 120, bufferMin: 15, precioCentavos: 13000000, requiereConfirmacion: false, activo: true },
    { id: 'srv_retiro_semi', categoryId: 'cat_unas', nombre: 'Retiro de semipermanente', duracionMin: 30, bufferMin: 10, precioCentavos: 2000000, requiereConfirmacion: false, activo: true },
    // Cabello
    { id: 'srv_corte_peinado', categoryId: 'cat_cabello', nombre: 'Corte y peinado', duracionMin: 60, bufferMin: 10, precioCentavos: 6500000, requiereConfirmacion: false, activo: true },
    { id: 'srv_cepillado', categoryId: 'cat_cabello', nombre: 'Cepillado', duracionMin: 45, bufferMin: 10, precioCentavos: 3800000, requiereConfirmacion: false, activo: true },
    { id: 'srv_hidratacion', categoryId: 'cat_cabello', nombre: 'Hidratación profunda', duracionMin: 60, bufferMin: 10, precioCentavos: 8500000, requiereConfirmacion: false, activo: true },
    { id: 'srv_color_raiz', categoryId: 'cat_cabello', nombre: 'Color de raíz', duracionMin: 120, bufferMin: 15, precioCentavos: 18000000, requiereConfirmacion: false, activo: true },
    { id: 'srv_balayage', categoryId: 'cat_cabello', nombre: 'Balayage', duracionMin: 240, bufferMin: 20, precioCentavos: 42000000, requiereConfirmacion: true, activo: true },
    { id: 'srv_keratina', categoryId: 'cat_cabello', nombre: 'Keratina', duracionMin: 180, bufferMin: 20, precioCentavos: 29000000, requiereConfirmacion: true, activo: true },
    // Maquillaje
    { id: 'srv_maq_social', categoryId: 'cat_maquillaje', nombre: 'Maquillaje social', duracionMin: 60, bufferMin: 10, precioCentavos: 11000000, requiereConfirmacion: false, activo: true },
    { id: 'srv_maq_novia', categoryId: 'cat_maquillaje', nombre: 'Maquillaje de novia', duracionMin: 120, bufferMin: 20, precioCentavos: 32000000, requiereConfirmacion: true, activo: true },
    // Cejas y pestañas
    { id: 'srv_diseno_cejas', categoryId: 'cat_cejas', nombre: 'Diseño de cejas', duracionMin: 30, bufferMin: 5, precioCentavos: 3500000, requiereConfirmacion: false, activo: true },
    { id: 'srv_laminado_cejas', categoryId: 'cat_cejas', nombre: 'Laminado de cejas', duracionMin: 60, bufferMin: 10, precioCentavos: 9500000, requiereConfirmacion: false, activo: true },
    { id: 'srv_lifting_pestanas', categoryId: 'cat_cejas', nombre: 'Lifting de pestañas', duracionMin: 75, bufferMin: 10, precioCentavos: 13000000, requiereConfirmacion: false, activo: true },
  ]

  for (const srv of services) {
    const { id, ...data } = srv
    await db.doc(`services/${id}`).set(data, { merge: true })
  }
  console.log(`  ✓ ${services.length} servicios creados/actualizados`)

  // 4. Profesionales
  const professionals = [
    {
      id: 'pro_valentina',
      nombre: 'Valentina Ruiz',
      rol: 'Manicurista sénior',
      serviceIds: ['srv_manicure_trad', 'srv_manicure_semi', 'srv_pedicure_spa', 'srv_unas_acrilicas', 'srv_retiro_semi'],
      horario: { 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [9, 18] },
      excepciones: [],
      activo: true,
    },
    {
      id: 'pro_daniela',
      nombre: 'Daniela Ospina',
      rol: 'Estilista sénior',
      serviceIds: ['srv_corte_peinado', 'srv_cepillado', 'srv_hidratacion', 'srv_color_raiz', 'srv_balayage', 'srv_keratina'],
      horario: { 2: [10, 19], 3: [10, 19], 4: [10, 19], 5: [10, 19], 6: [10, 19] }, // Lunes libre
      excepciones: [],
      activo: true,
    },
    {
      id: 'pro_sara',
      nombre: 'Sara Jaramillo',
      rol: 'Estilista y maquilladora',
      serviceIds: ['srv_corte_peinado', 'srv_cepillado', 'srv_hidratacion', 'srv_maq_social', 'srv_maq_novia'],
      horario: { 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18] },
      excepciones: [],
      activo: true,
    },
    {
      id: 'pro_camila',
      nombre: 'Camila Restrepo',
      rol: 'Especialista en cejas y pestañas',
      serviceIds: ['srv_diseno_cejas', 'srv_laminado_cejas', 'srv_lifting_pestanas', 'srv_manicure_trad'],
      horario: { 1: [11, 19], 2: [11, 19], 3: [11, 19], 4: [11, 19], 5: [11, 19], 6: [11, 19] },
      excepciones: [],
      activo: true,
    },
  ]

  for (const pro of professionals) {
    const { id, ...data } = pro
    await db.doc(`professionals/${id}`).set(data, { merge: true })
  }
  console.log(`  ✓ ${professionals.length} profesionales creados/actualizados`)

  // 5. Clientas
  const clients = [
    {
      id: 'cli_maria_fernanda',
      nombre: 'María Fernanda Gómez',
      telefonoE164: '+573001234567',
      email: 'maria.gomez@gmail.com',
      notas: 'Preferencias: tonos neutros y pastel',
      creadaEn: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      _seed: true,
    },
    {
      id: 'cli_luisa_martinez',
      nombre: 'Luisa Martínez',
      telefonoE164: '+573009876543',
      email: 'luisa.martinez@gmail.com',
      notas: 'Sensibilidad leve a amoníaco',
      creadaEn: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      _seed: true,
    },
    {
      id: 'cli_carolina_perez',
      nombre: 'Carolina Pérez',
      telefonoE164: '+573011112223',
      email: 'carolina.perez@gmail.com',
      notas: 'Clienta frecuente de cejas',
      creadaEn: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      _seed: true,
    },
  ]

  for (const cli of clients) {
    const { id, ...data } = cli
    await db.doc(`clients/${id}`).set(data, { merge: true })
  }
  console.log(`  ✓ ${clients.length} clientas creadas/actualizadas`)

  // 6. Citas Semilla (Fechas relativas)
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000)
  const fourDaysAgo = new Date(now.getTime() - 96 * 3600 * 1000) // día hábil (Daniela no trabaja domingos)
  const threeDaysAgo = new Date(now.getTime() - 72 * 3600 * 1000)
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000)

  // Format helper for specific hour on a date (UTC)
  function makeUtcString(date, hour, min = 0) {
    const d = new Date(date)
    // Convert America/Bogota hour (UTC-5) to UTC (+5 hours)
    d.setUTCHours(hour + 5, min, 0, 0)
    return d.toISOString()
  }

  const appointments = [
    // Past completed 1
    {
      id: 'apt_past_1',
      clientId: 'cli_maria_fernanda',
      professionalId: 'pro_valentina',
      serviceId: 'srv_manicure_semi',
      inicioUtc: makeUtcString(threeDaysAgo, 10, 0),
      finUtc: makeUtcString(threeDaysAgo, 11, 0),
      estado: 'completada',
      origen: 'web',
      precioCentavos: 5500000,
      creadaPor: 'cli_maria_fernanda',
      historial: [
        { estado: 'agendada', fechaUtc: makeUtcString(threeDaysAgo, 8, 0), nota: 'Agendada en línea' },
        { estado: 'confirmada', fechaUtc: makeUtcString(threeDaysAgo, 9, 0), nota: 'Confirmada por cliente' },
        { estado: 'completada', fechaUtc: makeUtcString(threeDaysAgo, 11, 5), nota: 'Servicio realizado' },
      ],
      _seed: true,
    },
    // Past completed 2
    {
      id: 'apt_past_2',
      clientId: 'cli_luisa_martinez',
      professionalId: 'pro_daniela',
      serviceId: 'srv_corte_peinado',
      inicioUtc: makeUtcString(fourDaysAgo, 14, 0),
      finUtc: makeUtcString(fourDaysAgo, 15, 0),
      estado: 'completada',
      origen: 'whatsapp',
      precioCentavos: 6500000,
      creadaPor: 'agente_ia',
      historial: [
        { estado: 'agendada', fechaUtc: makeUtcString(fourDaysAgo, 10, 0), nota: 'Agendada via WhatsApp' },
        { estado: 'completada', fechaUtc: makeUtcString(fourDaysAgo, 15, 0), nota: 'Servicio realizado' },
      ],
      _seed: true,
    },
    // Past completed 3
    {
      id: 'apt_past_3',
      clientId: 'cli_carolina_perez',
      professionalId: 'pro_camila',
      serviceId: 'srv_laminado_cejas',
      inicioUtc: makeUtcString(yesterday, 11, 0),
      finUtc: makeUtcString(yesterday, 12, 0),
      estado: 'completada',
      origen: 'admin',
      precioCentavos: 9500000,
      creadaPor: 'recepcion',
      historial: [
        { estado: 'agendada', fechaUtc: makeUtcString(yesterday, 9, 0), nota: 'Agendada en recepción' },
        { estado: 'completada', fechaUtc: makeUtcString(yesterday, 12, 0), nota: 'Servicio realizado' },
      ],
      _seed: true,
    },
    // Past cancelled
    {
      id: 'apt_cancelled_1',
      clientId: 'cli_luisa_martinez',
      professionalId: 'pro_sara',
      serviceId: 'srv_maq_social',
      inicioUtc: makeUtcString(yesterday, 16, 0),
      finUtc: makeUtcString(yesterday, 17, 0),
      estado: 'cancelada',
      origen: 'web',
      precioCentavos: 11000000,
      creadaPor: 'cli_luisa_martinez',
      historial: [
        { estado: 'agendada', fechaUtc: makeUtcString(yesterday, 8, 0), nota: 'Agendada web' },
        { estado: 'cancelada', fechaUtc: makeUtcString(yesterday, 14, 0), nota: 'Cancelada por el cliente' },
      ],
      _seed: true,
    },
    // Past no show
    {
      id: 'apt_noshow_1',
      clientId: 'cli_maria_fernanda',
      professionalId: 'pro_valentina',
      serviceId: 'srv_pedicure_spa',
      inicioUtc: makeUtcString(yesterday, 15, 0),
      finUtc: makeUtcString(yesterday, 16, 0),
      estado: 'no_asistio',
      origen: 'whatsapp',
      precioCentavos: 4500000,
      creadaPor: 'agente_ia',
      historial: [
        { estado: 'agendada', fechaUtc: makeUtcString(yesterday, 10, 0), nota: 'Agendada por WhatsApp' },
        { estado: 'no_asistio', fechaUtc: makeUtcString(yesterday, 17, 0), nota: 'No se presentó a la cita' },
      ],
      _seed: true,
    },
    // Future 1 (Tomorrow: Color de raíz con Daniela 11:00 confirmada)
    {
      id: 'apt_future_1',
      clientId: 'cli_luisa_martinez',
      professionalId: 'pro_daniela',
      serviceId: 'srv_color_raiz',
      inicioUtc: makeUtcString(tomorrow, 11, 0),
      finUtc: makeUtcString(tomorrow, 13, 0),
      estado: 'confirmada',
      origen: 'whatsapp',
      precioCentavos: 18000000,
      creadaPor: 'agente_ia',
      historial: [
        { estado: 'agendada', fechaUtc: new Date().toISOString(), nota: 'Agendada en línea' },
        { estado: 'confirmada', fechaUtc: new Date().toISOString(), nota: 'Confirmada con anticipo' },
      ],
      _seed: true,
    },
    // Future 2 (Tomorrow: Manicure tradicional con Camila 12:00 agendada)
    {
      id: 'apt_future_2',
      clientId: 'cli_carolina_perez',
      professionalId: 'pro_camila',
      serviceId: 'srv_manicure_trad',
      inicioUtc: makeUtcString(tomorrow, 12, 0),
      finUtc: makeUtcString(tomorrow, 12, 40),
      estado: 'agendada',
      origen: 'web',
      precioCentavos: 2800000,
      creadaPor: 'cli_carolina_perez',
      historial: [
        { estado: 'agendada', fechaUtc: new Date().toISOString(), nota: 'Agendada por la clienta' },
      ],
      _seed: true,
    },
  ]

  for (const apt of appointments) {
    const { id, ...data } = apt
    await db.doc(`appointments/${id}`).set(data, { merge: true })
  }
  console.log(`  ✓ ${appointments.length} citas semilla creadas/actualizadas`)

  console.log('\n✅ Seed completado exitosamente.')
}

runSeed().catch((err) => {
  console.error('❌ Error en seed:', err)
  process.exit(1)
})
