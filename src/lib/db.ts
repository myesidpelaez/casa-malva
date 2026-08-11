import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import type {
  Appointment,
  BusinessSettings,
  Category,
  Client,
  Conversation,
  Message,
  Professional,
  Service,
} from '@/types'

export type UserRow = {
  id: string
  email: string
  passwordHash: string
  nombre: string
  rol: string
}

let instance: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (!instance) {
    const dbPath = path.join(process.cwd(), 'casa-malva.db')
    instance = new DatabaseSync(dbPath)
    instance.exec('PRAGMA journal_mode = WAL;')
    initTables(instance)
  }
  return instance
}

function initTables(db: DatabaseSync) {
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
}

function parseRow<T>(collection: string, row: Record<string, unknown>): T {
  if (collection === 'settings') {
    return JSON.parse(row.value as string) as T
  }
  if (collection === 'categories') {
    return {
      id: row.id,
      nombre: row.nombre,
      orden: Number(row.orden),
      activa: Boolean(row.activa),
    } as T
  }
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
    } as T
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
    } as T
  }
  if (collection === 'clients') {
    return {
      id: row.id,
      nombre: row.nombre,
      telefonoE164: row.telefonoE164,
      email: row.email || '',
      notas: row.notas || '',
      creadaEn: row.creadaEn,
      _seed: Boolean(row._seed),
    } as T
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
    } as T
  }
  if (collection === 'conversations') {
    return {
      id: row.id,
      canal: row.canal,
      clienteRef: row.clienteRef,
      estado: row.estado,
      escaladaA: row.escaladaA,
      actualizadaEn: row.actualizadaEn,
    } as T
  }
  if (collection === 'messages') {
    return {
      id: row.id,
      conversationId: row.conversationId,
      rol: row.rol,
      texto: row.texto,
      herramientaUsada: row.herramientaUsada,
      enviadoEn: row.enviadoEn,
    } as T
  }
  if (collection === 'users') {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      nombre: row.nombre,
      rol: row.rol,
    } as T
  }
  return row as T
}

export function docGet<T>(collection: string, docId: string): T | null {
  const db = getDb()
  const pkField = collection === 'settings' ? 'key' : 'id'
  const stmt = db.prepare(`SELECT * FROM ${collection} WHERE ${pkField} = ?`)
  const row = stmt.get(docId) as Record<string, unknown> | undefined
  if (!row) return null
  return parseRow<T>(collection, row)
}

