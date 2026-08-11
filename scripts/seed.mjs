import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import crypto from 'node:crypto'

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function runSeed() {
  console.log('🌱 Iniciando seed para Casa Malva en SQLite local (casa-malva.db)...')

  const dbPath = path.join(process.cwd(), 'casa-malva.db')
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL;')

  // Migraciones / Tablas
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, orden INTEGER NOT NULL DEFAULT 0, activa INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, categoryId TEXT NOT NULL, nombre TEXT NOT NULL, duracionMin INTEGER NOT NULL, bufferMin INTEGER NOT NULL, precioCentavos INTEGER NOT NULL, requiereConfirmacion INTEGER NOT NULL DEFAULT 0, activo INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS professionals (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, rol TEXT NOT NULL, serviceIds TEXT NOT NULL, horario TEXT NOT NULL, excepciones TEXT NOT NULL DEFAULT '[]', activo INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, telefonoE164 TEXT UNIQUE, email TEXT DEFAULT '', notas TEXT DEFAULT '', creadaEn TEXT NOT NULL, _seed INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, clientId TEXT NOT NULL, professionalId TEXT NOT NULL, serviceId TEXT NOT NULL, inicioUtc TEXT NOT NULL, finUtc TEXT NOT NULL, estado TEXT NOT NULL, origen TEXT NOT NULL, precioCentavos INTEGER NOT NULL, creadaPor TEXT NOT NULL, historial TEXT NOT NULL DEFAULT '[]', _seed INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, canal TEXT NOT NULL, clienteRef TEXT, estado TEXT NOT NULL, escaladaA TEXT, actualizadaEn TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversationId TEXT NOT NULL, rol TEXT NOT NULL, texto TEXT NOT NULL, herramientaUsada TEXT, enviadoEn TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL, nombre TEXT NOT NULL, rol TEXT NOT NULL DEFAULT 'admin');
    CREATE INDEX IF NOT EXISTS idx_appt_prof_fecha ON appointments (professionalId, inicioUtc);
    CREATE INDEX IF NOT EXISTS idx_appt_cliente ON appointments (clientId);
  `)

  // 1. Settings / Business
  const businessConfig = {
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
  }
  const stmtSettings = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  stmtSettings.run('business', JSON.stringify(businessConfig))
  console.log('  ✓ settings/business creado/actualizado')

  // 2. Categorías (4)
  const categories = [
    { id: 'cat_unas', nombre: 'Uñas 💅', orden: 1, activa: 1 },
    { id: 'cat_cabello', nombre: 'Cabello ✂️', orden: 2, activa: 1 },
    { id: 'cat_maquillaje', nombre: 'Maquillaje 💄', orden: 3, activa: 1 },
    { id: 'cat_cejas', nombre: 'Cejas y pestañas 👁️', orden: 4, activa: 1 },
  ]
  const stmtCat = db.prepare('INSERT OR REPLACE INTO categories (id, nombre, orden, activa) VALUES (?, ?, ?, ?)')
  for (const cat of categories) {
    stmtCat.run(cat.id, cat.nombre, cat.orden, cat.activa)
  }
  console.log(`  ✓ ${categories.length} categorías creadas/actualizadas`)

  // 3. Servicios (16)
  const services = [
    // Uñas
    { id: 'srv_manicure_trad', categoryId: 'cat_unas', nombre: 'Manicure tradicional', duracionMin: 40, bufferMin: 10, precioCentavos: 2800000, requiereConfirmacion: 0, activo: 1 },
    { id: 'srv_manicure_semi', categoryId: 'cat_unas', nombre: 'Manicure semipermanente', duracionMin: 60, bufferMin: 10, precioCentavos: 5500000, requiereConfirmacion: 0, activo: 1 },
    { id: 'srv_pedicure_spa', categoryId: 'cat_unas', nombre: 'Pedicure spa', duracionMin: 60, bufferMin: 15, precioCentavos: 4500000, requiereConfirmacion: 0, activo: 1 },
    { id: 'srv_unas_acrilicas', categoryId: 'cat_unas', nombre: 'Uñas acrílicas', duracionMin: 120, bufferMin: 15, precioCentavos: 13000000, requiereConfirmacion: 0, activo: 1 },
    { id: 'srv_retiro_semi', categoryId: 'cat_unas', nombre: 'Retiro de semipermanente', duracionMin: 30, bufferMin: 10, precioCentavos: 2000000, requiereConfirmacion: 0, activo: 1 },
    // Cabello
    { id: 'srv_corte_peinado', categoryId: 'cat_cabello', nombre: 'Corte y peinado', duracionMin: 60, bufferMin: 10, precioCentavos: 6500000, requiereConfirmacion: 0, activo: 1 },
    { id: 'srv_cepillado', categoryId: 'cat_cabello', nombre: 'Cepillado', duracionMin: 45, bufferMin: 10, precioCentavos: 3800000, requiereConfirmacion: 0, activo: 1 },
    { id: 'srv_hidratacion', categoryId: 'cat_cabello', nombre: 'Hidratación profunda', duracionMin: 60, bufferMin: 10, precioCentavos: 8500000, requiereConfirmacion: 0, activo: 1 },
    { id: 'srv_color_raiz', categoryId: 'cat_cabello', nombre: 'Color de raíz', duracionMin: 120, bufferMin: 15, precioCentavos: 18000000, requiereConfirmacion: 0, activo: 1 },
    { id: 'srv_balayage', categoryId: 'cat_cabello', nombre: 'Balayage', duracionMin: 240, bufferMin: 20, precioCentavos: 42000000, requiereConfirmacion: 1, activo: 1 },
    { id: 'srv_keratina', categoryId: 'cat_cabello', nombre: 'Keratina', duracionMin: 180, bufferMin: 20, precioCentavos: 29000000, requiereConfirmacion: 1, activo: 1 },
    // Maquillaje
    { id: 'srv_maq_social', categoryId: 'cat_maquillaje', nombre: 'Maquillaje social', duracionMin: 60, bufferMin: 10, precioCentavos: 11000000, requiereConfirmacion: 0, activo: 1 },
    { id: 'srv_maq_novia', categoryId: 'cat_maquillaje', nombre: 'Maquillaje de novia', duracionMin: 120, bufferMin: 20, precioCentavos: 32000000, requiereConfirmacion: 1, activo: 1 },
    // Cejas y pestañas
    { id: 'srv_diseno_cejas', categoryId: 'cat_cejas', nombre: 'Diseño de cejas', duracionMin: 30, bufferMin: 5, precioCentavos: 3500000, requiereConfirmacion: 0, activo: 1 },
    { id: 'srv_laminado_cejas', categoryId: 'cat_cejas', nombre: 'Laminado de cejas', duracionMin: 60, bufferMin: 10, precioCentavos: 9500000, requiereConfirmacion: 0, activo: 1 },
    { id: 'srv_lifting_pestanas', categoryId: 'cat_cejas', nombre: 'Lifting de pestañas', duracionMin: 75, bufferMin: 10, precioCentavos: 13000000, requiereConfirmacion: 0, activo: 1 },
  ]

  const stmtSvc = db.prepare(
    'INSERT OR REPLACE INTO services (id, categoryId, nombre, duracionMin, bufferMin, precioCentavos, requiereConfirmacion, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  for (const srv of services) {
    stmtSvc.run(srv.id, srv.categoryId, srv.nombre, srv.duracionMin, srv.bufferMin, srv.precioCentavos, srv.requiereConfirmacion, srv.activo)
  }
  console.log(`  ✓ ${services.length} servicios creados/actualizados`)

  // 4. Profesionales (4)
  const professionals = [
    {
      id: 'pro_valentina',
      nombre: 'Valentina Ruiz',
      rol: 'Manicurista sénior',
      serviceIds: JSON.stringify(['srv_manicure_trad', 'srv_manicure_semi', 'srv_pedicure_spa', 'srv_unas_acrilicas', 'srv_retiro_semi']),
      horario: JSON.stringify({ 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [9, 18] }),
      excepciones: JSON.stringify([]),
      activo: 1,
    },
    {
      id: 'pro_daniela',
      nombre: 'Daniela Ospina',
      rol: 'Estilista sénior',
      serviceIds: JSON.stringify(['srv_corte_peinado', 'srv_cepillado', 'srv_hidratacion', 'srv_color_raiz', 'srv_balayage', 'srv_keratina']),
      horario: JSON.stringify({ 2: [10, 19], 3: [10, 19], 4: [10, 19], 5: [10, 19], 6: [10, 19] }),
      excepciones: JSON.stringify([]),
      activo: 1,
    },
    {
      id: 'pro_sara',
      nombre: 'Sara Jaramillo',
      rol: 'Estilista y maquilladora',
      serviceIds: JSON.stringify(['srv_corte_peinado', 'srv_cepillado', 'srv_hidratacion', 'srv_maq_social', 'srv_maq_novia']),
      horario: JSON.stringify({ 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18] }),
      excepciones: JSON.stringify([]),
      activo: 1,
    },
    {
      id: 'pro_camila',
      nombre: 'Camila Restrepo',
      rol: 'Especialista en cejas y pestañas',
      serviceIds: JSON.stringify(['srv_diseno_cejas', 'srv_laminado_cejas', 'srv_lifting_pestanas', 'srv_manicure_trad']),
      horario: JSON.stringify({ 1: [11, 19], 2: [11, 19], 3: [11, 19], 4: [11, 19], 5: [11, 19], 6: [11, 19] }),
      excepciones: JSON.stringify([]),
      activo: 1,
    },
  ]
  const stmtProf = db.prepare(
    'INSERT OR REPLACE INTO professionals (id, nombre, rol, serviceIds, horario, excepciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  for (const prof of professionals) {
    stmtProf.run(prof.id, prof.nombre, prof.rol, prof.serviceIds, prof.horario, prof.excepciones, prof.activo)
  }
  console.log(`  ✓ ${professionals.length} profesionales creadas/actualizadas`)

  // 5. Clientas (3)
  const clients = [
    {
      id: 'cli_maria_fernanda',
      nombre: 'María Fernanda Gómez',
      telefonoE164: '+573001234567',
      email: 'maria.gomez@gmail.com',
      notas: 'Preferencias: tonos neutros y pastel',
      creadaEn: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      _seed: 1,
    },
    {
      id: 'cli_luisa_martinez',
      nombre: 'Luisa Martínez',
      telefonoE164: '+573009876543',
      email: 'luisa.martinez@gmail.com',
      notas: 'Sensibilidad leve a amoníaco',
      creadaEn: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      _seed: 1,
    },
    {
      id: 'cli_carolina_perez',
      nombre: 'Carolina Pérez',
      telefonoE164: '+573011112223',
      email: 'carolina.perez@gmail.com',
      notas: 'Clienta frecuente de cejas',
      creadaEn: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      _seed: 1,
    },
  ]
  const stmtCli = db.prepare(
    'INSERT OR REPLACE INTO clients (id, nombre, telefonoE164, email, notas, creadaEn, _seed) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  for (const cli of clients) {
    stmtCli.run(cli.id, cli.nombre, cli.telefonoE164, cli.email, cli.notas, cli.creadaEn, cli._seed)
  }
  console.log(`  ✓ ${clients.length} clientas creadas/actualizadas`)

  // 6. Citas Semilla (7)
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000)
  const fourDaysAgo = new Date(now.getTime() - 96 * 3600 * 1000)
  const threeDaysAgo = new Date(now.getTime() - 72 * 3600 * 1000)
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000)

  function makeUtcString(date, hour, min = 0) {
    const d = new Date(date)
    d.setUTCHours(hour + 5, min, 0, 0)
    return d.toISOString()
  }

  const appointments = [
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
      historial: JSON.stringify([
        { estado: 'agendada', fechaUtc: makeUtcString(threeDaysAgo, 8, 0), nota: 'Agendada en línea' },
        { estado: 'confirmada', fechaUtc: makeUtcString(threeDaysAgo, 9, 0), nota: 'Confirmada por cliente' },
        { estado: 'completada', fechaUtc: makeUtcString(threeDaysAgo, 11, 5), nota: 'Servicio realizado' },
      ]),
      _seed: 1,
    },
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
      historial: JSON.stringify([
        { estado: 'agendada', fechaUtc: makeUtcString(fourDaysAgo, 10, 0), nota: 'Agendada via WhatsApp' },
        { estado: 'completada', fechaUtc: makeUtcString(fourDaysAgo, 15, 0), nota: 'Servicio realizado' },
      ]),
      _seed: 1,
    },
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
      historial: JSON.stringify([
        { estado: 'agendada', fechaUtc: makeUtcString(yesterday, 9, 0), nota: 'Agendada en recepción' },
        { estado: 'completada', fechaUtc: makeUtcString(yesterday, 12, 0), nota: 'Servicio realizado' },
      ]),
      _seed: 1,
    },
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
      historial: JSON.stringify([
        { estado: 'agendada', fechaUtc: makeUtcString(yesterday, 8, 0), nota: 'Agendada web' },
        { estado: 'cancelada', fechaUtc: makeUtcString(yesterday, 14, 0), nota: 'Cancelada por el cliente' },
      ]),
      _seed: 1,
    },
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
      historial: JSON.stringify([
        { estado: 'agendada', fechaUtc: makeUtcString(yesterday, 10, 0), nota: 'Agendada por WhatsApp' },
        { estado: 'no_asistio', fechaUtc: makeUtcString(yesterday, 17, 0), nota: 'No se presentó a la cita' },
      ]),
      _seed: 1,
    },
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
      historial: JSON.stringify([
        { estado: 'agendada', fechaUtc: new Date().toISOString(), nota: 'Agendada en línea' },
        { estado: 'confirmada', fechaUtc: new Date().toISOString(), nota: 'Confirmada con anticipo' },
      ]),
      _seed: 1,
    },
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
      historial: JSON.stringify([
        { estado: 'agendada', fechaUtc: new Date().toISOString(), nota: 'Agendada por la clienta' },
      ]),
      _seed: 1,
    },
  ]
  const stmtApt = db.prepare(
    'INSERT OR REPLACE INTO appointments (id, clientId, professionalId, serviceId, inicioUtc, finUtc, estado, origen, precioCentavos, creadaPor, historial, _seed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  for (const apt of appointments) {
    stmtApt.run(
      apt.id,
      apt.clientId,
      apt.professionalId,
      apt.serviceId,
      apt.inicioUtc,
      apt.finUtc,
      apt.estado,
      apt.origen,
      apt.precioCentavos,
      apt.creadaPor,
      apt.historial,
      apt._seed
    )
  }
  console.log(`  ✓ ${appointments.length} citas semilla creadas/actualizadas`)

  // 7. Usuario Admin
  const adminEmail = 'admin@casamalva.co'
  const adminPass = 'admin123'
  const passwordHash = hashPassword(adminPass)
  const stmtUser = db.prepare(
    'INSERT OR REPLACE INTO users (id, email, passwordHash, nombre, rol) VALUES (?, ?, ?, ?, ?)'
  )
  stmtUser.run('usr_admin_1', adminEmail, passwordHash, 'Dueña Casa Malva', 'admin')
  console.log(`  ✓ Usuario admin creado/actualizado: ${adminEmail} (password: ${adminPass})`)

  console.log('\n✅ Seed local completado exitosamente en casa-malva.db.')
}

runSeed().catch((err) => {
  console.error('❌ Error en seed:', err)
  process.exit(1)
})
