import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'casa-malva-demo'
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAIWpPLXdB_cHtRSHUc3_ujmC_LX4_ffnc'
const REST_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

let adminDbRef: unknown = null

async function initBackend(): Promise<boolean> {
  if (adminDbRef) return true
  try {
    const adminMod = await import('./firebase/admin')
    await adminMod.ensureAdminAppReady()
    adminDbRef = adminMod.getAdminDb()
    return true
  } catch {
    return false
  }
}

// REST helper to obtain valid OAuth access token if available
let cachedAccessToken: string | null = null
let tokenExpiresAt = 0

async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken
  }

  if (process.env.FIREBASE_ACCESS_TOKEN) {
    cachedAccessToken = process.env.FIREBASE_ACCESS_TOKEN
    tokenExpiresAt = Date.now() + 3600000
    return cachedAccessToken
  }

  try {
    const userProfile = process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\Mario Peláez'
    const configPath = path.join(userProfile, '.config', 'configstore', 'firebase-tools.json')
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      const tokens = cfg.tokens || {}

      if (tokens.access_token && tokens.expires_at && Date.now() < tokens.expires_at - 60000) {
        cachedAccessToken = tokens.access_token
        tokenExpiresAt = tokens.expires_at
        return cachedAccessToken
      }

      if (tokens.refresh_token) {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: '563584335869-f54utbrjuhv4orsqvfkep0ueg58xcst3.apps.googleusercontent.com',
            grant_type: 'refresh_token',
            refresh_token: tokens.refresh_token,
          }),
        })
        if (res.ok) {
          const data = (await res.json()) as { access_token: string; expires_in?: number }
          cachedAccessToken = data.access_token
          tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000
          return cachedAccessToken
        }
      }

      if (tokens.access_token) {
        cachedAccessToken = tokens.access_token
        tokenExpiresAt = Date.now() + 3600000
        return cachedAccessToken
      }
    }
  } catch {
    // Ignore
  }

  return null
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = await getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

type FirestoreRestValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreRestValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreRestValue> } }

export function jsToRestValue(val: unknown): FirestoreRestValue {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val }
  }
  if (typeof val === 'string') return { stringValue: val }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(jsToRestValue) } }
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreRestValue> = {}
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = jsToRestValue(v)
      }
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(val) }
}

export function restValueToJs(val: FirestoreRestValue | undefined): unknown {
  if (!val) return null
  if ('nullValue' in val) return null
  if ('booleanValue' in val) return val.booleanValue
  if ('integerValue' in val) return parseInt(val.integerValue, 10)
  if ('doubleValue' in val) return val.doubleValue
  if ('stringValue' in val) return val.stringValue
  if ('timestampValue' in val) return val.timestampValue
  if ('arrayValue' in val) {
    const arr = val.arrayValue.values || []
    return arr.map(restValueToJs)
  }
  if ('mapValue' in val) {
    const fields = val.mapValue.fields || {}
    const obj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = restValueToJs(v)
    }
    return obj
  }
  return null
}

export function jsToRestFields(obj: Record<string, unknown>): Record<string, FirestoreRestValue> {
  const fields: Record<string, FirestoreRestValue> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = jsToRestValue(v)
    }
  }
  return fields
}

export function restFieldsToJs(fields: Record<string, FirestoreRestValue>): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  if (!fields) return obj
  for (const [k, v] of Object.entries(fields)) {
    obj[k] = restValueToJs(v)
  }
  return obj
}

export async function dbDocGet<T = Record<string, unknown>>(collectionName: string, docId: string): Promise<T | null> {
  const hasAdmin = await initBackend()
  if (hasAdmin && adminDbRef) {
    const db = adminDbRef as { collection: (c: string) => { doc: (i: string) => { get: () => Promise<{ exists: boolean; id: string; data: () => Record<string, unknown> }> } } }
    const snap = await db.collection(collectionName).doc(docId).get()
    if (!snap.exists) return null
    return { id: snap.id, ...snap.data() } as T
  }

  const headers = await getAuthHeaders()
  const url = `${REST_BASE}/${collectionName}/${docId}?key=${API_KEY}`
  const res = await fetch(url, { headers })
  if (res.status === 404) return null
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Firestore REST error ${res.status}: ${errText}`)
  }
  const data = (await res.json()) as { fields: Record<string, FirestoreRestValue> }
  const jsData = restFieldsToJs(data.fields)
  return { id: docId, ...jsData } as T
}

export async function dbDocSet<T extends Record<string, unknown>>(
  collectionName: string,
  docId: string,
  data: T,
  merge = true
): Promise<T> {
  const hasAdmin = await initBackend()
  if (hasAdmin && adminDbRef) {
    const db = adminDbRef as { collection: (c: string) => { doc: (i: string) => { set: (d: unknown, o: { merge: boolean }) => Promise<void> } } }
    await db.collection(collectionName).doc(docId).set(data, { merge })
    return { id: docId, ...data }
  }

  const headers = await getAuthHeaders()
  const fields = jsToRestFields(data)

  if (merge) {
    const updateMask = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&')
    const url = `${REST_BASE}/${collectionName}/${docId}?key=${API_KEY}&${updateMask}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Firestore REST error ${res.status}: ${errText}`)
    }
  } else {
    const url = `${REST_BASE}/${collectionName}/${docId}?key=${API_KEY}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Firestore REST error ${res.status}: ${errText}`)
    }
  }

  return { id: docId, ...data }
}

export async function dbDocDelete(collectionName: string, docId: string): Promise<boolean> {
  const hasAdmin = await initBackend()
  if (hasAdmin && adminDbRef) {
    const db = adminDbRef as { collection: (c: string) => { doc: (i: string) => { delete: () => Promise<void> } } }
    await db.collection(collectionName).doc(docId).delete()
    return true
  }

  const headers = await getAuthHeaders()
  const url = `${REST_BASE}/${collectionName}/${docId}?key=${API_KEY}`
  const res = await fetch(url, { method: 'DELETE', headers })
  return res.ok
}

export async function dbCollectionGet<T = Record<string, unknown>>(collectionName: string): Promise<T[]> {
  const hasAdmin = await initBackend()
  if (hasAdmin && adminDbRef) {
    const db = adminDbRef as { collection: (c: string) => { get: () => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }> } }
    const snap = await db.collection(collectionName).get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[]
  }

  const headers = await getAuthHeaders()
  const url = `${REST_BASE}/${collectionName}?key=${API_KEY}&pageSize=300`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Firestore REST error ${res.status}: ${errText}`)
  }
  const data = (await res.json()) as { documents?: Array<{ name: string; fields: Record<string, FirestoreRestValue> }> }
  const docs = data.documents || []
  return docs.map((doc) => {
    const parts = doc.name.split('/')
    const id = parts[parts.length - 1]
    return { id, ...restFieldsToJs(doc.fields) }
  }) as T[]
}

