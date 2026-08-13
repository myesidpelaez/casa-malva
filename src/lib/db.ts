import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore, Timestamp, type Transaction } from 'firebase-admin/firestore'
import * as fs from 'fs'
import type {
  Appointment,
  BusinessSettings,
  Category,
  Client,
  Conversation,
  Message,
  Professional,
  Service,
  Slot,
} from '@/types'

export type UserRow = {
  id: string
  email: string
  passwordHash: string
  nombre: string
  rol: string
}

let firestoreInstance: Firestore | null = null

export function getDb(): Firestore {
  if (!firestoreInstance) {
    let app: App
    if (getApps().length === 0) {
      const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
      const projectId =
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        process.env.FIREBASE_ADMIN_PROJECT_ID ||
        'casa-malva-demo'

      if (saPath && fs.existsSync(saPath)) {
        try {
          const sa = JSON.parse(fs.readFileSync(saPath, 'utf-8'))
          app = initializeApp({ credential: cert(sa), projectId })
        } catch {
          app = initializeApp({ projectId })
        }
      } else {
        app = initializeApp({ projectId })
      }
    } else {
      app = getApps()[0]
    }
    firestoreInstance = getFirestore(app)
    firestoreInstance.settings({ ignoreUndefinedProperties: true })
  }
  return firestoreInstance
}

function normalizeDocData<T>(docId: string, raw: Record<string, unknown>): T {
  const data: Record<string, unknown> = { id: docId, ...raw }
  // Convert any Firestore Timestamps to ISO strings for application compatibility
  for (const key of Object.keys(data)) {
    const val = data[key]
    if (val && typeof val === 'object' && val instanceof Timestamp) {
      data[key] = val.toDate().toISOString()
    }
  }
  return data as T
}

export async function docGet<T>(collection: string, docId: string): Promise<T | null> {
  const db = getDb()
  const snap = await db.collection(collection).doc(docId).get()
  if (!snap.exists) return null
  return normalizeDocData<T>(snap.id, snap.data() || {})
}

export async function docSet<T extends Record<string, unknown>>(
  collection: string,
  docId: string,
  data: T
): Promise<T> {
  const db = getDb()
  const ref = db.collection(collection).doc(docId)
  await ref.set(data, { merge: true })
  return { id: docId, ...data }
}

export async function docUpdate<T extends Record<string, unknown>>(
  collection: string,
  docId: string,
  partialData: Partial<T>
): Promise<T | null> {
  const db = getDb()
  const ref = db.collection(collection).doc(docId)
  const snap = await ref.get()
  if (!snap.exists) return null
  await ref.update(partialData as Record<string, unknown>)
  const updatedSnap = await ref.get()
  return normalizeDocData<T>(docId, updatedSnap.data() || {})
}

export async function docDelete(collection: string, docId: string): Promise<boolean> {
  const db = getDb()
  await db.collection(collection).doc(docId).delete()
  return true
}

export async function listDocs<T>(collection: string): Promise<T[]> {
  const db = getDb()
  const snap = await db.collection(collection).get()
  return snap.docs.map((d) => normalizeDocData<T>(d.id, d.data()))
}

export async function transaccion<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const db = getDb()
  return await db.runTransaction(async (tx) => {
    return await fn(tx)
  })
}

// Helpers tipados
export async function getCategories(): Promise<Category[]> {
  const cats = await listDocs<Category>('categories')
  return cats.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
}

export async function getServices(): Promise<Service[]> {
  return await listDocs<Service>('services')
}

export async function getProfessionals(): Promise<Professional[]> {
  return await listDocs<Professional>('professionals')
}

export async function getClients(): Promise<Client[]> {
  return await listDocs<Client>('clients')
}

export async function getAppointments(): Promise<Appointment[]> {
  return await listDocs<Appointment>('appointments')
}

export async function getBusinessSettings(): Promise<BusinessSettings | null> {
  return await docGet<BusinessSettings>('settings', 'business')
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const db = getDb()
  const snap = await db.collection('users').where('email', '==', email).limit(1).get()
  if (snap.empty) return null
  const d = snap.docs[0]
  return normalizeDocData<UserRow>(d.id, d.data())
}

/**
 * Calcula todas las franjas de 15 minutos que abarca un servicio (duración + buffer)
 */
export function calcularFranjasSlot(inicioUtcISO: string, duracionTotalMin: number, pasoMin = 15): string[] {
  const franjas: string[] = []
  const inicio = new Date(inicioUtcISO)
  for (let m = 0; m < duracionTotalMin; m += pasoMin) {
    const slotDate = new Date(inicio.getTime() + m * 60 * 1000)
    franjas.push(slotDate.toISOString())
  }
  return franjas
}

/**
 * Anti-Doble-Reserva atómica con la técnica de slots (skill firestore-modelado §2).
 *
 * 1) LECTURAS PRIMERO: Verifica la disponibilidad de todos los slots que cubrirá la cita.
 * 2) ESCRITURAS DESPUÉS: Crea cada slot con ID determinista `${profId}_${slotISO}` + documento de cita.
 * Si algún slot ya existe, la transacción de Firestore aborta automáticamente con error de colisión.
 */
export async function reservarCitaConSlots(
  appointment: Appointment,
  duracionTotalMin: number
): Promise<{ ok: true; data: Appointment } | { ok: false; error: string }> {
  const db = getDb()
  const franjas = calcularFranjasSlot(appointment.inicioUtc, duracionTotalMin, 15)
  const slotRefs = franjas.map((franja) => db.doc(`slots/${appointment.professionalId}_${franja}`))
  const appointmentRef = db.doc(`appointments/${appointment.id}`)

  try {
    const result = await db.runTransaction(async (tx) => {
      // 1. LECTURAS PRIMERO — Leer todos los slots para verificar si alguno ya está ocupado
      const slotSnaps = await Promise.all(slotRefs.map((ref) => tx.get(ref)))
      for (const snap of slotSnaps) {
        if (snap.exists) {
          throw new Error('cupo_ocupado')
        }
      }

      // 2. ESCRITURAS DESPUÉS — Bloquear franjas y persistir la cita
      for (let i = 0; i < franjas.length; i++) {
        const slotData: Slot = {
          id: `${appointment.professionalId}_${franjas[i]}`,
          appointmentId: appointment.id,
          professionalId: appointment.professionalId,
          inicioUtc: franjas[i],
          creadoEn: new Date().toISOString(),
        }
        tx.create(slotRefs[i], slotData)
      }

      tx.create(appointmentRef, appointment)
      return appointment
    })

    return { ok: true, data: result }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('cupo_ocupado') || msg.includes('ALREADY_EXISTS') || msg.includes('already exists')) {
      return { ok: false, error: 'cupo_ocupado' }
    }
    return { ok: false, error: msg }
  }
}

/**
 * Libera las franjas de slots al cancelar o completar una cita
 */
export async function liberarSlotsCita(professionalId: string, inicioUtcISO: string, duracionTotalMin: number): Promise<void> {
  const db = getDb()
  const franjas = calcularFranjasSlot(inicioUtcISO, duracionTotalMin, 15)
  const batch = db.batch()
  for (const franja of franjas) {
    const ref = db.doc(`slots/${professionalId}_${franja}`)
    batch.delete(ref)
  }
  await batch.commit()
}