export function docSet<T extends Record<string, unknown>>(
  collection: string,
  docId: string,
  data: T
): T {
  const db = getDb()
  if (collection === 'settings') {
    const stmt = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`)
    stmt.run(docId, JSON.stringify(data))
    return data
  }
  if (collection === 'categories') {
    const cat = data as unknown as Category
    const stmt = db.prepare(`INSERT OR REPLACE INTO categories (id, nombre, orden, activa) VALUES (?, ?, ?, ?)`)
    stmt.run(docId, cat.nombre, cat.orden ?? 0, cat.activa ? 1 : 0)
    return data
  }
  if (collection === 'services') {
    const svc = data as unknown as Service
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO services (id, categoryId, nombre, duracionMin, bufferMin, precioCentavos, requiereConfirmacion, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    stmt.run(
      docId,
      svc.categoryId,
      svc.nombre,
      svc.duracionMin,
      svc.bufferMin,
      svc.precioCentavos,
      svc.requiereConfirmacion ? 1 : 0,
      svc.activo ? 1 : 0
    )
    return data
  }
  if (collection === 'professionals') {
    const prof = data as unknown as Professional
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO professionals (id, nombre, rol, serviceIds, horario, excepciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    stmt.run(
      docId,
      prof.nombre,
      prof.rol,
      JSON.stringify(prof.serviceIds || []),
      JSON.stringify(prof.horario || {}),
      JSON.stringify(prof.excepciones || []),
      prof.activo ? 1 : 0
    )
    return data
  }
  if (collection === 'clients') {
    const cli = data as unknown as Client
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO clients (id, nombre, telefonoE164, email, notas, creadaEn, _seed) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    stmt.run(docId, cli.nombre, cli.telefonoE164 || null, cli.email || '', cli.notas || '', cli.creadaEn, cli._seed ? 1 : 0)
    return data
  }
  if (collection === 'appointments') {
    const apt = data as unknown as Appointment
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO appointments (id, clientId, professionalId, serviceId, inicioUtc, finUtc, estado, origen, precioCentavos, creadaPor, historial, _seed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    stmt.run(
      docId,
      apt.clientId,
      apt.professionalId,
      apt.serviceId,
      apt.inicioUtc,
      apt.finUtc,
      apt.estado,
      apt.origen,
      apt.precioCentavos,
      apt.creadaPor,
      JSON.stringify(apt.historial || []),
      apt._seed ? 1 : 0
    )
    return data
  }
  if (collection === 'conversations') {
    const conv = data as unknown as Conversation
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO conversations (id, canal, clienteRef, estado, escaladaA, actualizadaEn) VALUES (?, ?, ?, ?, ?, ?)`
    )
    stmt.run(docId, conv.canal, conv.clienteRef || null, conv.estado, conv.escaladaA || null, conv.actualizadaEn)
    return data
  }
  if (collection === 'messages') {
    const msg = data as unknown as Message & { conversationId?: string }
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO messages (id, conversationId, rol, texto, herramientaUsada, enviadoEn) VALUES (?, ?, ?, ?, ?, ?)`
    )
    stmt.run(docId, msg.conversationId || '', msg.rol, msg.texto, msg.herramientaUsada || null, msg.enviadoEn)
    return data
  }
  if (collection === 'users') {
    const u = data as unknown as UserRow
    const stmt = db.prepare(`INSERT OR REPLACE INTO users (id, email, passwordHash, nombre, rol) VALUES (?, ?, ?, ?, ?)`)
    stmt.run(docId, u.email, u.passwordHash, u.nombre, u.rol || 'admin')
    return data
  }

  return data
}

export function docUpdate<T extends Record<string, unknown>>(
  collection: string,
  docId: string,
  partialData: Partial<T>
): T | null {
  const existing = docGet<T>(collection, docId)
  if (!existing) return null
  const merged = { ...existing, ...partialData }
  return docSet<T>(collection, docId, merged)
}

export function docDelete(collection: string, docId: string): boolean {
  const db = getDb()
  const pkField = collection === 'settings' ? 'key' : 'id'
  const stmt = db.prepare(`DELETE FROM ${collection} WHERE ${pkField} = ?`)
  const info = stmt.run(docId)
  return info.changes > 0
}

export function listDocs<T>(collection: string): T[] {
  const db = getDb()
  const stmt = db.prepare(`SELECT * FROM ${collection}`)
  const rows = stmt.all() as Record<string, unknown>[]
  return rows.map((row) => parseRow<T>(collection, row))
}

export function transaccion<T>(fn: () => T): T {
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

// Helpers tipados
export function getCategories(): Category[] {
  return listDocs<Category>('categories').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
}

export function getServices(): Service[] {
  return listDocs<Service>('services')
}

export function getProfessionals(): Professional[] {
  return listDocs<Professional>('professionals')
}

export function getClients(): Client[] {
  return listDocs<Client>('clients')
}

export function getAppointments(): Appointment[] {
  return listDocs<Appointment>('appointments')
}

export function getBusinessSettings(): BusinessSettings | null {
  return docGet<BusinessSettings>('settings', 'business')
}

export function getUserByEmail(email: string): UserRow | null {
  const db = getDb()
  const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`)
  const row = stmt.get(email) as Record<string, unknown> | undefined
  if (!row) return null
  return parseRow<UserRow>('users', row)
}