export async function dbRunTransaction<T>(
  updateFunction: (transactionContext: {
    getDoc: <D>(coll: string, id: string) => Promise<D | null>
    getCollection: <D>(coll: string) => Promise<D[]>
    setDoc: (coll: string, id: string, data: Record<string, unknown>) => void
  }) => Promise<T>
): Promise<T> {
  const hasAdmin = await initBackend()

  if (hasAdmin && adminDbRef) {
    const db = adminDbRef as {
      runTransaction: (fn: (t: {
        get: (ref: unknown) => Promise<{ exists: boolean; id: string; data: () => Record<string, unknown>; docs: Array<{ id: string; data: () => Record<string, unknown> }> }>
        set: (ref: unknown, d: unknown, o: { merge: boolean }) => void
      }) => Promise<T>) => Promise<T>
      collection: (c: string) => { doc: (i: string) => unknown }
    }
    return await db.runTransaction(async (t) => {
      const pendingWrites: Array<() => void> = []
      const ctx = {
        getDoc: async <D>(coll: string, id: string): Promise<D | null> => {
          const ref = db.collection(coll).doc(id)
          const snap = await t.get(ref)
          if (!snap.exists) return null
          return { id: snap.id, ...snap.data() } as D
        },
        getCollection: async <D>(coll: string): Promise<D[]> => {
          const snap = await t.get(db.collection(coll))
          return (snap.docs || []).map((d) => ({ id: d.id, ...d.data() })) as D[]
        },
        setDoc: (coll: string, id: string, data: Record<string, unknown>) => {
          const ref = db.collection(coll).doc(id)
          pendingWrites.push(() => t.set(ref, data, { merge: true }))
        },
      }
      const result = await updateFunction(ctx)
      for (const w of pendingWrites) w()
      return result
    })
  }

  const headers = await getAuthHeaders()
  const txUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:beginTransaction?key=${API_KEY}`
  const txRes = await fetch(txUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  })
  if (!txRes.ok) {
    const errText = await txRes.text()
    throw new Error(`Failed to begin REST transaction: ${errText}`)
  }
  const txData = (await txRes.json()) as { transaction: string }
  const transactionId = txData.transaction

  const writesToCommit: Array<{ update: { name: string; fields: Record<string, FirestoreRestValue> } }> = []

  const ctx = {
    getDoc: async <D>(coll: string, id: string): Promise<D | null> => {
      const url = `${REST_BASE}/${coll}/${id}?transaction=${transactionId}&key=${API_KEY}`
      const res = await fetch(url, { headers })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`REST transaction getDoc error: ${res.status}`)
      const d = (await res.json()) as { fields: Record<string, FirestoreRestValue> }
      return { id, ...restFieldsToJs(d.fields) } as D
    },
    getCollection: async <D>(coll: string): Promise<D[]> => {
      const url = `${REST_BASE}/${coll}?key=${API_KEY}&pageSize=300`
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error(`REST transaction getCollection error: ${res.status}`)
      const d = (await res.json()) as { documents?: Array<{ name: string; fields: Record<string, FirestoreRestValue> }> }
      const docs = d.documents || []
      return docs.map((doc) => {
        const parts = doc.name.split('/')
        const docId = parts[parts.length - 1]
        return { id: docId, ...restFieldsToJs(doc.fields) }
      }) as D[]
    },
    setDoc: (coll: string, id: string, data: Record<string, unknown>) => {
      writesToCommit.push({
        update: {
          name: `projects/${PROJECT_ID}/databases/(default)/documents/${coll}/${id}`,
          fields: jsToRestFields(data),
        },
      })
    },
  }

  const result = await updateFunction(ctx)

  if (writesToCommit.length > 0) {
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit?key=${API_KEY}`
    const commitRes = await fetch(commitUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        transaction: transactionId,
        writes: writesToCommit,
      }),
    })
    if (!commitRes.ok) {
      const errText = await commitRes.text()
      if (commitRes.status === 409 || errText.includes('ABORTED') || errText.includes('FAILED_PRECONDITION')) {
        throw new Error('cupo_ocupado')
      }
      throw new Error(`REST transaction commit error ${commitRes.status}: ${errText}`)
    }
  }

  return result
}
