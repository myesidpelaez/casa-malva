import * as fs from 'fs'
import * as path from 'path'
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from 'firebase-admin/auth'

let adminApp: App | null = null
let adminDb: Firestore | null = null
let adminAuth: Auth | null = null
let initError: Error | null = null
let initPromise: Promise<void> | null = null

async function initializeAdminApp(): Promise<void> {
  if (adminApp) return
  if (initError) throw initError

  try {
    const existingApps = getApps()
    if (existingApps.length > 0) {
      adminApp = existingApps[0]
      return
    }

    // Candidate 1: GOOGLE_APPLICATION_CREDENTIALS env var
    const envSaPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if (envSaPath && fs.existsSync(envSaPath)) {
      const sa = JSON.parse(fs.readFileSync(envSaPath, 'utf-8'))
      adminApp = initializeApp({ credential: cert(sa) })
      return
    }

    // Candidate 2: Standard expected location
    const standardSaPath = `C:\\hermes-data\\secrets\\casa-malva-demo-sa.json`
    if (fs.existsSync(standardSaPath)) {
      const sa = JSON.parse(fs.readFileSync(standardSaPath, 'utf-8'))
      adminApp = initializeApp({ credential: cert(sa) })
      return
    }

    // Candidate 3: Root service-account.json
    const rootSaPath = path.join(process.cwd(), 'service-account.json')
    if (fs.existsSync(rootSaPath)) {
      const sa = JSON.parse(fs.readFileSync(rootSaPath, 'utf-8'))
      adminApp = initializeApp({ credential: cert(sa) })
      return
    }

    // Candidate 4: Private key from env vars
    const envKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.SERVICE_ACCOUNT_PRIVATE_KEY
    if (envKey) {
      const formattedKey = envKey.includes('\\n') ? envKey.replace(/\\n/g, '\n') : envKey
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'casa-malva-demo',
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || '',
          privateKey: formattedKey,
        }),
      })
      return
    }

    throw new Error(
      'Service account no encontrado. Configure GOOGLE_APPLICATION_CREDENTIALS, ' +
      'C:\\hermes-data\\secrets\\casa-malva-demo-sa.json o FIREBASE_ADMIN_PRIVATE_KEY.'
    )
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error))
    console.error('[Firebase Admin] Initialization failed:', initError.message)
    throw initError
  }
}

export function getAdminDb(): Firestore {
  if (initError) throw initError
  if (!adminDb) {
    const app = adminApp || getApps()[0]
    if (!app) throw new Error('Firebase Admin no inicializado. Llama a ensureAdminAppReady() primero.')
    adminDb = getFirestore(app)
    adminDb.settings({ ignoreUndefinedProperties: true })
  }
  return adminDb
}

export function getAdminAuth(): Auth {
  if (initError) throw initError
  if (!adminAuth) {
    const app = adminApp || getApps()[0]
    if (!app) throw new Error('Firebase Admin no inicializado. Llama a ensureAdminAppReady() primero.')
    adminAuth = getAuth(app)
  }
  return adminAuth
}

export async function ensureAdminAppReady(): Promise<void> {
  if (adminApp) return
  if (initError) throw initError
  if (!initPromise) {
    initPromise = initializeAdminApp()
  }
  await initPromise
  if (initError) throw initError
}
