import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore, Timestamp, type Transaction } from 'firebase-admin/firestore'
import * as fs from 'fs'
import type {
  Appointment,
  BusinessSettings,
  Category,
  Client,
  Professional,
  Service,
  Slot,
  Charge,
} from '@/types'
import { type PlanDeSlots } from './ocupacion'

export type UserRow = {
  id: string
  email: string
  passwordHash: string
  nombre: string
  rol: string
  professionalId?: string
}

let firestoreInstance: Firestore | null = null

let lecturas = 0
export function lecturasRealizadas(): number { return lecturas }
export function reiniciarContadorLecturas(): void { lecturas = 0 }

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

    // ─────────────────────────────────────────────────────────────────────────
    // Hallazgo del 2026-08-20, al montar el webhook de la Spec 28.
    //
    // `firestoreInstance` es una variable de MÓDULO, y `getFirestore(app)` devuelve un
    // SINGLETON del proceso. En cuanto hay dos grafos de módulos vivos —una página y una
    // ruta de API, que es justo lo que pasa desde que existe `/api/whatsapp/webhook`— el
    // segundo grafo entra aquí con `firestoreInstance` en null pero recibe la MISMA instancia
    // de Firestore, ya configurada. Y `settings()` solo se puede llamar una vez:
    //
    //   Error: Firestore has already been initialized. You can only call settings() once…
    //
    // El fallo estaba latente desde siempre y nadie lo vio porque el proyecto no tenía
    // ninguna ruta de API. La primera que existió lo destapó: el webhook devolvía 200 a Meta
    // y moría por dentro sin escribir nada.
    //
    // La bandera va en `globalThis` a propósito: es lo único que sí es único por proceso.
    // ─────────────────────────────────────────────────────────────────────────
    const g = globalThis as typeof globalThis & { __casaMalvaFirestoreConfigurado?: boolean }
    if (!g.__casaMalvaFirestoreConfigurado) {
      firestoreInstance.settings({ ignoreUndefinedProperties: true })
      g.__casaMalvaFirestoreConfigurado = true
    }
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
  lecturas += 1
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
  lecturas += 1
  if (!snap.exists) return null
  await ref.update(partialData as Record<string, unknown>)
  const updatedSnap = await ref.get()
  lecturas += 1
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
  lecturas += snap.size
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

export async function getAppointmentsEnRango(
  desdeUtcISO: string,
  hastaUtcISO: string,
  professionalId?: string
): Promise<Appointment[]> {
  const db = getDb()
  let q: FirebaseFirestore.Query = db.collection('appointments')
  if (professionalId) {
    q = q.where('professionalId', '==', professionalId)
  }
  q = q.where('inicioUtc', '>=', desdeUtcISO).where('inicioUtc', '<', hastaUtcISO)
  const snap = await q.get()
  lecturas += snap.size
  return snap.docs.map((d) => normalizeDocData<Appointment>(d.id, d.data()))
}

export async function getChargesEnRango(
  desdeUtcISO: string,
  hastaUtcISO: string
): Promise<Charge[]> {
  const db = getDb()
  const snap = await db.collection('charges')
    .where('fechaUtc', '>=', desdeUtcISO)
    .where('fechaUtc', '<', hastaUtcISO)
    .get()
  lecturas += snap.size
  return snap.docs.map((d) => normalizeDocData<Charge>(d.id, d.data()))
}

export async function getAppointmentsDeCliente(clientId: string): Promise<Appointment[]> {
  const db = getDb()
  const snap = await db.collection('appointments').where('clientId', '==', clientId).get()
  lecturas += snap.size
  return snap.docs.map((d) => normalizeDocData<Appointment>(d.id, d.data()))
}

export async function getClientByPhone(telefonoE164: string): Promise<Client | null> {
  const db = getDb()
  const snap = await db.collection('clients').where('telefonoE164', '==', telefonoE164).limit(1).get()
  lecturas += snap.size
  if (snap.empty) return null
  return normalizeDocData<Client>(snap.docs[0].id, snap.docs[0].data())
}

export async function getClientsRecientes(limite = 200): Promise<Client[]> {
  const db = getDb()
  const snap = await db.collection('clients').orderBy('creadaEn', 'desc').limit(limite).get()
  lecturas += snap.size
  return snap.docs.map((d) => normalizeDocData<Client>(d.id, d.data()))
}

export async function getBusinessSettings(): Promise<BusinessSettings | null> {
  return await docGet<BusinessSettings>('settings', 'business')
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const db = getDb()
  const snap = await db.collection('users').where('email', '==', email).limit(1).get()
  lecturas += snap.size
  if (snap.empty) return null
  const d = snap.docs[0]
  return normalizeDocData<UserRow>(d.id, d.data())
}

/**
 * Aplica el plan y persiste la cita en UNA sola transacción de Firestore.
 * Lecturas primero, escrituras después (lo exige el motor).
 */
export async function aplicarCambioDeCita(
  cita: Appointment,
  plan: PlanDeSlots,
  cobro?: Charge
): Promise<{ ok: true; data: Appointment } | { ok: false; error: 'cupo_ocupado' | 'ya_cobrada' }> {
  const db = getDb()
  const citaRef = db.doc(`appointments/${cita.id}`)
  const slotRefsCrear = plan.crear.map((id) => db.doc(`slots/${id}`))
  const slotRefsBorrar = plan.borrar.map((id) => db.doc(`slots/${id}`))
  const chargeRef = cobro ? db.doc(`charges/${cobro.id}`) : null

  try {
    await db.runTransaction(async (tx) => {
      // 1. LECTURAS PRIMERO
      const snapsCrear = await Promise.all(slotRefsCrear.map((ref) => tx.get(ref)))
      let chargeSnap = null
      if (chargeRef) {
        chargeSnap = await tx.get(chargeRef)
      }

      lecturas += snapsCrear.length + (chargeRef ? 1 : 0)

      for (const snap of snapsCrear) {
        if (snap.exists) {
          const data = snap.data() as Slot
          if (data.appointmentId !== cita.id) {
            throw new Error('cupo_ocupado')
          }
        }
      }

      if (chargeSnap && chargeSnap.exists) {
        throw new Error('ya_cobrada')
      }

      // 2. ESCRITURAS DESPUÉS
      for (const ref of slotRefsBorrar) {
        tx.delete(ref)
      }

      for (let i = 0; i < snapsCrear.length; i++) {
        const snap = snapsCrear[i]
        if (!snap.exists) {
          const slotId = plan.crear[i]
          // slotId is professionalId_inicioUtcISO
          const inicioUtc = slotId.substring(cita.professionalId.length + 1)
          const slotData: Slot = {
            id: slotId,
            appointmentId: cita.id,
            professionalId: cita.professionalId,
            inicioUtc,
            creadoEn: new Date().toISOString(),
          }
          tx.create(slotRefsCrear[i], slotData)
        }
      }

      tx.set(citaRef, cita, { merge: true })
      if (chargeRef && cobro) {
        tx.set(chargeRef, cobro)
      }
    })

    return { ok: true, data: cita }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('cupo_ocupado') || msg.includes('ALREADY_EXISTS') || msg.includes('already exists')) {
      return { ok: false, error: 'cupo_ocupado' }
    }
    if (msg.includes('ya_cobrada')) {
      return { ok: false, error: 'ya_cobrada' }
    }
    throw err
  }
}
